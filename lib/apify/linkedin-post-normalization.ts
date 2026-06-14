import type { LinkedInPost } from "@/types/apify"

const DEFAULT_MAX_POSTS_PER_PROFILE = 10
const MAX_POSTS_PER_PROFILE = 10
const DATASET_ITEM_MULTIPLIER = 30
const MAX_DATASET_ITEMS = 1000
const MIN_POST_TEXT_LENGTH = 10

export type LinkedInPostsActorOptions = {
  maxPosts?: number
  postedLimit?: string
}

export type LinkedInPostsActorInput = {
  targetUrls: string[]
  maxPosts: number
  postedLimit: string
  maxReactions: 0
  postNestedReactions: false
  scrapeReactions: false
  maxComments: 0
  postNestedComments: false
  scrapeComments: false
  includeQuotePosts: false
  includeReposts: false
}

export type LinkedInPostsFetchPlan = {
  targetUrls: string[]
  maxPosts: number
  datasetItemLimit: number
  input: LinkedInPostsActorInput
}

export function buildLinkedInPostsFetchPlan(
  profileUrls: Array<string | null | undefined>,
  options: LinkedInPostsActorOptions = {}
): LinkedInPostsFetchPlan | null {
  const targetUrls = Array.from(
    new Set(profileUrls.map(normaliseLinkedInProfileUrl).filter((url): url is string => Boolean(url)))
  )
  const requestedMaxPosts = options.maxPosts ?? DEFAULT_MAX_POSTS_PER_PROFILE

  if (!targetUrls.length || !Number.isFinite(requestedMaxPosts) || requestedMaxPosts <= 0) {
    return null
  }

  const maxPosts = Math.min(
    MAX_POSTS_PER_PROFILE,
    Math.max(1, Math.floor(requestedMaxPosts))
  )
  const requestedItemLimit = targetUrls.length * maxPosts * DATASET_ITEM_MULTIPLIER

  return {
    targetUrls,
    maxPosts,
    datasetItemLimit: Math.min(MAX_DATASET_ITEMS, Math.max(maxPosts * targetUrls.length, requestedItemLimit)),
    input: {
      targetUrls,
      maxPosts,
      postedLimit: options.postedLimit ?? "year",
      maxReactions: 0,
      postNestedReactions: false,
      scrapeReactions: false,
      maxComments: 0,
      postNestedComments: false,
      scrapeComments: false,
      includeQuotePosts: false,
      includeReposts: false,
    },
  }
}

export function normaliseLinkedInPostRows(
  rows: unknown[],
  options: {
    targetUrls?: Array<string | null | undefined>
    maxPostsPerProfile?: number
  } = {}
): LinkedInPost[] {
  const targetUrls = new Set(
    (options.targetUrls ?? [])
      .map(normaliseLinkedInProfileUrl)
      .filter((url): url is string => Boolean(url))
  )
  const requestedMaxPostsPerProfile = options.maxPostsPerProfile ?? DEFAULT_MAX_POSTS_PER_PROFILE
  const maxPostsPerProfile = Number.isFinite(requestedMaxPostsPerProfile) && requestedMaxPostsPerProfile > 0
    ? Math.min(MAX_POSTS_PER_PROFILE, Math.floor(requestedMaxPostsPerProfile))
    : DEFAULT_MAX_POSTS_PER_PROFILE
  const seen = new Set<string>()
  const perProfile = new Map<string, number>()
  const posts: LinkedInPost[] = []

  for (const row of rows) {
    const item = asRecord(row)
    if (!item || isNonPostDatasetRow(item)) continue

    const post = normaliseLinkedInPostRow(item)
    if (!post) continue
    if (targetUrls.size > 0 && !targetUrls.has(post.profileUrl)) continue

    const profileCount = perProfile.get(post.profileUrl) ?? 0
    if (profileCount >= maxPostsPerProfile) continue

    const dedupeKey = buildPostDedupeKey(post, item)
    if (seen.has(dedupeKey)) continue

    seen.add(dedupeKey)
    perProfile.set(post.profileUrl, profileCount + 1)
    posts.push(post)
  }

  return posts
}

export function normaliseLinkedInProfileUrl(url: string | undefined | null): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`)
    const path = parsed.pathname.replace(/\/$/, "")
    if (!path || path === "/") return null
    return `https://www.linkedin.com${path}`
  } catch {
    return null
  }
}

function normaliseLinkedInPostRow(item: Record<string, unknown>): LinkedInPost | null {
  const author = asRecord(item.author)
  const query = asRecord(item.query)
  const profileUrl = normaliseLinkedInProfileUrl(
    firstString(item.profileUrl, query?.targetUrl, author?.linkedinUrl)
  )
  const postText = firstString(item.postText, item.text, item.content)

  if (!profileUrl || !postText || postText.trim().length < MIN_POST_TEXT_LENGTH) {
    return null
  }

  return {
    profileUrl,
    postText: normaliseWhitespace(postText),
    postedAt: normalisePostDate(item.postedAt) ?? normalisePostDate(item.date) ?? "",
    postUrl: firstString(item.postUrl, item.linkedinUrl, item.url, query?.post),
  }
}

function isNonPostDatasetRow(item: Record<string, unknown>) {
  const type = firstString(item.type)?.trim().toLowerCase()
  if (type && type !== "post") return true

  if (item.reactionType) return true
  if (!type && item.commentary && (item.actor || item.commenter || item.query)) return true

  return false
}

function buildPostDedupeKey(post: LinkedInPost, item: Record<string, unknown>) {
  const id = firstString(item.id)
  if (post.postUrl) return `url:${post.postUrl.trim().toLowerCase()}`
  if (id) return `id:${id.trim().toLowerCase()}`
  return `text:${post.profileUrl}:${post.postText.toLowerCase().slice(0, 180)}`
}

function normalisePostDate(value: unknown): string | null {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }

  const record = asRecord(value)
  if (!record) return null

  const date = firstString(record.date, record.postedAt, record.postedAgoText)
  if (date) return date

  if (typeof record.timestamp === "number" && Number.isFinite(record.timestamp)) {
    return new Date(record.timestamp).toISOString()
  }

  return null
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

function normaliseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
