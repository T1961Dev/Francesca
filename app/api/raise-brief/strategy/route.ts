import { NextResponse } from "next/server"
import { z } from "zod"

import { canGenerateRaiseBrief, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { runRaiseBriefStrategy } from "@/lib/raise-brief/strategy"
import { buildRaiseBriefWorkspacePack } from "@/lib/raise-brief/workspace-pack"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  deckAnalysisId: z.string().uuid().optional().nullable(),
  financialModelId: z.string().uuid().optional().nullable(),
  investorMatchJobId: z.string().uuid().optional().nullable(),
  investorKey: z.string().optional().nullable(),
  founderNotes: z.string().max(2000).optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()

    if (!canGenerateRaiseBrief(plan)) {
      return NextResponse.json(
        {
          success: false,
          error: "Upgrade to Pro to generate a Raise Brief.",
        },
        { status: 403 }
      )
    }

    const body = schema.parse(await request.json())
    const pack = await buildRaiseBriefWorkspacePack({
      userId: user.id,
      deckAnalysisId: body.deckAnalysisId,
      financialModelId: body.financialModelId,
      investorMatchJobId: body.investorMatchJobId,
      investorKey: body.investorKey,
      founderNotes: body.founderNotes,
    })

    const supabase = await createClient()
    const { data: draft, error: insertError } = await supabase
      .from("raise_briefs")
      .insert({
        user_id: user.id,
        deck_analysis_id: pack.deck.id,
        financial_model_id: pack.financialModel?.id ?? null,
        investor_match_job_id: body.investorMatchJobId ?? null,
        investor_key: body.investorKey ?? null,
        status: "strategy_pending",
        workspace_snapshot: pack as unknown as Record<string, unknown>,
        founder_notes: body.founderNotes ?? null,
      })
      .select("id")
      .single()

    if (insertError) throw insertError

    try {
      const result = await runRaiseBriefStrategy(pack)
      const { error: updateError } = await supabase
        .from("raise_briefs")
        .update({
          status: "strategy_ready",
          strategy: result.parsed,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.id)
        .eq("user_id", user.id)

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        data: { id: draft.id, status: "strategy_ready", strategy: result.parsed },
      })
    } catch (error) {
      await supabase
        .from("raise_briefs")
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "Strategy generation failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.id)
        .eq("user_id", user.id)
      throw error
    }
  } catch (error) {
    captureError(error, { route: "raise-brief-strategy" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Strategy generation failed",
      },
      { status: 400 }
    )
  }
}
