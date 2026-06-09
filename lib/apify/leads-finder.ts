import "server-only"

import { apify } from "@/lib/apify/client"
import { buildLeadsFinderContactLocations } from "@/lib/apify/leads-finder-locations"
import {
  buildInvestorDiscoveryQueries,
  type InvestorDiscoveryQuery,
  type InvestorRegion,
} from "@/lib/matching/investor-fit"
import { buildDeckDiscoveryConfig } from "@/lib/matching/deck-discovery"
import type { LeadsFinderContact } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"

export const LEADS_FINDER_ACTOR_ID =
  process.env.APIFY_LEADS_FINDER_ACTOR?.trim() || "code_crafter/leads-finder"

// Conservative default for callers that don't pass a fetch budget. The
// pipeline overrides this with a plan-aware sizing (Pro ~110, Lifetime
// ~160) so this only kicks in for ad-hoc dev calls.
const DEFAULT_FETCH_COUNT = Number(process.env.LEADS_FINDER_FETCH_COUNT ?? 120)

export type LeadsFinderInputOptions = {
  fetchCount?: number
  /** Broaden search (drop sector keywords) for a second pass */
  broad?: boolean
  region?: InvestorRegion
  companyKeywords?: string[]
}

export type RegionalLeadsFinderResult = {
  leads: LeadsFinderContact[]
  actorInputs: Record<string, unknown>[]
  queries: InvestorDiscoveryQuery[]
}

export function buildLeadsFinderInput(
  profile: FounderProfile,
  options: LeadsFinderInputOptions = {}
) {
  const fetchCount = options.fetchCount ?? DEFAULT_FETCH_COUNT
  const locations = buildLeadsFinderContactLocations(profile.company.geography, options.region)
  const discovery = buildDeckDiscoveryConfig(profile)

  const input: Record<string, unknown> = {
    fetch_count: fetchCount,
    email_status: ["validated"],
    contact_job_title: discovery.contactJobTitles,
    contact_not_job_title: discovery.contactNotJobTitles,
    company_industry: discovery.companyIndustries,
    contact_location: locations,
  }

  const keywords = options.companyKeywords?.length
    ? options.companyKeywords
    : discovery.thesisKeywords

  if (!options.broad && keywords.length) {
    input.company_keywords = keywords
  }

  return input
}

export async function discoverVCPartnersRegionally(
  profile: FounderProfile,
  options: LeadsFinderInputOptions = {}
): Promise<RegionalLeadsFinderResult> {
  const totalFetchCount = options.fetchCount ?? DEFAULT_FETCH_COUNT
  const queries = buildInvestorDiscoveryQueries(profile)
  const passFetchCount = Math.max(20, Math.ceil(totalFetchCount / Math.max(1, queries.length)))
  const leads: LeadsFinderContact[] = []
  const actorInputs: Record<string, unknown>[] = []

  for (const query of queries) {
    const input = buildLeadsFinderInput(profile, {
      ...options,
      broad: false,
      fetchCount: passFetchCount,
      region: query.region,
      companyKeywords: query.companyKeywords,
    })
    actorInputs.push({
      ...input,
      discoveryRegion: query.region,
      discoveryQuery: query.query,
    })
    leads.push(
      ...(await discoverVCPartners(profile, {
        ...options,
        broad: false,
        fetchCount: passFetchCount,
        region: query.region,
        companyKeywords: query.companyKeywords,
      }))
    )
  }

  return {
    leads: dedupeLeadsFinderContacts(leads),
    actorInputs,
    queries,
  }
}

export async function discoverVCPartners(
  profile: FounderProfile,
  options: LeadsFinderInputOptions = {}
): Promise<LeadsFinderContact[]> {
  const input = buildLeadsFinderInput(profile, options)
  console.log("[apify:leads-finder] Starting actor", { actorId: LEADS_FINDER_ACTOR_ID, input })

  let run
  try {
    run = await apify.actor(LEADS_FINDER_ACTOR_ID).call(input)
  } catch (error) {
    console.error("[apify:leads-finder] Actor call failed", error)
    throw error
  }

  console.log("[apify:leads-finder] Actor finished", {
    actorId: LEADS_FINDER_ACTOR_ID,
    runId: run.id,
    datasetId: run.defaultDatasetId,
  })

  const datasetId = String(run.defaultDatasetId ?? "")
  if (!datasetId) return []

  const { items } = await apify.dataset(datasetId).listItems()
  const leads = items as unknown as LeadsFinderContact[]
  const validated = leads.filter((lead) => Boolean(lead.email?.trim()))
  console.log("[apify:leads-finder] Dataset items fetched", {
    datasetId,
    itemCount: items.length,
    validatedCount: validated.length,
  })

  return validated
}

function dedupeLeadsFinderContacts(leads: LeadsFinderContact[]) {
  const seen = new Set<string>()
  return leads.filter((lead) => {
    const key =
      lead.email?.trim().toLowerCase() ||
      lead.linkedin?.trim().toLowerCase() ||
      `${lead.full_name ?? ""}:${lead.company_name ?? ""}`.toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
