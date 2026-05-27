import "server-only"

import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import { getOpenAIClient } from "@/lib/openai/client"
import type { MergedFirm } from "@/lib/matching/merge"
import type { LinkedInPost } from "@/types/apify"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

const RankingSchema = z.object({
  matches: z.array(
    z.object({
      fitScore: z.number().min(0).max(100),
      firm: z.object({
        name: z.string(),
        website: z.string().nullable(),
        linkedin: z.string().nullable(),
        type: z.string(),
        country: z.string(),
        focusAreas: z.array(z.string()),
        investmentStages: z.array(z.string()),
        recentInvestments: z.array(
          z.object({
            company: z.string(),
            stage: z.string(),
            amount: z.string().nullable(),
            announcedDate: z.string(),
          })
        ),
      }),
      partner: z.object({
        name: z.string(),
        title: z.string(),
        email: z.string().nullable(),
        linkedin: z.string(),
      }),
      matchRationale: z.string(),
      recentLinkedInSignals: z.array(
        z.object({
          postText: z.string(),
          postedAt: z.string(),
          relevance: z.enum(["high", "medium", "low"]),
        })
      ),
    })
  ).max(25),
})

export async function rankInvestorsWithGPT({
  profile,
  firms,
  partnerSignals,
  limitedData = false,
}: {
  profile: FounderProfile
  firms: MergedFirm[]
  partnerSignals: LinkedInPost[]
  limitedData?: boolean
}): Promise<Array<Omit<InvestorMatch, "rank" | "outreachEmail">>> {
  const candidates = firms.flatMap((firm) =>
    firm.Contacts.slice(0, 3)
      .filter((contact) => Boolean(contact.Name && contact.Email))
      .map((contact) => {
        const partnerLinkedIn = normaliseLinkedInUrl(contact.LinkedIn) ?? ""
        const signals = partnerSignals
          .filter((signal) => normaliseLinkedInUrl(signal.profileUrl) === partnerLinkedIn)
          .slice(0, 10)

        return {
          firmName: firm.Firm_Name,
          firmType: firm.Firm_Type,
          firmCountry: firm.Country,
          firmFocusAreas: firm.Focus_Areas,
          firmStages: firm.Investment_Stages,
          firmWebsite: firm.Website,
          firmLinkedIn: firm.LinkedIn,
          recentDealCompanies: firm.recentDealCompanies,
          partnerName: contact.Name,
          partnerTitle: contact.Title,
          partnerEmail: contact.Email,
          partnerLinkedIn,
          recentPosts: signals.map((signal) => ({
            text: signal.postText,
            date: signal.postedAt,
          })),
        }
      })
  )

  const openai = getOpenAIClient()
  const response = await openai.responses.parse({
    model: process.env.OPENAI_INVESTOR_RANKING_MODEL?.trim() || "gpt-4o",
    input: [
      {
        role: "system",
        content:
          "You are an expert venture capital analyst. Score investor-founder fit using sector, stage, geography, recent deal velocity, partner activity, and contact quality. Return JSON only. Return the top 25 candidates by fitScore, descending. Rationale must be specific to the partner and founder, reference real supplied signals where available, and avoid generic VC cliches. Never say perfect fit or great match.",
      },
      {
        role: "user",
        content: JSON.stringify({
          founder: profile,
          candidates,
          limitedData,
        }),
      },
    ],
    text: {
      format: zodTextFormat(RankingSchema, "investor_ranking"),
    },
  })

  if (!response.output_parsed) {
    throw new Error("OpenAI returned empty investor ranking")
  }

  return response.output_parsed.matches.map((match) => ({
    fitScore: match.fitScore,
    firm: {
      ...match.firm,
      website: match.firm.website ?? undefined,
      linkedin: match.firm.linkedin ?? undefined,
      recentInvestments: match.firm.recentInvestments.map((investment) => ({
        ...investment,
        amount: investment.amount ?? undefined,
      })),
    },
    partner: {
      ...match.partner,
      email: match.partner.email ?? undefined,
    },
    matchRationale: match.matchRationale,
    recentLinkedInSignals: match.recentLinkedInSignals,
    limitedData,
  }))
}
