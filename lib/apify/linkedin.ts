import "server-only"

import { apify } from "@/lib/apify/client"
import type { LinkedInPost } from "@/types/apify"

const ACTOR_ID = "harvestapi/linkedin-profile-posts"

export async function startLinkedInEnrichment(partnerUrls: string[], _jobId?: string) {
  void _jobId
  const targetUrls = Array.from(
    new Set(partnerUrls.map(normaliseLinkedInUrl).filter((url): url is string => Boolean(url)))
  )

  const input = {
    targetUrls,
    maxPosts: 5,
    maxReactions: 5,
    postNestedReactions: false,
    maxComments: 5,
    postNestedComments: false,
  }

  console.log("[apify:linkedin] Starting actor", { actorId: ACTOR_ID, input })
  const run = await apify.actor(ACTOR_ID).call(input)
  console.log("[apify:linkedin] Actor finished", {
    actorId: ACTOR_ID,
    runId: run.id,
    datasetId: run.defaultDatasetId,
    datasetUrl: run.defaultDatasetId
      ? `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
      : null,
  })

  return { actorId: ACTOR_ID, runId: run.id, datasetId: run.defaultDatasetId }
}

export async function fetchLinkedInResults(datasetId: string): Promise<LinkedInPost[]> {
  if (!datasetId) return []
  const { items } = await apify.dataset(datasetId).listItems()
  console.log("[apify:linkedin] Dataset items fetched", { datasetId, itemCount: items.length })
  return items as unknown as LinkedInPost[]
}

export function normaliseLinkedInUrl(url: string | undefined | null): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    const path = parsed.pathname.replace(/\/$/, "")
    if (!path || path === "/") return null
    return `https://www.linkedin.com${path}`
  } catch {
    return null
  }
}

