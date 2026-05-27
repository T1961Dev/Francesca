import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Ensure the investor matching job belongs to the authenticated user.
 * Defense-in-depth on top of RLS (avoids silent no-ops / ambiguous errors).
 */
export async function assertInvestorJobOwner(
  supabase: SupabaseClient,
  jobId: string,
  userId: string
) {
  const { data: job, error } = await supabase
    .from("investor_matching_jobs")
    .select("id, user_id")
    .eq("id", jobId)
    .maybeSingle()

  if (error) throw error
  if (!job || String(job.user_id) !== userId) {
    const err = new Error("Job not found")
    ;(err as Error & { status?: number }).status = 404
    throw err
  }

  return job
}

export async function assertInvestorMatchRowOwner(
  supabase: SupabaseClient,
  jobId: string,
  userId: string
) {
  const { data: row, error } = await supabase
    .from("investor_matches")
    .select("id, user_id, matches")
    .eq("job_id", jobId)
    .maybeSingle()

  if (error) throw error
  if (!row || String(row.user_id) !== userId) {
    const err = new Error("Match not found")
    ;(err as Error & { status?: number }).status = 404
    throw err
  }

  return row
}
