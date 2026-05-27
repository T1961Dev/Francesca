import type { InvestorMatch } from "@/types/profile"

export function toStoredMatch(match: InvestorMatch, generatedAt: string) {
  return {
    rank: match.rank,
    fitScore: match.fitScore,
    matchScore: match.fitScore,
    investorName: match.partner.name,
    firmName: match.firm.name,
    role: match.partner.title,
    linkedinUrl: match.partner.linkedin,
    email: match.partner.email ?? null,
    website: match.firm.website ?? null,
    location: match.firm.country,
    investmentStage: match.firm.investmentStages.join(", "),
    investmentStages: match.firm.investmentStages,
    sectorFocus: match.firm.focusAreas,
    matchRationale: match.matchRationale,
    whyThisInvestor: match.matchRationale,
    whyNow: match.recentLinkedInSignals[0]?.postText ?? "Recent fit based on firm focus, stage, geography, and LinkedIn activity.",
    suggestedAngle: match.outreachEmail.subject,
    outreachSubject: match.outreachEmail.subject,
    outreachBody: match.outreachEmail.body,
    outreachGeneratedAt: generatedAt,
    outreachUpdatedAt: generatedAt,
    outreachSource: "ai",
    outreachImprovements: null,
    recentLinkedInSignals: match.recentLinkedInSignals,
    recentInvestments: match.firm.recentInvestments,
    firm: match.firm,
    partner: match.partner,
    limitedData: Boolean(match.limitedData),
  }
}
