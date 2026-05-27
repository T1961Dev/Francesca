import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin/auth"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const supabase = createAdminClient()

    const [profile, usage, decks, analyses, financials, jobs, matches, costs, billing] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_usage").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("deck_uploads").select("*").eq("user_id", id),
      supabase.from("deck_analyses").select("*").eq("user_id", id),
      supabase.from("financial_models").select("*").eq("user_id", id),
      supabase.from("investor_matching_jobs").select("*").eq("user_id", id),
      supabase.from("investor_matches").select("*").eq("user_id", id),
      supabase.from("api_costs").select("*").eq("user_id", id),
      supabase.from("billing_events").select("*").eq("user_id", id),
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      user_id: id,
      profile: profile.data,
      user_usage: usage.data,
      deck_uploads: decks.data,
      deck_analyses: analyses.data,
      financial_models: financials.data,
      investor_matching_jobs: jobs.data,
      investor_matches: matches.data,
      api_costs: costs.data,
      billing_events: billing.data,
    }

    const json = JSON.stringify(payload, null, 2)
    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="raisewise-data-${id}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    captureError(error, { route: "admin-user-export" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    )
  }
}
