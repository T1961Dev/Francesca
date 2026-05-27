import "server-only"

import { createClient } from "@/lib/supabase/server"

export async function fetchLatestInvestorMatchesForDeck(deckAnalysisId: string) {
  const supabase = await createClient()

  const { data: matchRow } = await supabase
    .from("investor_matches")
    .select("*")
    .eq("deck_analysis_id", deckAnalysisId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (matchRow) {
    const { data: job } = await supabase
      .from("investor_matching_jobs")
      .select("id, status, error, created_at")
      .eq("id", String(matchRow.job_id))
      .maybeSingle()

    return {
      jobId: String(matchRow.job_id),
      jobStatus: String(job?.status ?? "completed"),
      jobError: (job?.error as string | null) ?? null,
      matches: (matchRow.matches as Record<string, unknown>[] | null) ?? [],
    }
  }

  const { data: job } = await supabase
    .from("investor_matching_jobs")
    .select("id, status, error, created_at")
    .eq("deck_analysis_id", deckAnalysisId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!job) return null

  return {
    jobId: String(job.id),
    jobStatus: String(job.status),
    jobError: job.error as string | null,
    matches: [] as Record<string, unknown>[],
  }
}

export async function fetchInvestorMatchesForJob(jobId: string) {
  const supabase = await createClient()

  const { data: result } = await supabase
    .from("investor_matches")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle()

  return {
    matches: (result?.matches as Record<string, unknown>[] | null) ?? [],
  }
}
