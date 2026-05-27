import type { SupabaseClient } from "@supabase/supabase-js"

import { dispatchInvestorMatchingRun } from "@/lib/investors/dispatch"
import { buildFounderProfile } from "@/lib/matching/profile"
import { hashProfile } from "@/lib/utils/hash-profile"

type SupabaseLike = SupabaseClient | {
  from: SupabaseClient["from"]
}

export async function enqueueInvestorMatching({
  supabase,
  userId,
  deckAnalysisId,
  profile,
  deckAnalysis,
}: {
  supabase: SupabaseLike
  userId: string
  deckAnalysisId: string
  profile: Record<string, unknown>
  deckAnalysis: Record<string, unknown>
}) {
  const founderProfile = buildFounderProfile({
    userId,
    deckAnalysisId,
    profile,
    deckAnalysis,
  })
  const profileHash = hashProfile(founderProfile)

  const { data: job, error } = await supabase
    .from("investor_matching_jobs")
    .insert({
      user_id: userId,
      deck_analysis_id: deckAnalysisId,
      status: "pending",
      pipeline_stage: "queued",
      cache_key: profileHash,
      profile_hash: profileHash,
      started_at: new Date().toISOString(),
      candidate_count: 0,
    })
    .select("id, status, deck_analysis_id")
    .single()

  if (error) throw error

  console.log(`[investor-matching:${job.id}] Job queued from app request`, {
    userId,
    deckAnalysisId,
    cacheKey: profileHash,
  })

  dispatchInvestorMatchingRun(String(job.id))

  return job as Record<string, unknown>
}

/** True when this deck already has a non-terminal matching job. */
export async function hasActiveInvestorJobForDeck(
  supabase: SupabaseLike,
  deckAnalysisId: string
) {
  const { data } = await supabase
    .from("investor_matching_jobs")
    .select("id, status")
    .eq("deck_analysis_id", deckAnalysisId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.id) return false
  return !["completed", "failed", "cancelled"].includes(String(data.status))
}
