import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import type { MergedFirm } from "@/lib/matching/merge"
import type { LinkedInPost } from "@/types/apify"
import type { InvestorMatch } from "@/types/profile"

type RankedMatch = Omit<InvestorMatch, "rank" | "outreachEmail">

/**
 * Top up GPT ranking to the plan cap using the next-best enriched firms.
 * Rationales mention deck context lightly but flag lower confidence — no
 * generic "outside AI top picks" boilerplate when avoidable.
 */
export function backfillRankedMatches({
  ranked,
  firms,
  linkedinPosts,
  targetMatchCount,
  deckSummary,
  limitedData,
}: {
  ranked: RankedMatch[]
  firms: MergedFirm[]
  linkedinPosts: LinkedInPost[]
  targetMatchCount: number
  deckSummary: string
  limitedData: boolean
}): RankedMatch[] {
  if (ranked.length >= targetMatchCount) return ranked.slice(0, targetMatchCount)

  const usedPartners = new Set(
    ranked.map((m) => m.partner.linkedin.trim().toLowerCase()).filter(Boolean)
  )
  const usedFirms = new Set(ranked.map((m) => m.firm.name.trim().toLowerCase()))

  const fillers: RankedMatch[] = []
  const deckSnippet = deckSummary.slice(0, 120)

  for (const firm of firms) {
    if (ranked.length + fillers.length >= targetMatchCount) break
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

    const focus = firm.Focus_Areas.slice(0, 2).join(" / ") || "venture"
    const stage = firm.Investment_Stages[0] ?? "early-stage"

    fillers.push({
      fitScore: Math.max(32, 48 - fillers.length),
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
      matchRationale: `Secondary pick: ${firm.Firm_Name} focuses on ${focus} at ${stage} stage (${firm.Country || "unknown geo"}). Your deck (${deckSnippet}${deckSummary.length > 120 ? "…" : ""}) suggests plausible overlap on sector or stage, though they ranked below the strongest fits — review their portfolio before outreach.`,
      recentLinkedInSignals: signals,
      limitedData: limitedData || true,
    })

    usedFirms.add(firm.Firm_Name.trim().toLowerCase())
    usedPartners.add(partnerLinkedIn.trim().toLowerCase())
  }

  return [...ranked, ...fillers].slice(0, targetMatchCount)
}
