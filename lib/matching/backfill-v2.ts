import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import {
  composeEvidenceBasedRationale,
  scoreFirmForProfile,
} from "@/lib/matching/investor-fit"
import type { MergedFirm } from "@/lib/matching/merge"
import type { LinkedInPost } from "@/types/apify"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

type RankedMatch = Omit<InvestorMatch, "rank" | "outreachEmail" | "outreachSequence">

/**
 * Top up GPT ranking to the plan cap using deterministic fit scoring.
 * Fillers remain lower-confidence, but they must still carry real sector,
 * stage, geography, cheque, and evidence caveats rather than generic copy.
 */
export function backfillRankedMatches({
  ranked,
  firms,
  linkedinPosts,
  targetMatchCount,
  deckSummary,
  limitedData,
  profile,
  candidatePoolSize,
}: {
  ranked: RankedMatch[]
  firms: MergedFirm[]
  linkedinPosts: LinkedInPost[]
  targetMatchCount: number
  deckSummary: string
  limitedData: boolean
  profile: FounderProfile
  candidatePoolSize?: number
}): RankedMatch[] {
  const usedPartners = new Set(
    ranked.map((m) => m.partner.linkedin.trim().toLowerCase()).filter(Boolean)
  )
  const usedFirms = new Set(ranked.map((m) => m.firm.name.trim().toLowerCase()))
  const deckSnippet = deckSummary.slice(0, 120)
  const outputLimit = Math.max(targetMatchCount, candidatePoolSize ?? targetMatchCount)

  const scoredFirms = firms
    .map((firm) => ({ firm, assessment: scoreFirmForProfile(firm, profile) }))
    .sort((a, b) => b.assessment.score - a.assessment.score)

  const fillers: RankedMatch[] = []

  for (const { firm, assessment } of scoredFirms) {
    if (ranked.length + fillers.length >= outputLimit) break
    if (usedFirms.has(firm.Firm_Name.trim().toLowerCase())) continue

    const contact = firm.Contacts.find(
      (c) =>
        c.Name &&
        c.Email &&
        !usedPartners.has((c.LinkedIn ?? "").trim().toLowerCase())
    )
    if (!contact) continue

    const partnerLinkedIn = contact.LinkedIn ?? ""
    const signals = linkedinPosts
      .filter((p) => normaliseLinkedInUrl(p.profileUrl) === normaliseLinkedInUrl(partnerLinkedIn))
      .slice(0, 2)
      .map((post) => ({
        postText: post.postText,
        postedAt: post.postedAt,
        relevance: "low" as const,
      }))

    const filler: RankedMatch = {
      fitScore: assessment.score,
      firm: {
        name: firm.Firm_Name,
        website: firm.Website,
        linkedin: firm.LinkedIn,
        type: firm.Firm_Type || "Venture Capital",
        country: firm.Country,
        focusAreas: firm.Focus_Areas,
        investmentStages: firm.Investment_Stages,
        recentInvestments: (firm.recentDealCompanies ?? []).slice(0, 3).map((d) => ({
          company: d.name,
          stage: d.stage ?? "Unknown",
          announcedDate: d.date ?? "",
        })),
      },
      partner: {
        name: contact.Name,
        title: contact.Title ?? "Partner",
        email: contact.Email ?? undefined,
        linkedin: partnerLinkedIn,
      },
      matchRationale: "",
      recentLinkedInSignals: signals,
      chequeFit: assessment.chequeFit,
      chequeSize: assessment.chequeSize,
      fitBreakdown: assessment.facets,
      limitedData: limitedData || true,
    }

    filler.matchRationale = composeEvidenceBasedRationale(profile, filler, assessment)
    if (assessment.score < 35 && deckSnippet) {
      filler.matchRationale = `${filler.matchRationale} Deck context used: ${deckSnippet}${deckSummary.length > 120 ? "..." : ""}`.slice(0, 600)
    }

    fillers.push(filler)
    usedFirms.add(firm.Firm_Name.trim().toLowerCase())
    usedPartners.add(partnerLinkedIn.trim().toLowerCase())
  }

  return [...ranked, ...fillers]
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, outputLimit)
}
