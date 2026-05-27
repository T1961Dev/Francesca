import { NextResponse } from "next/server"

import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params
    const supabase = await createClient()
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
    return NextResponse.json({ success: false, error: "Could not load job status" }, { status: 400 })
  }
}
