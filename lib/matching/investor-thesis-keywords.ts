import type { FounderProfile } from "@/types/profile"

/**
 * Keywords for VC firm / investor discovery (Apollo, Leads Finder).
 * Matched against investor firm descriptions — NOT founder deck buzzwords.
 */
const SECTOR_THESIS_KEYWORDS: Record<FounderProfile["company"]["sector"], string[]> = {
  EdTech: ["edtech", "education"],
  FinTech: ["fintech", "financial services", "lending", "banking infrastructure"],
  SaaS: ["saas", "b2b software", "enterprise software"],
  HealthTech: ["healthtech", "digital health", "healthcare"],
  AI: ["artificial intelligence", "ai", "workflow automation"],
  Other: [],
}

export function buildInvestorThesisKeywords(profile: FounderProfile): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  const add = (raw: string | undefined | null) => {
    if (!raw) return
    const trimmed = raw.trim()
    if (trimmed.length < 2 || trimmed.length > 40) return
    const lower = trimmed.toLowerCase()
    if (seen.has(lower)) return
    seen.add(lower)
    result.push(trimmed)
  }

  for (const term of rawVerticalTerms(profile)) {
    add(term)
    if (result.length >= 3) return result
  }

  for (const term of SECTOR_THESIS_KEYWORDS[profile.company.sector] ?? []) {
    add(term)
    if (result.length >= 3) return result
  }

  if (result.length === 0) {
    add(profile.company.sectorRaw)
    add(profile.company.subSector)
  }

  return result
    .filter((k) => k.toLowerCase() !== "other")
    .slice(0, 3)
}

function rawVerticalTerms(profile: FounderProfile): string[] {
  const haystack = [
    profile.company.sectorRaw,
    profile.company.subSector,
    profile.company.businessModelRaw,
    profile.company.oneLiner,
    profile.deckSignals?.summary ?? "",
  ]
    .join(" ")
    .toLowerCase()

  if (/\b(climatetech|climate|carbon|emissions|sustainability|esg)\b/.test(haystack)) {
    return ["climatetech", "carbon accounting", "climate software"]
  }
  if (/\b(consumer|social|gen z|events|community)\b/.test(haystack)) {
    return ["consumer social", "consumer app", "community"]
  }
  if (/\b(lending|bank data|banking api|fintech infrastructure)\b/.test(haystack)) {
    return ["fintech infrastructure", "lending API", "financial services"]
  }
  if (/\b(clinic|clinical|patient|private clinics|healthcare saas)\b/.test(haystack)) {
    return ["healthcare SaaS", "clinic software", "digital health"]
  }
  if (/\b(workflow automation|productivity|operations)\b/.test(haystack)) {
    return ["workflow automation", "AI productivity", "B2B SaaS"]
  }

  return []
}
