import { NextResponse } from "next/server"

import { dispatchInvestorMatchingRun } from "@/lib/investors/dispatch"
import { assertInvestorJobOwner } from "@/lib/investors/job-access"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
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

    const { data: job, error: jobError } = await supabase
      .from("investor_matching_jobs")
      .select("id, status")
      .eq("id", jobId)
      .maybeSingle()

    if (jobError) throw jobError
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("investor_matching_jobs")
      .update({ status: "pending", pipeline_stage: "retry_queued", error: null })
      .eq("id", jobId)

    if (error) throw error

    dispatchInvestorMatchingRun(jobId)

    return NextResponse.json({ success: true, data: { jobId } })
  } catch (error) {
    captureError(error, { route: "investors-retry" })
    return NextResponse.json({ success: false, error: "Could not retry job" }, { status: 400 })
  }
}
