import "server-only"

import { captureError } from "@/lib/sentry/capture"

/**
 * Kick off a background investor-matching run without blocking the caller.
 * Uses an internal HTTP route when CRON_SECRET is set (works on Vercel);
 * falls back to an inline fire-and-forget run for local dev.
 */
export function dispatchInvestorMatchingRun(jobId: string) {
  const secret = process.env.CRON_SECRET?.trim()
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://127.0.0.1:3000"

  if (secret) {
    void fetch(`${baseUrl}/api/cron/investors/run/${jobId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    }).catch((error) => {
      captureError(error, { route: "investors-dispatch", jobId })
    })
    return
  }

  void import("@/lib/investors/run-job")
    .then(({ runInvestorMatchingJob }) => runInvestorMatchingJob(jobId))
    .catch(async (error) => {
      captureError(error, { route: "investors-dispatch-inline", jobId })
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const admin = createAdminClient()
      await admin
        .from("investor_matching_jobs")
        .update({
          status: "failed",
          pipeline_stage: "dispatch_failed",
          error: error instanceof Error ? error.message : "Could not start investor matching",
        })
        .eq("id", jobId)
    })
}
