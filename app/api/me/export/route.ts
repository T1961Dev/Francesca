import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = createAdminClient()

    const [profile, usage, decks, analyses, financials, jobs, matches] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_usage").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("deck_uploads").select("*").eq("user_id", user.id),
      supabase.from("deck_analyses").select("*").eq("user_id", user.id),
      supabase.from("financial_models").select("*").eq("user_id", user.id),
      supabase.from("investor_matching_jobs").select("*").eq("user_id", user.id),
      supabase.from("investor_matches").select("*").eq("user_id", user.id),
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile: profile.data,
      user_usage: usage.data,
      deck_uploads: decks.data,
      deck_analyses: analyses.data,
      financial_models: financials.data,
      investor_matching_jobs: jobs.data,
      investor_matches: matches.data,
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="raisewise-data-${user.id}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    captureError(error, { route: "me-export" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    )
  }
}
