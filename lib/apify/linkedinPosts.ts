import "server-only"

import { apify } from "@/lib/apify/client"
import { resolveLinkedInPostsActorId } from "@/lib/apify/actors"
import {
  buildLinkedInPostsFetchPlan,
  normaliseLinkedInPostRows,
} from "@/lib/apify/linkedin-post-normalization"
import type { LinkedInPost } from "@/types/apify"

export async function fetchLinkedInPostsForProfiles(
  profileUrls: string[],
  options: { maxPosts?: number; postedLimit?: string } = {}
): Promise<LinkedInPost[]> {
  const actorId = resolveLinkedInPostsActorId()
  const plan = buildLinkedInPostsFetchPlan(profileUrls, options)
  if (!plan) return []

  console.log("[apify:linkedin-posts] Starting actor", {
    actorId,
    targetUrlCount: plan.targetUrls.length,
    maxPosts: plan.maxPosts,
  })
  const run = await apify.actor(actorId).call(plan.input)
  const datasetId = String(run.defaultDatasetId ?? "")
  if (!datasetId) return []

  const { items } = await apify.dataset(datasetId).listItems({
    clean: true,
    limit: plan.datasetItemLimit,
  })
  const posts = normaliseLinkedInPostRows(items, {
    targetUrls: plan.targetUrls,
    maxPostsPerProfile: plan.maxPosts,
  })
  console.log("[apify:linkedin-posts] Dataset fetched", {
    itemCount: items.length,
    postCount: posts.length,
    itemLimit: plan.datasetItemLimit,
  })

  return posts
}
