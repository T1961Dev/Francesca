import { createHash } from "crypto"

import { buildInvestorThesisKeywords } from "@/lib/matching/investor-thesis-keywords"
import type { FounderProfile } from "@/types/profile"

/** Who we are trying to reach — drives job titles and firm keywords. */
export type InvestorAudience = "venture_capital" | "private_equity" | "search_fund"

export type DeckDiscoveryConfig = {
  audience: InvestorAudience
  stage: FounderProfile["company"]["stage"]
  thesisKeywords: string[]
  contactJobTitles: string[]
  contactNotJobTitles: string[]
  companyIndustries: string[]
}

const VC_JOB_TITLES = [
  "General Partner",
  "Managing Partner",
  "Partner",
  "Principal",
  "Investment Partner",
  "Venture Partner",
  "Investment Director",
]

const PE_JOB_TITLES = [
  "Managing Director",
  "Principal",
  "Partner",
  "Investment Director",
  "Vice President",
  "Director",
  "Private Equity",
]

const SEARCH_FUND_JOB_TITLES = [
  "Managing Partner",
  "Principal",
  "Partner",
  "Investment Partner",
  "Operating Partner",
]

const EXCLUDED_JOB_TITLES = ["Limited Partner", "Analyst", "Associate"]

const SEARCH_FUND_TERMS = [
  "search fund",
  "search-fund",
  "eta",
  "entrepreneurship through acquisition",
  "roll-up",
  "rollup",
  "roll up",
  "buy and build",
  "buy-and-build",
  "holdco",
  "holding company",
  "lower middle market",
  "lmm",
  "acquisition platform",
  "micro pe",
]

const PE_TERMS = [
  "private equity",
  "buyout",
  "growth equity",
  "minority stake",
  "portfolio company",
  "add-on acquisition",
]

const AUDIENCE_THESIS: Record<InvestorAudience, string[]> = {
  venture_capital: [],
  private_equity: ["private equity", "buyout", "growth equity"],
  search_fund: ["search fund", "acquisitions", "roll-up"],
}

const DECK_KEYWORD_TO_THESIS: Record<string, string> = {
  "exam technique": "edtech",
  "exam prep": "edtech",
  "exam preparation": "edtech",
  acquisition: "acquisitions",
  acquisitions: "acquisitions",
  "search fund": "search fund",
  edtech: "edtech",
  education: "education",
  fintech: "fintech",
  healthtech: "healthtech",
  saas: "saas",
  marketplace: "marketplace",
  "b2b software": "b2b software",
}

/**
 * Classify the investor audience from deck text (not onboarding alone).
 */
