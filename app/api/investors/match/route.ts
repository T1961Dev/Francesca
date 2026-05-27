import { NextResponse } from "next/server"
import { z } from "zod"

import { canUseInvestorMatching, getUserPlan } from "@/lib/access"
import { fetchDeckAnalysisById } from "@/lib/deck/queries.server"
import { enqueueInvestorMatching, hasActiveInvestorJobForDeck } from "@/lib/investors/enqueue"
import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"
import { attemptUsageIncrement, rollbackUsageIncrement } from "@/lib/usage/track"

const schema = z.object({ deckAnalysisId: z.string().uuid() })

export async function POST(request: Request) {
  let userId: string | null = null
  let incremented = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    }
    userId = user.id

    const plan = await getUserPlan()
    if (!canUseInvestorMatching(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to unlock investor matching." },
        { status: 403 }
      )
    }

    const gate = await attemptUsageIncrement({
      userId: user.id,
      plan,
      action: "investor_match_run",
    })
    if (!gate.ok) {
      return NextResponse.json({ success: false, ...gate.reason }, { status: 402 })
    }
    incremented = true

    const { deckAnalysisId } = schema.parse(await request.json())
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    const deckAnalysis = await fetchDeckAnalysisById(deckAnalysisId)

    if (!deckAnalysis) {
      if (userId && incremented) {
        await rollbackUsageIncrement({ userId, action: "investor_match_run" })
      }
      return NextResponse.json({ success: false, error: "Deck analysis not found" }, { status: 404 })
    }

    if (await hasActiveInvestorJobForDeck(supabase, deckAnalysisId)) {
      if (userId && incremented) {
        await rollbackUsageIncrement({ userId, action: "investor_match_run" })
      }
      return NextResponse.json(
        { success: false, error: "A matching job is already running for this deck." },
        { status: 409 }
      )
    }

    const job = await enqueueInvestorMatching({
      supabase,
      userId: user.id,
      deckAnalysisId,
      profile: profile ?? {},
      deckAnalysis,
    })

    await captureServerEvent("investor_matching_started", user.id, { deckAnalysisId, jobId: job.id })
    return NextResponse.json({
      success: true,
      data: { jobId: job.id, deckAnalysisId, status: job.status },
    })
  } catch (error) {
    if (userId && incremented) {
      await rollbackUsageIncrement({ userId, action: "investor_match_run" })
    }
    captureError(error, { route: "investors-match" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Investor matching failed" }, { status: 400 })
  }
}
