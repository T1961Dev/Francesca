import { LEADS_FINDER_WORLDWIDE_COUNTRIES } from "@/lib/apify/leads-finder-countries"
import {
  locationsForInvestorRegion,
  type InvestorRegion,
} from "@/lib/matching/investor-fit"

const GLOBAL_GEOGRAPHY = new Set([
  "",
  "worldwide",
  "world wide",
  "global",
  "international",
  "anywhere",
  "world",
  "all regions",
  "all markets",
])

const PROFILE_GEOGRAPHY_ALIASES: Record<string, string> = {
  uk: "united kingdom",
  us: "united states",
  usa: "united states",
  uae: "united arab emirates",
  "great britain": "united kingdom",
}

/**
 * Investor discovery should be broad, but not region-blind. For UK/EU/global
 * founders we search UK, Europe, and US/global markets explicitly so local
 * investors are not crowded out by the largest US pools.
 */
export function buildLeadsFinderContactLocations(
  geography?: string,
  region?: InvestorRegion
): string[] {
  if (region) {
    const locations = locationsForInvestorRegion(region)
    return locations.length ? locations : [...LEADS_FINDER_WORLDWIDE_COUNTRIES]
  }

  const normalised = geography?.trim().toLowerCase() ?? ""
  if (
    normalised.startsWith("uk") ||
    normalised.includes("united kingdom") ||
    normalised.includes("europe") ||
    isGlobalFounderGeography(normalised)
  ) {
    return uniqueLocations([
      ...locationsForInvestorRegion("UK"),
      ...locationsForInvestorRegion("Europe"),
      ...locationsForInvestorRegion("US"),
    ])
  }
  if (normalised.includes("united states") || normalised === "us" || normalised === "usa") {
    return uniqueLocations([
      ...locationsForInvestorRegion("US"),
      ...locationsForInvestorRegion("UK"),
      ...locationsForInvestorRegion("Europe"),
    ])
  }

  return [...LEADS_FINDER_WORLDWIDE_COUNTRIES]
}

export function isGlobalFounderGeography(geography: string) {
  const normalised = geography.trim().toLowerCase()
  return GLOBAL_GEOGRAPHY.has(normalised)
}

/** Normalised geography token used for post-fetch ranking boosts only. */
export function normaliseFounderGeographyForRanking(geography: string): string | null {
  const trimmed = geography.trim()
  const normalised = trimmed.toLowerCase()
  if (!trimmed || isGlobalFounderGeography(trimmed)) return null

  return PROFILE_GEOGRAPHY_ALIASES[normalised] ?? normalised
}

function uniqueLocations(locations: string[]) {
  return [...new Set(locations.filter(Boolean))]
}
