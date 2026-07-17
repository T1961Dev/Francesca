import { NextResponse } from "next/server"
import { z } from "zod"

import { canGenerateRaiseBrief, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import {
  FactConfirmationSchema,
  RaiseBriefStrategySchema,
} from "@/lib/raise-brief/schemas"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  primary_investment_angle: z.string().min(1).optional(),
  why_this_angle_wins: z.string().min(1).optional(),
  recommended_outreach_angle: z.string().min(1).optional(),
  facts_requiring_founder_confirmation: z.array(FactConfirmationSchema).optional(),
  disclosure_strategy: z
    .object({
      reveal: z.array(z.object({ item: z.string(), reason: z.string().optional() })),
      reveal_partially: z.array(
        z.object({ item: z.string(), reason: z.string().optional() })
      ),
      preserve_for_meeting: z.array(
        z.object({ item: z.string(), reason: z.string().optional() })
      ),
    })
    .optional(),
})

export async function PATCH(
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
    const body = schema.parse(await request.json())
    const supabase = await createClient()

    const { data: row, error } = await supabase
      .from("raise_briefs")
      .select("id, strategy, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) throw error
    if (!row?.strategy) {
      return NextResponse.json({ success: false, error: "Raise Brief not found" }, { status: 404 })
    }

    const current = RaiseBriefStrategySchema.parse(row.strategy)
    const next = RaiseBriefStrategySchema.parse({
      ...current,
      ...body,
      facts_requiring_founder_confirmation:
        body.facts_requiring_founder_confirmation ??
        current.facts_requiring_founder_confirmation,
      disclosure_strategy: body.disclosure_strategy ?? current.disclosure_strategy,
    })

    const { error: updateError } = await supabase
      .from("raise_briefs")
      .update({
        strategy: next,
        status: row.status === "failed" ? "strategy_ready" : row.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, data: { id, strategy: next } })
  } catch (error) {
    captureError(error, { route: "raise-brief-strategy-patch" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update strategy",
      },
      { status: 400 }
    )
  }
}
