import "server-only"

import { apify } from "@/lib/apify/client"
import { buildLeadsFinderContactLocations } from "@/lib/apify/leads-finder-locations"
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
}

export function buildLeadsFinderInput(
  profile: FounderProfile,
  options: LeadsFinderInputOptions = {}
) {
  const fetchCount = options.fetchCount ?? DEFAULT_FETCH_COUNT
  const locations = buildLeadsFinderContactLocations(profile.company.geography)
  const discovery = buildDeckDiscoveryConfig(profile)

  const input: Record<string, unknown> = {
    fetch_count: fetchCount,
    email_status: ["validated"],
    contact_job_title: discovery.contactJobTitles,
    contact_not_job_title: discovery.contactNotJobTitles,
    company_industry: discovery.companyIndustries,
    contact_location: locations,
  }

  if (!options.broad && discovery.thesisKeywords.length) {
    input.company_keywords = discovery.thesisKeywords
  }

  return input
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
