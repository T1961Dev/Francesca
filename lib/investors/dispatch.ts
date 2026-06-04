import "server-only"

import { getPublicAppUrl } from "@/lib/app-url"
import { markInvestorJobFailed } from "@/lib/investors/job-errors"
import { captureError } from "@/lib/sentry/capture"

/**
 * Kick off a background investor-matching run without blocking the caller.
 * Uses an internal HTTP route when CRON_SECRET is set (works on Vercel);
 * falls back to an inline fire-and-forget run for local dev.
 */
export function dispatchInvestorMatchingRun(jobId: string) {
  const secret = process.env.CRON_SECRET?.trim()
  const baseUrl = getPublicAppUrl()

  if (secret) {
    void fetch(`${baseUrl}/api/cron/investors/run/${jobId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.ok) return

        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(
          body?.error ?? `Investor matching worker failed (${response.status})`
        )
      })
      .catch(async (error) => {
        captureError(error, { route: "investors-dispatch", jobId })
        const { createAdminClient } = await import("@/lib/supabase/admin")
        const admin = createAdminClient()
        await markInvestorJobFailed(admin, jobId, error, "dispatch_failed")
      })
    return
  }

  void import("@/lib/investors/run-job")
    .then(({ runInvestorMatchingJob }) => runInvestorMatchingJob(jobId))
    .catch(async (error) => {
      captureError(error, { route: "investors-dispatch-inline", jobId })
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const admin = createAdminClient()
      await markInvestorJobFailed(admin, jobId, error, "dispatch_failed")
    })
}
