import "server-only"

import { apify } from "@/lib/apify/client"
import {
  buildLinkedInPostsFetchPlan,
  normaliseLinkedInPostRows,
  normaliseLinkedInProfileUrl,
} from "@/lib/apify/linkedin-post-normalization"
import type { LinkedInPost } from "@/types/apify"

const ACTOR_ID = "harvestapi/linkedin-profile-posts"

export async function startLinkedInEnrichment(partnerUrls: string[], _jobId?: string) {
  void _jobId
  const plan = buildLinkedInPostsFetchPlan(partnerUrls, { maxPosts: 5, postedLimit: "year" })
  if (!plan) {
    console.log("[apify:linkedin] Skipping actor; no valid LinkedIn post targets")
    return { actorId: ACTOR_ID, runId: null, datasetId: null, skipped: true }
  }

  console.log("[apify:linkedin] Starting actor", { actorId: ACTOR_ID, input: plan.input })
  const run = await apify.actor(ACTOR_ID).call(plan.input)
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
  const { items } = await apify.dataset(datasetId).listItems({
    clean: true,
    limit: 1000,
  })
  const posts = normaliseLinkedInPostRows(items, { maxPostsPerProfile: 5 })
  console.log("[apify:linkedin] Dataset items fetched", {
    datasetId,
    itemCount: items.length,
    postCount: posts.length,
  })
  return posts
}

export function normaliseLinkedInUrl(url: string | undefined | null): string | null {
  return normaliseLinkedInProfileUrl(url)
}

