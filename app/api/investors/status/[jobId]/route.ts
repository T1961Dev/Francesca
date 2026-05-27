import { NextResponse } from "next/server"

import { assertInvestorJobOwner } from "@/lib/investors/job-access"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    }

    await assertInvestorJobOwner(supabase, jobId, user.id)

    const { data: job } = await supabase
      .from("investor_matching_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
    }

    const { count } = await supabase
      .from("investor_matches")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId)

    return NextResponse.json({ success: true, data: { job, matchRows: count ?? 0 } })
  } catch (error) {
    captureError(error, { route: "investors-status" })
    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 400
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not load job status",
      },
      { status }
    )
  }
}
