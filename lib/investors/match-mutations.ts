import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type InvestorMatchRow = {
  id: string
  user_id: string
  job_id: string
  deck_analysis_id: string | null
  matches: Record<string, unknown>[]
  raw_apify_response: unknown
}

export async function loadInvestorMatchRow(
  supabase: SupabaseClient,
  jobId: string,
  userId: string
) {
  const { data: row, error } = await supabase
    .from("investor_matches")
    .select("id, user_id, job_id, deck_analysis_id, matches, raw_apify_response")
    .eq("job_id", jobId)
    .maybeSingle()

  if (error) throw error
  if (!row || row.user_id !== userId) return null

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    job_id: String(row.job_id),
    deck_analysis_id: row.deck_analysis_id ? String(row.deck_analysis_id) : null,
    matches: Array.isArray(row.matches) ? [...(row.matches as Record<string, unknown>[])] : [],
    raw_apify_response: row.raw_apify_response,
  } satisfies InvestorMatchRow
}

export async function updateInvestorMatchAtRank({
  supabase,
  rowId,
  matches,
  rank,
  patch,
}: {
  supabase: SupabaseClient
  rowId: string
  matches: Record<string, unknown>[]
  rank: number
  patch: Record<string, unknown>
}) {
  const index = matches.findIndex((match) => Number(match?.rank) === rank)
  if (index === -1) {
    throw new Error("Match rank not found")
  }

  const nextMatches = [...matches]
  nextMatches[index] = { ...nextMatches[index], ...patch }

  const { error } = await supabase
    .from("investor_matches")
    .update({ matches: nextMatches })
    .eq("id", rowId)

  if (error) throw error

  return nextMatches[index]
}
