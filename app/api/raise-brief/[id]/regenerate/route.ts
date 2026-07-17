import { NextResponse } from "next/server"
import { z } from "zod"

import { canGenerateRaiseBrief, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { runRaiseBriefProduction } from "@/lib/raise-brief/production"
import {
  hasUnresolvedCriticalFacts,
  RaiseBriefStrategySchema,
} from "@/lib/raise-brief/schemas"
import { runRaiseBriefStrategy } from "@/lib/raise-brief/strategy"
import { buildRaiseBriefWorkspacePack } from "@/lib/raise-brief/workspace-pack"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  stage: z.enum(["strategy", "production"]).default("production"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()
    if (!canGenerateRaiseBrief(plan)) {
      return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 })
    }

    const { id } = await params
    const body = schema.parse(await request.json().catch(() => ({})))
    const supabase = await createClient()

    const { data: row, error } = await supabase
      .from("raise_briefs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) throw error
    if (!row) {
      return NextResponse.json({ success: false, error: "Raise Brief not found" }, { status: 404 })
    }

    const pack = await buildRaiseBriefWorkspacePack({
      userId: user.id,
      deckAnalysisId: row.deck_analysis_id ? String(row.deck_analysis_id) : null,
      financialModelId: row.financial_model_id ? String(row.financial_model_id) : null,
      investorMatchJobId: row.investor_match_job_id
        ? String(row.investor_match_job_id)
        : null,
      investorKey: row.investor_key ? String(row.investor_key) : null,
      founderNotes: row.founder_notes ? String(row.founder_notes) : null,
    })

    if (body.stage === "strategy") {
      await supabase
        .from("raise_briefs")
        .update({ status: "strategy_pending", error: null })
        .eq("id", id)

      const result = await runRaiseBriefStrategy(pack)
      await supabase
        .from("raise_briefs")
        .update({
          status: "strategy_ready",
          strategy: result.parsed,
          production: null,
          overall_quality: null,
          workspace_snapshot: pack as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      return NextResponse.json({
        success: true,
        data: { id, status: "strategy_ready", strategy: result.parsed },
      })
    }

    const strategy = RaiseBriefStrategySchema.parse(row.strategy)
    if (hasUnresolvedCriticalFacts(strategy)) {
      return NextResponse.json(
        {
          success: false,
          error: "Confirm critical facts before regenerating production.",
        },
        { status: 400 }
      )
    }

    await supabase
      .from("raise_briefs")
      .update({ status: "producing", error: null })
      .eq("id", id)

    const result = await runRaiseBriefProduction({ pack, strategy })
    await supabase
      .from("raise_briefs")
      .update({
        status: "ready",
        strategy: result.strategyUsed,
        production: result.parsed,
        overall_quality: result.parsed.quality_scores,
        workspace_snapshot: pack as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    return NextResponse.json({
      success: true,
      data: { id, status: "ready", production: result.parsed },
    })
  } catch (error) {
    captureError(error, { route: "raise-brief-regenerate" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Regeneration failed",
      },
      { status: 400 }
    )
  }
}
