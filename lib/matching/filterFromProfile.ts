import { createHash } from "crypto"

import { buildLeadsFinderInput } from "@/lib/apify/leads-finder"
import {
  buildDeckDiscoveryConfig,
  buildDeckDiscoverySignature,
} from "@/lib/matching/deck-discovery"
import type { FounderProfile } from "@/types/profile"

/** Deck-aware discovery payload — distinct per deck, not just onboarding ICP. */
export type DiscoveryFilterPayload = {
  deckSignature: string
  investorAudience: string
  contact_job_title: string[]
  contact_not_job_title: string[]
  company_industry: string[]
  contact_location: string[]
  company_keywords: string[]
  email_status: string[]
  sectorBucket: string
  sectorRaw: string
  subSector: string
  stage: string
  geography: string
  businessModelRaw: string
}

export function buildDiscoveryFilterPayload(profile: FounderProfile): DiscoveryFilterPayload {
  const input = buildLeadsFinderInput(profile, { fetchCount: 1 })
  const discovery = buildDeckDiscoveryConfig(profile)

  return {
    deckSignature: buildDeckDiscoverySignature(profile),
    investorAudience: discovery.audience,
    contact_job_title: (input.contact_job_title as string[]) ?? [],
    contact_not_job_title: (input.contact_not_job_title as string[]) ?? [],
    company_industry: (input.company_industry as string[]) ?? [],
    contact_location: (input.contact_location as string[]) ?? [],
    company_keywords: discovery.thesisKeywords,
    email_status: (input.email_status as string[]) ?? ["validated"],
    sectorBucket: profile.company.sector,
    sectorRaw: profile.company.sectorRaw,
    subSector: profile.company.subSector,
    stage: discovery.stage,
    geography: profile.company.geography,
    businessModelRaw: profile.company.businessModelRaw,
  }
}

export function hashDiscoveryFilter(payload: DiscoveryFilterPayload): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)
}

export function buildDiscoveryFilterFromProfile(profile: FounderProfile) {
  const filterPayload = buildDiscoveryFilterPayload(profile)
  const filterHash = hashDiscoveryFilter(filterPayload)
  return { filterPayload, filterHash }
}
