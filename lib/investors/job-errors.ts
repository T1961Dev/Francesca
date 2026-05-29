import "server-only"

import type { createAdminClient } from "@/lib/supabase/admin"

type SupabaseLike = { from: ReturnType<typeof createAdminClient>["from"] }

/** User-facing copy for investor matching failures (never raw Apify dumps). */
export function formatInvestorMatchError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Investor matching failed"

  const lower = raw.toLowerCase()

  if (lower.includes("contact_location") || lower.includes("field input.contact_location")) {
    return "Investor discovery failed because the lead source rejected the location filters. Please retry in a moment."
  }

  if (lower.includes("invalid-input") || lower.includes("input is not valid")) {
    return "Investor discovery could not start because the search filters were rejected. Update your profile geography in Settings and try again."
  }

  if (lower.includes("plan no longer includes investor matching")) {
    return "Your current plan no longer includes investor matching. Upgrade to Pro to run this again."
  }

  if (lower.includes("cancelled")) {
    return "Investor matching was cancelled."
  }

  if (lower.includes("deck analysis not found")) {
    return "The deck analysis for this run could not be found. Upload and analyse your deck again, then retry matching."
  }

  if (raw.length > 320) {
    return `${raw.slice(0, 317)}...`
  }

  return raw
}

export async function markInvestorJobFailed(
  supabase: SupabaseLike,
  jobId: string,
  error: unknown,
  pipelineStage: string
) {
  const { data: job } = await supabase
    .from("investor_matching_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle()

  if (String(job?.status) === "cancelled") return

  await supabase
    .from("investor_matching_jobs")
    .update({
      status: "failed",
      pipeline_stage: pipelineStage,
      error: formatInvestorMatchError(error),
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
}
