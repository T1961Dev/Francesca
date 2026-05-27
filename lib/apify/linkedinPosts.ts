import "server-only"

import { apify } from "@/lib/apify/client"
import { resolveLinkedInPostsActorId } from "@/lib/apify/actors"
import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import type { LinkedInPost } from "@/types/apify"

export async function fetchLinkedInPostsForProfiles(
  profileUrls: string[],
  options: { maxPosts?: number; postedLimit?: string } = {}
): Promise<LinkedInPost[]> {
  const actorId = resolveLinkedInPostsActorId()
  const targetUrls = Array.from(
    new Set(profileUrls.map(normaliseLinkedInUrl).filter((u): u is string => Boolean(u)))
  )
  if (!targetUrls.length) return []

  const input = {
    targetUrls,
    maxPosts: options.maxPosts ?? 10,
    postedLimit: options.postedLimit ?? "year",
    maxReactions: 0,
    postNestedReactions: false,
    maxComments: 0,
    postNestedComments: false,
  }

  console.log("[apify:linkedin-posts] Starting actor", {
    actorId,
    targetUrlCount: targetUrls.length,
  })
  const run = await apify.actor(actorId).call(input)
  const datasetId = String(run.defaultDatasetId ?? "")
  if (!datasetId) return []

  const { items } = await apify.dataset(datasetId).listItems()
  console.log("[apify:linkedin-posts] Dataset fetched", { itemCount: items.length })

  return items.map((row) => {
    const item = row as Record<string, unknown>
    return {
      profileUrl: String(item.profileUrl ?? ""),
      postText: String(item.postText ?? item.text ?? ""),
      postedAt: String(item.postedAt ?? item.date ?? ""),
      postUrl: item.postUrl ? String(item.postUrl) : undefined,
    } satisfies LinkedInPost
  })
}
