import {
  buildDeckAwareSectorTerms,
  inferInvestorAudience,
} from "@/lib/matching/deck-discovery"
import { normaliseFounderGeographyForRanking } from "@/lib/apify/leads-finder-locations"
import {
  buildCompanySpecificThesisKeywords,
  classifyInvestorRegion,
  founderDiscoveryRegions,
  founderWantsWorldwide,
} from "@/lib/matching/investor-fit"
import type { LeadsFinderContact } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"

const VC_FIRM_PATTERN =
  /\b(ventures?|capital|partners?|vc\b|private equity|investment|fund|angels?)\b/i

const EXCLUDED_FIRM_PATTERN =
  /\b(bank of|barclays|hsbc|lloyds|goldman|morgan stanley|jpmorgan|consulting|deloitte|pwc|kpmg|ey\b|accenture)\b/i

const TITLE_SENIORITY: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /\bgeneral partner\b/i, score: 30 },
  { pattern: /\bmanaging partner\b/i, score: 28 },
  { pattern: /\bventure partner\b/i, score: 22 },
  { pattern: /\binvestment director\b/i, score: 20 },
  { pattern: /\bprincipal\b/i, score: 18 },
  { pattern: /\bpartner\b/i, score: 16 },
  { pattern: /\bangel\b/i, score: 12 },
]

export function preFilterPeople(
  leads: LeadsFinderContact[],
  profile: FounderProfile,
  limit: number
): LeadsFinderContact[] {
  const geo = normaliseFounderGeographyForRanking(profile.company.geography)
  const audience = inferInvestorAudience(profile)
  const sectorKeywords = [
    ...buildCompanySpecificThesisKeywords(profile, 8),
    ...buildDeckAwareSectorTerms(profile),
  ]
  const preferredRegions = founderDiscoveryRegions(profile)

  const scored = leads
    .filter((lead) => {
      const email = lead.email?.trim()
      const firm = lead.company_name?.trim()
      if (!email || !firm) return false

      const industry = `${lead.industry ?? ""} ${lead.company_description ?? ""}`.toLowerCase()
      const isInvestorIndustry =
        industry.includes("venture") ||
        industry.includes("private equity") ||
        industry.includes("investment") ||
        (audience !== "venture_capital" && industry.includes("capital"))
      const firmLooksInvestor =
        VC_FIRM_PATTERN.test(firm) ||
        (audience === "search_fund" && /\b(search|acquisition|holdco)\b/i.test(firm))
      if (!isInvestorIndustry && !firmLooksInvestor) return false
      if (EXCLUDED_FIRM_PATTERN.test(firm)) return false

      return true
    })
    .map((lead) => ({ lead, score: scoreLead(lead, profile, geo, sectorKeywords, preferredRegions) }))
    .sort((a, b) => b.score - a.score)

  return selectRegionAwareLeads(scored, profile, limit).map(({ lead }) => lead)
}

function selectRegionAwareLeads(
  scored: Array<{ lead: LeadsFinderContact; score: number }>,
  profile: FounderProfile,
  limit: number
) {
  if (!founderWantsWorldwide(profile) || limit < 6) {
    return scored.slice(0, limit)
  }

  const selected: typeof scored = []
  const used = new Set<string>()
  const floorPerRegion = Math.max(2, Math.floor(limit * 0.16))

  const keyFor = (lead: LeadsFinderContact) =>
    lead.email?.trim().toLowerCase() ||
    lead.linkedin?.trim().toLowerCase() ||
    `${lead.full_name ?? ""}:${lead.company_name ?? ""}`.toLowerCase()
  const add = (item: (typeof scored)[number]) => {
    const key = keyFor(item.lead)
    if (!key || used.has(key)) return false
    selected.push(item)
    used.add(key)
    return true
  }

  for (const region of ["UK", "Europe", "US"] as const) {
    let count = 0
    for (const item of scored) {
      if (selected.length >= limit || count >= floorPerRegion) break
      const leadRegion = classifyInvestorRegion(item.lead.company_country ?? item.lead.country ?? "")
      if (leadRegion !== region) continue
      if (add(item)) count += 1
    }
  }

  for (const item of scored) {
    if (selected.length >= limit) break
    add(item)
  }

  return selected.slice(0, limit)
}

function scoreLead(
  lead: LeadsFinderContact,
  profile: FounderProfile,
  geo: string | null,
  sectorKeywords: string[],
  preferredRegions: ReturnType<typeof founderDiscoveryRegions>
) {
  let score = 0
  const title = lead.job_title ?? ""
  for (const { pattern, score: pts } of TITLE_SENIORITY) {
    if (pattern.test(title)) {
      score += pts
      break
    }
  }

  const leadGeo = `${lead.country ?? ""} ${lead.company_country ?? ""}`.toLowerCase()
  const leadRegion = classifyInvestorRegion(lead.company_country ?? lead.country ?? "")
  if (geo) {
    if (leadGeo.includes(geo)) score += 25
    else if (leadGeo.includes("united kingdom") && geo.includes("united kingdom")) score += 20
  }
  if (preferredRegions.includes(leadRegion)) {
    score += leadRegion === "UK" ? 25 : leadRegion === "Europe" ? 20 : leadRegion === "US" ? 10 : 6
  }

  const focusText = [
    lead.industry,
    lead.company_description,
    ...(Array.isArray(lead.keywords) ? lead.keywords : lead.keywords ? [lead.keywords] : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const sectorMatches = sectorKeywords.filter((kw) => focusText.includes(kw.toLowerCase()))
  if (sectorMatches.length >= 2) score += 35
  else if (sectorMatches.length === 1) score += 22
  else score -= 15

  const stageMap: Record<FounderProfile["company"]["stage"], string[]> = {
    "pre-seed": ["pre-seed", "pre seed", "seed"],
    seed: ["seed", "series a"],
    "series-a": ["series a", "series b"],
  }
  const wanted = stageMap[profile.company.stage]
  if (wanted.some((s) => focusText.includes(s))) score += 10

  if (/\b(venture capital|private equity|startup|founders|early stage)\b/i.test(focusText) && sectorMatches.length === 0) {
    score -= 10
  }

  return score
}
