import "server-only"

import type { DiscoveryFilterPayload } from "@/lib/matching/filterFromProfile"
import { createAdminClient } from "@/lib/supabase/admin"
import type { EnrichedInvestorCandidate } from "@/types/matching-v2"

const SCRAPE_TTL_DAYS = 30

export async function getScrapeCache(filterHash: string): Promise<{
  id: string
  candidates: EnrichedInvestorCandidate[]
} | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("investor_scrape_cache")
    .select("id, candidates, expires_at")
    .eq("filter_hash", filterHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (!data?.id) return null

  const candidates = Array.isArray(data.candidates)
    ? (data.candidates as EnrichedInvestorCandidate[])
    : []

  return { id: String(data.id), candidates }
}

export async function setScrapeCache({
  filterHash,
  filterPayload,
  candidates,
}: {
  filterHash: string
  filterPayload: DiscoveryFilterPayload
  candidates: EnrichedInvestorCandidate[]
}) {
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + SCRAPE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("investor_scrape_cache")
    .upsert(
      {
        filter_hash: filterHash,
        filter_payload: filterPayload as unknown as Record<string, unknown>,
        candidates: candidates as unknown as Record<string, unknown>[],
        enriched_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "filter_hash" }
    )
    .select("id")
    .single()

  if (error) throw error
  return String(data.id)
}
