import "server-only"

import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import { loadPrompt } from "@/lib/matching/loadPrompt"
import {
  applyFitAssessmentToMatch,
  scoreFirmForProfile,
} from "@/lib/matching/investor-fit"
import { getOpenAIClient } from "@/lib/openai/client"
import type { MergedFirm } from "@/lib/matching/merge"
import type { LinkedInPost } from "@/types/apify"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

/**
 * Hard upper bound on candidates returned by the model. The product target is
 * 25 ranked investors per run, so this just acts as a safety net.
 */
const RANKER_SCHEMA_MAX = 60

const RankedItemSchema = z.object({
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
  matchRationale: z.string().max(600),
  recentLinkedInSignals: z.array(
    z.object({
      postText: z.string().max(400),
      postedAt: z.string(),
      relevance: z.enum(["high", "medium", "low"]),
    })
  ).max(3),
})

const RankingSchema = z.object({
  rankedCandidates: z.array(RankedItemSchema).max(RANKER_SCHEMA_MAX),
})

type RankedItem = z.infer<typeof RankedItemSchema>

export async function rankInvestorsWithGPT({
  profile,
  firms,
  partnerSignals,
  limitedData = false,
  targetMatchCount = 25,
}: {
  profile: FounderProfile
  firms: MergedFirm[]
  partnerSignals: LinkedInPost[]
  limitedData?: boolean
  /**
   * Product cap. The prompt instructs the model to return exactly this many
   * when the pool is large enough.
   */
  targetMatchCount?: number
}): Promise<Array<Omit<InvestorMatch, "rank" | "outreachEmail">>> {
  const candidates = firms.flatMap((firm) =>
    firm.Contacts.slice(0, 4)
      .filter((contact) => Boolean(contact.Name && contact.Email))
      .map((contact) => {
        const partnerLinkedIn = normaliseLinkedInUrl(contact.LinkedIn) ?? ""
        const deterministicFit = scoreFirmForProfile(firm, profile)
        const signals = partnerSignals
          .filter((signal) => normaliseLinkedInUrl(signal.profileUrl) === partnerLinkedIn)
          .slice(0, 2)

        return {
          firmName: firm.Firm_Name,
          firmType: firm.Firm_Type,
          firmCountry: firm.Country,
          firmFocusAreas: firm.Focus_Areas,
          firmStages: firm.Investment_Stages,
          firmWebsite: firm.Website,
          firmLinkedIn: firm.LinkedIn,
          recentDealCompanies: firm.recentDealCompanies,
          deterministicFit: {
            score: deterministicFit.score,
            facets: deterministicFit.facets,
            penalties: deterministicFit.penalties,
            chequeFit: deterministicFit.chequeFit,
            chequeSize: deterministicFit.chequeSize ?? null,
            region: deterministicFit.region,
            vertical: deterministicFit.vertical,
            sectorEvidence: deterministicFit.evidence.sector,
            isGeneralist: deterministicFit.isGeneralist,
            isSectorSpecialist: deterministicFit.isSectorSpecialist,
          },
          partnerName: contact.Name,
          partnerTitle: contact.Title,
          partnerEmail: contact.Email,
          partnerLinkedIn,
          recentPosts: signals.map((signal) => ({
            text: signal.postText.slice(0, 280),
            date: signal.postedAt,
          })),
        }
      })
  )

  const firmLookup = buildFirmLookup(firms)
  const founderPayload = buildFounderPayload(profile)
  // Cap = exact plan target. We tell the model to return exactly `cap`
  // entries; anything fewer is topped up by `backfillFromShortlist` in the
  // pipeline so the user always sees their plan's full match count.
  const cap = Math.max(1, Math.min(targetMatchCount, RANKER_SCHEMA_MAX))
  const achievable = Math.min(cap, candidates.length)
  console.log(
    `[rank] candidates=${candidates.length} firms=${firms.length} requestedCap=${cap} achievable=${achievable}`
  )

  const systemPrompt = await loadPrompt("scoreInvestor.md").catch(() => RANKER_SYSTEM_PROMPT)

  const openai = getOpenAIClient()
  const model = process.env.OPENAI_INVESTOR_RANKING_MODEL?.trim() || "gpt-4o"
  const userPayload = JSON.stringify({
    founder: founderPayload,
    candidates,
    limitedData,
    requestedMatchCount: cap,
    achievableMatchCount: achievable,
    candidatePoolSize: candidates.length,
  })

  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await openai.responses.parse({
        model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPayload },
        ],
        text: {
          format: zodTextFormat(RankingSchema, "investor_ranking"),
        },
      })

      if (!response.output_parsed) {
        throw new Error("OpenAI returned empty investor ranking")
      }

      return response.output_parsed.rankedCandidates
        .slice(0, cap)
        .map((match) => {
          const hydrated = hydrateRankedMatchFromSource(match, firmLookup)
          return applyFitAssessmentToMatch(
            {
              ...hydrated,
              limitedData,
            },
            profile
          )
        })
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      const retryable =
        message.includes("Unterminated string") ||
        message.includes("JSON") ||
        message.includes("empty investor ranking")
      console.warn(`[rank] attempt ${attempt} failed`, message.slice(0, 200))
      if (!retryable || attempt === 2) break
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Investor ranking failed")
}

