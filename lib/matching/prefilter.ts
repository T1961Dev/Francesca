import type { JohnVCFirm } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"

type PrefilterFirm = JohnVCFirm & {
  recentDealCount?: number
  recentDealCompanies?: Array<{ name: string; stage?: string; date?: string }>
}

export function prefilterFirms(firms: PrefilterFirm[], profile: FounderProfile, limit = 80) {
  return firms
    .filter((firm) => firm.Firm_Name && firm.Firm_Name !== "Unknown firm")
    .map((firm) => ({ firm, score: scoreFirm(firm, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ firm }) => firm)
}

function scoreFirm(firm: PrefilterFirm, profile: FounderProfile) {
  let score = 0

  if (firm.Country === profile.company.geography) score += 30
  else if (firm.Country === "United States") score += 10

  score += Math.min((firm.recentDealCount ?? 0) * 15, 60)

  const stageMap: Record<FounderProfile["company"]["stage"], string[]> = {
    "pre-seed": ["Pre-Seed", "Seed"],
    seed: ["Seed", "Series A"],
    "series-a": ["Series A", "Series B"],
  }
  const wantedStages = stageMap[profile.company.stage]
  if (firm.Investment_Stages.some((stage) => wantedStages.includes(stage))) score += 20

  const sectorKeywords = [
    profile.company.sector,
    profile.company.subSector,
    profile.company.businessModel,
  ]
    .join(" ")
    .toLowerCase()
    .split(/[\s/-]+/)
    .filter((keyword) => keyword.length > 2)
  const focusText = firm.Focus_Areas.join(" ").toLowerCase()

  if (sectorKeywords.some((keyword) => focusText.includes(keyword))) score += 25

  return score
}
