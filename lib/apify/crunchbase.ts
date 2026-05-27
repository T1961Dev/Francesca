import "server-only"

import { apify } from "@/lib/apify/client"
import type { CrunchbaseCompany, JohnVCFirm } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"

const ACTOR_ID = "davidsharadbhatt/crunchbase-company-scraper---no-api-limits"

export async function startCrunchbaseFirmEnrichment(firms: JohnVCFirm[], _jobId?: string) {
  void _jobId
  const input = buildCrunchbaseFirmInput(firms)
  if (!input.urlList.trim()) {
    return { actorId: ACTOR_ID, runId: null, datasetId: null }
  }
  console.log("[apify:crunchbase] Starting actor", { actorId: ACTOR_ID, input })
  const run = await apify.actor(ACTOR_ID).call(input)
  console.log("[apify:crunchbase] Actor finished", {
    actorId: ACTOR_ID,
    runId: run.id,
    datasetId: run.defaultDatasetId,
    datasetUrl: run.defaultDatasetId
      ? `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
      : null,
  })
  return { actorId: ACTOR_ID, runId: run.id, datasetId: run.defaultDatasetId }
}

/** @deprecated Use startCrunchbaseFirmEnrichment after leads-finder prefilter */
export async function startCrunchbaseDiscovery(profile: FounderProfile, _jobId?: string) {
  void _jobId
  const input = buildCrunchbaseInput(profile)
  console.log("[apify:crunchbase] Starting actor", { actorId: ACTOR_ID, input })
  const run = await apify.actor(ACTOR_ID).call(input)
  console.log("[apify:crunchbase] Actor finished", {
    actorId: ACTOR_ID,
    runId: run.id,
    datasetId: run.defaultDatasetId,
    datasetUrl: run.defaultDatasetId
      ? `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
      : null,
  })
  return { actorId: ACTOR_ID, runId: run.id, datasetId: run.defaultDatasetId }
}

export async function fetchCrunchbaseResults(datasetId: string): Promise<CrunchbaseCompany[]> {
  if (!datasetId) return []
  const { items } = await apify.dataset(datasetId).listItems()
  console.log("[apify:crunchbase] Dataset items fetched", { datasetId, itemCount: items.length })
  return items as unknown as CrunchbaseCompany[]
}

export function buildCrunchbaseFirmInput(firms: JohnVCFirm[]) {
  return {
    urlList: buildCrunchbaseFirmUrlList(firms),
  }
}

export function buildCrunchbaseFirmUrlList(firms: JohnVCFirm[]) {
  const urls = firms
    .map((firm) => {
      const slug = slugify(firm.Firm_Name)
      return slug ? `https://www.crunchbase.com/organization/${slug}` : null
    })
    .filter((url): url is string => Boolean(url))

  return [...new Set(urls)].join("\n")
}

export function buildCrunchbaseInput(profile: FounderProfile) {
  return {
    urlList: buildCrunchbaseUrlList(profile),
  }
}

function buildCrunchbaseUrlList(profile: FounderProfile) {
  const companySlug = slugify(profile.company.name)
  const subSectorSlug = slugify(profile.company.subSector)
  const urls = [
    companySlug ? `https://www.crunchbase.com/organization/${companySlug}` : null,
    subSectorSlug && subSectorSlug !== companySlug
      ? `https://www.crunchbase.com/organization/${subSectorSlug}`
      : null,
  ].filter((url): url is string => Boolean(url))

  return urls.join("\n")
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
