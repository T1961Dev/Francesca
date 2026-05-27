import type { LeadsFinderContact, LinkedInPost } from "@/types/apify"

/** One investor candidate after discovery + optional LinkedIn enrichment. */
export type EnrichedInvestorCandidate = {
  lead: LeadsFinderContact
  linkedInProfile?: Record<string, unknown>
  linkedInPosts?: LinkedInPost[]
}
