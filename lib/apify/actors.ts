/**
 * Approved Apify actors for investor matching (v2 pipeline).
 * Do not add actors here without explicit approval.
 */
export const APIFY_ACTORS = {
  LEADS_FINDER: {
    id: "code_crafter/leads-finder",
    name: "code_crafter/leads-finder",
    pricing: { perResultUsd: 0.0015, perStartUsd: 0 },
  },
  LINKEDIN_PROFILE: {
    id: "LpVuK3Zozwuipa5bp",
    name: "harvestapi/linkedin-profile-scraper",
    pricing: { perProfileUsd: 0.004 },
  },
  LINKEDIN_POSTS: {
    id: "A3cAPGpwBEG8RJwse",
    name: "harvestapi/linkedin-profile-posts",
    pricing: { perPostUsd: 0.002, perStartUsd: 0.00005 },
  },
  EMAIL_VERIFIER: {
    id: "zjec57U2EHqmfIIGI",
    name: "fatihtahta/email-verifier-validator-pro",
    pricing: { perEmailUsd: 0.00089 },
  },
} as const

export function resolveLeadsFinderActorId(): string {
  return process.env.APIFY_LEADS_FINDER_ACTOR?.trim() || APIFY_ACTORS.LEADS_FINDER.name
}

export function resolveLinkedInProfileActorId(): string {
  return (
    process.env.APIFY_LINKEDIN_PROFILE_ACTOR?.trim() || APIFY_ACTORS.LINKEDIN_PROFILE.name
  )
}

export function resolveLinkedInPostsActorId(): string {
  return process.env.APIFY_LINKEDIN_POSTS_ACTOR?.trim() || APIFY_ACTORS.LINKEDIN_POSTS.name
}

export function resolveEmailVerifierActorId(): string {
  return process.env.APIFY_EMAIL_VERIFIER_ACTOR?.trim() || APIFY_ACTORS.EMAIL_VERIFIER.name
}

export function isInvestorPipelineV2(): boolean {
  return process.env.INVESTOR_PIPELINE_VERSION?.trim() === "v2"
}

export function isLinkedInPostsEnabled(): boolean {
  const raw = process.env.INVESTOR_PIPELINE_LINKEDIN_POSTS?.trim().toLowerCase()
  if (raw === "false" || raw === "0" || raw === "off") return false
  return true
}
