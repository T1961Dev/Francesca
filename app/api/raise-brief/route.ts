import { NextResponse } from "next/server"

import { canGenerateRaiseBrief, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()

    if (!canGenerateRaiseBrief(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to use Raise Brief." },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("raise_briefs")
      .select(
        "id, status, deck_analysis_id, financial_model_id, investor_match_job_id, investor_key, strategy, production, overall_quality, created_at, updated_at, error"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    captureError(error, { route: "raise-brief-list" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list Raise Briefs",
      },
      { status: 400 }
    )
  }
}
