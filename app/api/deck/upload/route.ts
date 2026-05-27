import { NextResponse } from "next/server"

import { extractTextFromPdf, extractTextFromPptx, validateUploadFile } from "@/lib/file-extraction"
import { buildDeckAnalysisInsert, buildDeckAnalysisRecord } from "@/lib/deck/persist"
import { enqueueInvestorMatching, hasActiveInvestorJobForDeck } from "@/lib/investors/enqueue"
import { analyseDeckText } from "@/lib/openai/deck-analysis"
import { captureServerEvent } from "@/lib/posthog/server"
import { scoreReadyEmail } from "@/lib/resend/templates"
import { sendTrackedEmail } from "@/lib/resend/send"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"
import { attemptUsageIncrement, rollbackUsageIncrement } from "@/lib/usage/track"
import { logOpenAiCost } from "@/lib/costs/track"
import {
  lookupIdempotencyKey,
  storeIdempotentResponse,
} from "@/lib/security/idempotency"
import type { Plan } from "@/types/app"

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let deckUploadId: string | null = null
  let userId: string | null = null

  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    }
    userId = user.id

    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? ""
    if (idempotencyKey) {
      const existing = await lookupIdempotencyKey(`deck-upload:${user.id}:${idempotencyKey}`)
      if (existing) {
        return NextResponse.json(existing.response)
      }
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Deck file is required" }, { status: 400 })
    }

    validateUploadFile(file)

    // Resolve plan + atomic usage gate BEFORE we touch storage, OCR, or OpenAI.
    const { data: planRow } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle()
    const plan = (planRow?.plan as Plan | undefined) ?? "free"

    const gate = await attemptUsageIncrement({
      userId: user.id,
      plan,
      action: "deck_upload",
    })
    if (!gate.ok) {
      return NextResponse.json(
        { success: false, ...gate.reason },
        { status: 402 }
      )
    }

    deckUploadId = crypto.randomUUID()
    const filePath = `${user.id}/${deckUploadId}/${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("deck-uploads")
      .upload(filePath, buffer, { contentType: file.type })

    if (uploadError) throw uploadError

    const { data: uploadRow, error: uploadInsertError } = await supabase
      .from("deck_uploads")
      .insert({
        id: deckUploadId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_path: filePath,
        file_size: file.size,
        status: "extracting",
      })
      .select("*")
      .single()

    if (uploadInsertError) throw uploadInsertError

    const text = file.type === "application/pdf"
      ? await extractTextFromPdf(buffer)
      : await extractTextFromPptx(buffer)

    const { error: dbError } = await supabase
      .from("deck_uploads")
      .update({
        status: "extracted",
        extracted_text: text,
      })
      .eq("id", uploadRow.id)
      .eq("user_id", user.id)

    if (dbError) throw dbError

    await supabase
      .from("deck_uploads")
      .update({ status: "analysing" })
      .eq("id", uploadRow.id)
      .eq("user_id", user.id)

    await captureServerEvent("deck_analysis_started", user.id, { deckUploadId })
    const analysis = await analyseDeckText(text)

    const analysisId = crypto.randomUUID()
    const insertRow = buildDeckAnalysisInsert({
      id: analysisId,
      userId: user.id,
      deckUploadId: uploadRow.id as string,
      analysis,
    })

    const { error: analysisError } = await supabase
      .from("deck_analyses")
      .insert(insertRow)

    if (analysisError) throw analysisError

    const analysisRow = buildDeckAnalysisRecord({
      id: analysisId,
      userId: user.id,
      deckUploadId: uploadRow.id as string,
      analysis,
    })

    await logOpenAiCost({
      userId: user.id,
      runId: analysisId,
      runType: "deck_analysis",
      model:
        (analysis.raw as { model?: string } | undefined)?.model ??
        process.env.OPENAI_DECK_MODEL ??
        "gpt-4o-mini",
      usage: (analysis.raw as { usage?: Record<string, number> } | undefined)?.usage,
    })

    await supabase
      .from("deck_uploads")
      .update({ status: "completed" })
      .eq("id", uploadRow.id)
      .eq("user_id", user.id)

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    // Auto-trigger investor matching only if the user can use it AND has quota.
    // Silent skip otherwise — the spec explicitly asks for no UI noise here.
    const planForMatching = (profile?.plan as Plan | undefined) ?? plan
    const { canUseInvestorMatching } = await import("@/lib/access")

    let investorMatching:
      | { started: true; jobId: string }
      | { started: false; reason: string } = {
        started: false,
        reason: "not_eligible",
      }

    if (!canUseInvestorMatching(planForMatching)) {
      investorMatching = {
        started: false,
        reason: "Investor matching requires a Pro or Lifetime plan.",
      }
    } else if (await hasActiveInvestorJobForDeck(supabase, analysisId)) {
      investorMatching = {
        started: false,
        reason: "A matching job is already running for this deck.",
      }
    } else {
      const matchGate = await attemptUsageIncrement({
        userId: user.id,
        plan: planForMatching,
        action: "investor_match_run",
      })

      if (!matchGate.ok) {
        investorMatching = {
          started: false,
          reason: `Monthly investor match limit reached (${matchGate.reason.max}).`,
        }
      } else {
        try {
          const job = await enqueueInvestorMatching({
            supabase,
            userId: user.id,
            deckAnalysisId: analysisId,
            profile: profile ?? {},
            deckAnalysis: analysisRow,
          })
          investorMatching = { started: true, jobId: String(job.id) }
        } catch (error) {
          await rollbackUsageIncrement({
            userId: user.id,
            action: "investor_match_run",
          })
          captureError(error, { route: "deck-upload-investor-matching" })
          investorMatching = {
            started: false,
            reason:
              error instanceof Error ? error.message : "Could not start investor matching",
          }
        }
      }
    }

    await captureServerEvent("deck_analysis_completed", user.id, { analysisId })

    if (user.email) {
      const template = scoreReadyEmail(analysis.parsed.overallScore)
      await sendTrackedEmail({
        userId: user.id,
        to: user.email,
        type: "score_ready",
        subject: template.subject,
        html: template.html,
        metadata: { analysisId },
      }).catch((error) => captureError(error, { route: "deck-upload-score-email" }))
    }

    const responseBody = {
      success: true,
      data: { analysisId, investorMatching },
    }
    if (idempotencyKey) {
      await storeIdempotentResponse({
        key: `deck-upload:${user.id}:${idempotencyKey}`,
        userId: user.id,
        scope: "deck-upload",
        response: responseBody,
      })
    }
    return NextResponse.json(responseBody)
  } catch (error) {
    if (supabase && deckUploadId && userId) {
      try {
        await supabase
          .from("deck_uploads")
          .update({
            status: "failed",
            text_extraction_error:
              error instanceof Error ? error.message : "Deck upload failed",
          })
          .eq("id", deckUploadId)
          .eq("user_id", userId)
          .throwOnError()
      } catch {
        // Preserve the original upload/analyse error for the response.
      }
    }

    // Refund the usage slot — the user shouldn't pay quota for a failed pipeline.
    if (userId) {
      await rollbackUsageIncrement({ userId, action: "deck_upload" })
    }

    captureError(error, { route: "deck-upload" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Deck upload failed" },
      { status: 400 }
    )
  }
}
