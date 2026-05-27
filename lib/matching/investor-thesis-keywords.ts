import type { FounderProfile } from "@/types/profile"

/**
 * Keywords for VC firm / investor discovery (Apollo, Leads Finder).
 * Matched against investor firm descriptions — NOT founder deck buzzwords.
 */
const SECTOR_THESIS_KEYWORDS: Record<FounderProfile["company"]["sector"], string[]> = {
  EdTech: ["edtech", "education"],
  FinTech: ["fintech", "financial services"],
  SaaS: ["saas", "b2b software"],
  HealthTech: ["healthtech", "digital health"],
  AI: ["artificial intelligence", "ai"],
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
