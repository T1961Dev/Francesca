import type { JohnVCFirm } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"
import { scoreFirmForProfile } from "@/lib/matching/investor-fit"

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
  return scoreFirmForProfile(
    {
      ...firm,
      recentDealCount: firm.recentDealCount ?? 0,
      recentDealCompanies: firm.recentDealCompanies ?? [],
    },
    profile
  ).score
}
