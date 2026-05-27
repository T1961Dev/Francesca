import "server-only"

import { apify } from "@/lib/apify/client"
import type { LeadsFinderContact } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"

export const LEADS_FINDER_ACTOR_ID =
  process.env.APIFY_LEADS_FINDER_ACTOR?.trim() || "code_crafter/leads-finder"

const DEFAULT_FETCH_COUNT = Number(process.env.LEADS_FINDER_FETCH_COUNT ?? 250)

const VC_JOB_TITLES = [
  "General Partner",
  "Managing Partner",
  "Partner",
  "Principal",
  "Investment Partner",
  "Venture Partner",
  "Investment Director",
]

const EXCLUDED_JOB_TITLES = ["Limited Partner", "Analyst", "Associate"]

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
  const locations = buildContactLocations(profile.company.geography)

  const input: Record<string, unknown> = {
    fetch_count: fetchCount,
    email_status: ["validated"],
    contact_job_title: VC_JOB_TITLES,
    contact_not_job_title: EXCLUDED_JOB_TITLES,
    company_industry: ["venture capital & private equity"],
    contact_location: locations,
  }

  if (!options.broad) {
    const keywords = [
      profile.company.subSector,
      profile.company.sector,
      profile.company.name,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value && value.length > 1))

    if (keywords.length) {
      input.company_keywords = [...new Set(keywords)]
    }
  }

  return input
}

export async function discoverVCPartners(
  profile: FounderProfile,
  options: LeadsFinderInputOptions = {}
): Promise<LeadsFinderContact[]> {
  const input = buildLeadsFinderInput(profile, options)
  console.log("[apify:leads-finder] Starting actor", { actorId: LEADS_FINDER_ACTOR_ID, input })
  const run = await apify.actor(LEADS_FINDER_ACTOR_ID).call(input)
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

function buildContactLocations(geography: string) {
  const normalised = geography.trim().toLowerCase()
  const locations = new Set<string>()

  if (normalised) {
    locations.add(normalised)
  }

  if (!normalised.includes("united states") && normalised !== "us" && normalised !== "usa") {
    locations.add("united states")
  }

  return [...locations]
}
