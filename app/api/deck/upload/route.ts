import { NextResponse, after } from "next/server"

import { extractTextFromPdf, extractTextFromPptx, validateUploadFile } from "@/lib/file-extraction"
import { buildPendingDeckAnalysisInsert } from "@/lib/deck/persist"
import { runDeckAnalysisPipeline } from "@/lib/deck/run-analysis"
import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { attemptUsageIncrement, rollbackUsageIncrement } from "@/lib/usage/track"
import {
  lookupIdempotencyKey,
  storeIdempotentResponse,
} from "@/lib/security/idempotency"
import type { Plan } from "@/types/app"

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let deckUploadId: string | null = null
  let userId: string | null = null
  let analysisId: string | null = null

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
    analysisId = crypto.randomUUID()
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
      .select("id")
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

    const pendingRow = buildPendingDeckAnalysisInsert({
      id: analysisId,
      userId: user.id,
      deckUploadId: uploadRow.id as string,
    })

    const { error: pendingError } = await createAdminClient()
      .from("deck_analyses")
      .insert(pendingRow)

    if (pendingError) throw pendingError

    await captureServerEvent("deck_analysis_started", user.id, { deckUploadId })

    const responseBody = {
      success: true,
      data: {
        analysisId,
        investorMatching: { started: false, reason: "processing" } as const,
      },
    }

    if (idempotencyKey) {
      await storeIdempotentResponse({
        key: `deck-upload:${user.id}:${idempotencyKey}`,
        userId: user.id,
        scope: "deck-upload",
        response: responseBody,
      })
    }

    const resolvedAnalysisId = analysisId
    const resolvedDeckUploadId = uploadRow.id as string

    after(async () => {
      try {
        await runDeckAnalysisPipeline({
          userId: user.id,
          userEmail: user.email ?? null,
          analysisId: resolvedAnalysisId,
          deckUploadId: resolvedDeckUploadId,
          text,
          plan,
        })
      } catch (error) {
        captureError(error, { route: "deck-upload-after" })
      }
    })

    return NextResponse.json(responseBody)
  } catch (error) {
    if (analysisId && userId) {
      try {
        await createAdminClient()
          .from("deck_analyses")
          .update({ status: "failed" })
          .eq("id", analysisId)
          .eq("user_id", userId)
      } catch {
        // Preserve the original upload error for the response.
      }
    }

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
