import { LEADS_FINDER_WORLDWIDE_COUNTRIES } from "@/lib/apify/leads-finder-countries"

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

/** All investor discovery runs search every supported country by default. */
export function buildLeadsFinderContactLocations(_geography?: string): string[] {
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
