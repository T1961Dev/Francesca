import "server-only"

import { apify } from "@/lib/apify/client"
import { resolveLinkedInProfileActorId } from "@/lib/apify/actors"
import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"

export type LinkedInProfileEnrichment = {
  profileUrl: string
  raw: Record<string, unknown>
}

export async function enrichLinkedInProfiles(
  profileUrls: string[]
): Promise<LinkedInProfileEnrichment[]> {
  const actorId = resolveLinkedInProfileActorId()
  const urls = Array.from(
    new Set(profileUrls.map(normaliseLinkedInUrl).filter((u): u is string => Boolean(u)))
  )

  if (!urls.length) return []

  const input = { urls }
  console.log("[apify:linkedin-profile] Starting actor", { actorId, urlCount: urls.length })
  const run = await apify.actor(actorId).call(input)
  const datasetId = String(run.defaultDatasetId ?? "")
  if (!datasetId) return []

  const { items } = await apify.dataset(datasetId).listItems()
  console.log("[apify:linkedin-profile] Dataset fetched", { itemCount: items.length })

  return items
    .map((item) => {
      const raw = item as Record<string, unknown>
      const url =
        normaliseLinkedInUrl(
          pickUrl(raw, ["linkedinUrl", "linkedin_url", "url", "profileUrl", "profile_url"])
        ) ?? ""
      if (!url) return null
      return { profileUrl: url, raw }
    })
    .filter((row): row is LinkedInProfileEnrichment => Boolean(row))
}

function pickUrl(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = raw[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

export function profileMapByUrl(
  enrichments: LinkedInProfileEnrichment[]
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  for (const row of enrichments) {
    const key = normaliseLinkedInUrl(row.profileUrl)
    if (key) map.set(key, row.raw)
  }
  return map
}
