import { getInvestorMatchesPerRun } from "@/lib/stripe/plans"

/**
 * Plan-aware sizing for the investor matching funnel.
 *
 * Design goal: deliver EXACTLY `targetMatchCount` ranked partners per run
 * while spending the minimum Apify budget to get there. We size each stage
 * from the plan cap working backwards:
 *
 *   Leads Finder fetch  → enough raw leads to survive email/firm dedup
 *   Prefilter shortlist → slightly more firms than we need to rank
 *   Enrichment cap      → ONLY the top-scored firms get Crunchbase + LinkedIn
 *   Ranker input        → 1 partner per enriched firm (~target + buffer)
 *   Output              → exactly targetMatchCount (backfill if GPT is short)
 */
export type InvestorFunnelSizing = {
  /** Final ranked partners delivered to the user (plan cap). */
  targetMatchCount: number
  /** Apify Leads Finder `fetch_count`. */
  leadsFinderFetchCount: number
  /** Max firms kept after deterministic prefilter. */
  shortlistTarget: number
  /** Max firms sent to Crunchbase (expensive — keep tight). */
  enrichmentFirmCap: number
  /** Max partner LinkedIn profiles scraped (most expensive stage). */
  linkedinPartnerCap: number
  /** Partners per firm considered before ranking (keep at 1 to control cost). */
  partnersPerFirm: number
}

export function computeInvestorFunnelSizing(planId: string): InvestorFunnelSizing | null {
  const target = getInvestorMatchesPerRun(planId)
  if (target <= 0) return null

  // Raw-lead buffer: ~40% loss from invalid emails + firm dedup + prefilter drop.
  const leadsFinderFetchCount = target + Math.ceil(target * 0.4) + 10

  // Keep ~30% more firms than the target so the ranker has choice.
  const shortlistTarget = target + Math.ceil(target * 0.3)

  // Only enrich the top-scored subset — this is where Apify cost lives.
  const enrichmentFirmCap = target + Math.ceil(target * 0.15)

  // Scrape LinkedIn for at most target + small buffer (1 partner per firm).
  const linkedinPartnerCap = target + 5

  return {
    targetMatchCount: target,
    leadsFinderFetchCount,
    shortlistTarget,
    enrichmentFirmCap,
    linkedinPartnerCap,
    partnersPerFirm: 1,
  }
}

/** Pro/Lifetime (25): fetch 45, shortlist 33, enrich 29, linkedin 30 */
