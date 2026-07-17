import { NextResponse } from "next/server"

import { canGenerateRaiseBrief, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { runRaiseBriefProduction } from "@/lib/raise-brief/production"
import {
  hasUnresolvedCriticalFacts,
  RaiseBriefStrategySchema,
} from "@/lib/raise-brief/schemas"
import { buildRaiseBriefWorkspacePack } from "@/lib/raise-brief/workspace-pack"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()
    if (!canGenerateRaiseBrief(plan)) {
      return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 })
    }

    const { id } = await params
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

    const strategy = RaiseBriefStrategySchema.parse(row.strategy)
    if (hasUnresolvedCriticalFacts(strategy)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Confirm or resolve all critical facts before generating the Raise Brief.",
        },
        { status: 400 }
      )
    }

    await supabase
      .from("raise_briefs")
      .update({ status: "producing", error: null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)

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

    try {
      const result = await runRaiseBriefProduction({ pack, strategy })
      const { error: updateError } = await supabase
        .from("raise_briefs")
        .update({
          status: "ready",
          strategy: result.strategyUsed,
          production: result.parsed,
          overall_quality: result.parsed.quality_scores,
          workspace_snapshot: pack as unknown as Record<string, unknown>,
          error: result.passedQualityGates
            ? null
            : "Generated with quality scores below ideal thresholds. Review carefully.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        data: {
          id,
          status: "ready",
          production: result.parsed,
          passedQualityGates: result.passedQualityGates,
        },
      })
    } catch (error) {
      await supabase
        .from("raise_briefs")
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "Production failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
      throw error
    }
  } catch (error) {
    captureError(error, { route: "raise-brief-produce" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Production failed",
      },
      { status: 400 }
    )
  }
}
