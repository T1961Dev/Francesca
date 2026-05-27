import { NextResponse } from "next/server"

import { cancelInvestorMatchingJob } from "@/lib/investors/pipeline"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params
    const supabase = await createClient()
    const result = await cancelInvestorMatchingJob({ supabase, jobId })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    captureError(error, { route: "investors-cancel" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not cancel job" },
      { status: 400 }
    )
  }
}
