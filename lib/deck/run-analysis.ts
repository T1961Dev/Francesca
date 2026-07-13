import "server-only"

import { buildDeckAnalysisInsert, buildDeckAnalysisRecord } from "@/lib/deck/persist"
import { enqueueInvestorMatching, hasActiveInvestorJobForDeck } from "@/lib/investors/enqueue"
import { analyseDeckText } from "@/lib/openai/deck-analysis"
import { captureServerEvent } from "@/lib/posthog/server"
import { sendScoreReadyEmail } from "@/lib/resend/emails"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"
import { attemptUsageIncrement, rollbackUsageIncrement } from "@/lib/usage/track"
import { logOpenAiCost } from "@/lib/costs/track"
import type { Plan } from "@/types/app"

export async function runDeckAnalysisPipeline({
  userId,
  userEmail,
  analysisId,
  deckUploadId,
  text,
  plan,
}: {
  userId: string
  userEmail: string | null
  analysisId: string
  deckUploadId: string
  text: string
  plan: Plan
}) {
  const admin = createAdminClient()

  try {
    await admin
      .from("deck_uploads")
      .update({ status: "analysing" })
      .eq("id", deckUploadId)
      .eq("user_id", userId)

    const analysis = await analyseDeckText(text)

    const insertRow = buildDeckAnalysisInsert({
      id: analysisId,
      userId,
      deckUploadId,
      analysis,
    })

    const { error: analysisError } = await admin
      .from("deck_analyses")
      .update(insertRow)
      .eq("id", analysisId)
      .eq("user_id", userId)

    if (analysisError) throw analysisError

    const analysisRow = buildDeckAnalysisRecord({
      id: analysisId,
      userId,
      deckUploadId,
      analysis,
    })

    await logOpenAiCost({
      userId,
      runId: analysisId,
      runType: "deck_analysis",
      model:
        (analysis.raw as { model?: string } | undefined)?.model ??
        process.env.OPENAI_DECK_MODEL ??
        "gpt-4o-mini",
      usage: (analysis.raw as { usage?: Record<string, number> } | undefined)?.usage,
    })

    await admin
      .from("deck_uploads")
      .update({ status: "completed" })
      .eq("id", deckUploadId)
      .eq("user_id", userId)

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    const planForMatching = (profile?.plan as Plan | undefined) ?? plan
    const { canUseInvestorMatching } = await import("@/lib/access")

    if (canUseInvestorMatching(planForMatching)) {
      if (!(await hasActiveInvestorJobForDeck(admin, analysisId))) {
        const matchGate = await attemptUsageIncrement({
          userId,
          plan: planForMatching,
          action: "investor_match_run",
        })

        if (matchGate.ok) {
          try {
            await enqueueInvestorMatching({
              supabase: admin,
              userId,
              deckAnalysisId: analysisId,
              profile: profile ?? {},
              deckAnalysis: analysisRow,
            })
          } catch (error) {
            await rollbackUsageIncrement({
              userId,
              action: "investor_match_run",
            })
            captureError(error, { route: "deck-upload-investor-matching" })
          }
        }
      }
    }

    await captureServerEvent("deck_analysis_completed", userId, { analysisId })

    if (userEmail) {
      await sendScoreReadyEmail({
        userId,
        to: userEmail,
        score: analysis.parsed.overallScore,
        analysisId,
      }).catch((error) => captureError(error, { route: "deck-upload-score-email" }))
    }
  } catch (error) {
    try {
      await admin
        .from("deck_analyses")
        .update({ status: "failed" })
        .eq("id", analysisId)
        .eq("user_id", userId)

      await admin
        .from("deck_uploads")
        .update({
          status: "failed",
          text_extraction_error:
            error instanceof Error ? error.message : "Deck analysis failed",
        })
        .eq("id", deckUploadId)
        .eq("user_id", userId)
    } catch {
      // Preserve the original analysis error for logging.
    }

    await rollbackUsageIncrement({ userId, action: "deck_upload" })
    captureError(error, { route: "deck-analysis-pipeline" })
    throw error
  }
}
