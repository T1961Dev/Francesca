import { NextResponse } from "next/server"

import { runInvestorMatchingJob } from "@/lib/investors/run-job"
import { captureError } from "@/lib/sentry/capture"

export const maxDuration = 300

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  return header === `Bearer ${secret}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ success: false, error: "Unauthorised" }, { status: 401 })
  }

  const { jobId } = await params

  try {
    await runInvestorMatchingJob(jobId)
    return NextResponse.json({ success: true, data: { jobId } })
  } catch (error) {
    captureError(error, { route: "cron-investors-run", jobId })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Investor matching run failed",
      },
      { status: 500 }
    )
  }
}