function buildFirmLookup(firms: MergedFirm[]) {
  const lookup = new Map<string, MergedFirm>()
  for (const firm of firms) {
    const key = normaliseFirmKey(firm.Firm_Name)
    if (key && !lookup.has(key)) lookup.set(key, firm)
  }
  return lookup
}

function hydrateRankedMatchFromSource(
  match: RankedItem,
  firmLookup: Map<string, MergedFirm>
): Omit<InvestorMatch, "rank" | "outreachEmail"> {
  const sourceFirm = firmLookup.get(normaliseFirmKey(match.firm.name))
  const sourceContact = sourceFirm ? findSourceContact(sourceFirm, match) : null

  if (!sourceFirm) {
    return {
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
    }
  }

  return {
    fitScore: match.fitScore,
    firm: {
      name: sourceFirm.Firm_Name,
      website: sourceFirm.Website,
      linkedin: sourceFirm.LinkedIn,
      type: sourceFirm.Firm_Type || match.firm.type || "Venture Capital Investor",
      country: sourceFirm.Country || match.firm.country,
      focusAreas: sourceFirm.Focus_Areas,
      investmentStages: sourceFirm.Investment_Stages,
      recentInvestments: (sourceFirm.recentDealCompanies ?? []).slice(0, 3).map((investment) => ({
        company: investment.name,
        stage: investment.stage ?? "Unknown",
        announcedDate: investment.date ?? "",
      })),
    },
    partner: sourceContact
      ? {
          name: sourceContact.Name,
          title: sourceContact.Title || match.partner.title || "Investor",
          email: sourceContact.Email ?? match.partner.email ?? undefined,
          linkedin: sourceContact.LinkedIn ?? match.partner.linkedin,
        }
      : {
          ...match.partner,
          email: match.partner.email ?? undefined,
        },
    matchRationale: match.matchRationale,
    recentLinkedInSignals: match.recentLinkedInSignals,
  }
}

function findSourceContact(firm: MergedFirm, match: RankedItem) {
  const targetLinkedIn = normaliseLinkedInUrl(match.partner.linkedin)
  const targetEmail = match.partner.email?.trim().toLowerCase()
  const targetName = normalisePersonKey(match.partner.name)

  return (
    firm.Contacts.find((contact) => {
      const contactLinkedIn = normaliseLinkedInUrl(contact.LinkedIn)
      return Boolean(targetLinkedIn && contactLinkedIn === targetLinkedIn)
    }) ??
    firm.Contacts.find((contact) => {
      return Boolean(targetEmail && contact.Email?.trim().toLowerCase() === targetEmail)
    }) ??
    firm.Contacts.find((contact) => {
      return Boolean(targetName && normalisePersonKey(contact.Name) === targetName)
    }) ??
    firm.Contacts.find((contact) => Boolean(contact.Name && contact.Email)) ??
    firm.Contacts[0] ??
    null
  )
}

function normaliseFirmKey(name: string | null | undefined) {
  return (name ?? "")
    .toLowerCase()
    .replace(/\b(ltd|llp|llc|inc|capital|ventures?|partners?|fund|management)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

function normalisePersonKey(name: string | null | undefined) {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

const RANKER_SYSTEM_PROMPT = `You are an expert venture capital analyst ranking investors for one specific founder.

Return JSON only in rankedCandidates. Return exactly achievableMatchCount entries when the pool is large enough.

Use deterministicFit as guardrails. Sector/thesis fit is 35%, stage 20%, geography 15%, cheque 10%, business model 10%, traction/raise 5%, evidence quality 5%.

Down-rank generic broad funds with no vertical evidence, unknown sector evidence, wrong geography without a global mandate, unknown cheque size, and weak evidence. Unknown cheque size must never be scored as strong.

ClimateTech/carbon accounting, fintech infrastructure, HealthTech, consumer social, and AI workflow SaaS are different categories. Do not treat them all as generic SaaS.

Rationales must include one concrete startup fact, one concrete investor evidence point, a clear fit reason, and a caveat where relevant. Never use generic VC cliches such as "perfect fit", "great match", "aligns with our vision", "strong network", or "excited to connect". Do not invent facts.`

function buildFounderPayload(profile: FounderProfile) {
  const signals = profile.deckSignals
  return {
    company: {
      name: profile.company.name,
      oneLiner: profile.company.oneLiner,
      sectorBucket: profile.company.sector,
      sectorRaw: profile.company.sectorRaw,
      subSector: profile.company.subSector,
      businessModelBucket: profile.company.businessModel,
      businessModelRaw: profile.company.businessModelRaw,
      stage: profile.company.stage,
      geography: profile.company.geography,
    },
    traction: profile.traction,
    team: profile.team,
    raise: profile.raise,
    deck: signals
      ? {
          overallScore: signals.overallScore,
          summary: signals.summary,
          categoryScores: signals.categoryScores,
          financialSignals: signals.financialSignals ?? null,
          strengths: signals.strengths,
          weaknesses: signals.weaknesses,
          missingSections: signals.missingSections,
          priorityActions: signals.priorityActions,
          fundraisingRisks: signals.fundraisingRisks,
          investorReadiness: signals.investorReadiness,
          keywords: signals.keywords,
        }
      : null,
    financialModel: profile.financialContext ?? null,
  }
}