function deckTextBlob(profile: FounderProfile): string {
  const signals = profile.deckSignals
  return [
    signals?.summary ?? "",
    profile.company.oneLiner,
    profile.company.sectorRaw,
    profile.company.businessModelRaw,
    ...(signals?.strengths ?? []),
    ...(signals?.weaknesses ?? []),
    ...(signals?.fundraisingRisks ?? []),
    ...(signals?.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase()
}

export function inferInvestorAudience(profile: FounderProfile): InvestorAudience {
  const haystack = deckTextBlob(profile)

  const consumerProductScore = [
    "exam", "edtech", "education", "student", "learning", "tutoring", "curriculum",
    "b2c", "consumer app", "freemium", "mrr", "saas product",
  ].filter((t) => haystack.includes(t)).length

  let searchScore = 0
  let peScore = 0
  for (const term of SEARCH_FUND_TERMS) {
    if (haystack.includes(term)) searchScore += term.length > 8 ? 2 : 1
  }
  for (const term of PE_TERMS) {
    if (haystack.includes(term)) peScore += 1
  }

  const holdcoModel = profile.company.businessModelRaw.toLowerCase().includes("holdco")
  const acquisitionPlatformScore = [
    "recurring-revenue",
    "recurring revenue",
    "acquisition strategy",
    "capital-efficient acquisition",
    "software acquisition",
    "buyout",
    "portfolio of",
    "micro-acquisition",
    "bolt-on",
  ].filter((t) => haystack.includes(t)).length

  if (consumerProductScore >= 2 && searchScore < 3 && !holdcoModel) return "venture_capital"
  if (profile.company.sector === "EdTech" && searchScore < 3) return "venture_capital"
  if (holdcoModel || searchScore >= 2 || acquisitionPlatformScore >= 2) return "search_fund"
  if (peScore >= 2) return "private_equity"
  return "venture_capital"
}

/**
 * Prefer stage signals from the deck summary / raise size over generic onboarding.
 */
export function inferStageFromDeck(profile: FounderProfile): FounderProfile["company"]["stage"] {
  const summary = (profile.deckSignals?.summary ?? profile.company.oneLiner).toLowerCase()
  const raise = profile.raise.amount

  if (/\bseries\s*a\b/.test(summary) || /\bseries-a\b/.test(summary)) return "series-a"
  if (/\bseries\s*b\b/.test(summary)) return "series-a"
  if (/\bpre[- ]?seed\b/.test(summary)) return "pre-seed"
  if (/\bseed\b/.test(summary) && !/\bseries\b/.test(summary)) return "seed"

  const audience = inferInvestorAudience(profile)
  if (audience !== "venture_capital") {
    if (raise >= 2_000_000) return "series-a"
    if (raise >= 750_000) return "seed"
    return "seed"
  }

  if (raise > 0 && raise < 400_000) return "pre-seed"
  if (raise >= 1_500_000) return "series-a"

  return profile.company.stage
}

function normaliseThesisKeyword(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.length < 3 || trimmed.length > 36) return null

  for (const [needle, thesis] of Object.entries(DECK_KEYWORD_TO_THESIS)) {
    if (trimmed.includes(needle)) return thesis
  }

  if (/^(the|and|with|for|from|their|this|that|overall|while)$/.test(trimmed)) return null
  if (
    /^(coherent|structured|scenario|defined|repeatable|completed|fundraising|business|model|clearly|includes|realistic|complete|mvp|operational)$/.test(
      trimmed
    ) ||
    /^complete mvp$/.test(trimmed)
  ) {
    return null
  }
  return trimmed
}

/**
 * Investor-thesis keywords for Leads Finder (max 3 — OR match on firm bios).
 */
export function buildDeckAwareThesisKeywords(profile: FounderProfile): string[] {
  const audience = inferInvestorAudience(profile)
  const seen = new Set<string>()
  const result: string[] = []

  const add = (raw: string | undefined | null) => {
    if (!raw || result.length >= 3) return
    const thesis = normaliseThesisKeyword(raw)
    if (!thesis || thesis === "other" || seen.has(thesis)) return
    seen.add(thesis)
    result.push(thesis)
  }

  for (const term of AUDIENCE_THESIS[audience]) add(term)
  if (audience === "venture_capital") {
    for (const term of buildInvestorThesisKeywords(profile)) add(term)
  }

  for (const kw of profile.deckSignals?.keywords ?? []) {
    add(kw)
    if (result.length >= 3) break
  }

  if (result.length < 3 && audience === "venture_capital") {
    const summary = profile.deckSignals?.summary ?? ""
    const sectorTerms: Record<FounderProfile["company"]["sector"], string[]> = {
      EdTech: ["edtech", "education technology"],
      FinTech: ["fintech"],
      HealthTech: ["healthtech", "digital health"],
      AI: ["artificial intelligence"],
      SaaS: ["b2b software"],
      Other: [],
    }
    for (const term of sectorTerms[profile.company.sector] ?? []) {
      add(term)
      if (result.length >= 3) break
    }
    if (result.length < 3) {
      const multi = summary.match(/\b(edtech|fintech|healthtech|saas|exam prep|acquisition)\b/gi)
      for (const m of multi ?? []) add(m)
    }
  }

  return result.slice(0, 3)
}

export function buildDeckDiscoveryConfig(profile: FounderProfile): DeckDiscoveryConfig {
  const audience = inferInvestorAudience(profile)
  const stage = inferStageFromDeck(profile)
  const thesisKeywords = buildDeckAwareThesisKeywords(profile)

  const contactJobTitles =
    audience === "search_fund"
      ? SEARCH_FUND_JOB_TITLES
      : audience === "private_equity"
        ? PE_JOB_TITLES
        : VC_JOB_TITLES

  const companyIndustries =
    audience === "venture_capital"
      ? ["venture capital & private equity"]
      : ["venture capital & private equity", "investment management"]

  return {
    audience,
    stage,
    thesisKeywords,
    contactJobTitles,
    contactNotJobTitles: EXCLUDED_JOB_TITLES,
    companyIndustries,
  }
}

/** Stable deck fingerprint for scrape-cache keys (distinct per deck content). */
export function buildDeckDiscoverySignature(profile: FounderProfile): string {
  const config = buildDeckDiscoveryConfig(profile)
  const signals = profile.deckSignals
  const stable = {
    deckId: profile.deckId,
    audience: config.audience,
    stage: config.stage,
    sector: profile.company.sector,
    businessModelRaw: profile.company.businessModelRaw,
    thesisKeywords: config.thesisKeywords,
    summary: signals?.summary?.slice(0, 400) ?? "",
    deckKeywords: signals?.keywords ?? [],
  }
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 16)
}

/** Sector + deck keywords for prefilter scoring. */
export function buildDeckAwareSectorTerms(profile: FounderProfile): string[] {
  const terms = new Set<string>()
  const add = (s: string | undefined) => {
    const t = s?.trim().toLowerCase()
    if (t && t.length > 2) terms.add(t)
  }

  add(profile.company.sector)
  add(profile.company.subSector)
  add(profile.company.sectorRaw)
  add(profile.company.businessModelRaw)

  const config = buildDeckDiscoveryConfig(profile)
  for (const kw of config.thesisKeywords) add(kw)
  for (const kw of profile.deckSignals?.keywords ?? []) {
    const mapped = normaliseThesisKeyword(kw)
    if (mapped) add(mapped)
  }

  return [...terms]
}
