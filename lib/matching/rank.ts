import "server-only"

import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import { loadPrompt } from "@/lib/matching/loadPrompt"
import { getOpenAIClient } from "@/lib/openai/client"
import type { MergedFirm } from "@/lib/matching/merge"
import type { LinkedInPost } from "@/types/apify"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

/**
 * Hard upper bound on candidates returned by the model. The plan-driven
 * cap (Pro = 35, Lifetime = 50) is always far below this, so the schema
 * just acts as a safety net for runaway outputs.
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

export async function rankInvestorsWithGPT({
  profile,
  firms,
  partnerSignals,
  limitedData = false,
  targetMatchCount = 35,
}: {
  profile: FounderProfile
  firms: MergedFirm[]
  partnerSignals: LinkedInPost[]
  limitedData?: boolean
  /**
   * Plan-driven cap. The prompt instructs the model to return AT LEAST 25 and
   * UP TO this many; the result is then sliced to this length so the caller
   * never receives more than the plan allows.
   */
  targetMatchCount?: number
}): Promise<Array<Omit<InvestorMatch, "rank" | "outreachEmail">>> {
  const candidates = firms.flatMap((firm) =>
    firm.Contacts.slice(0, 4)
      .filter((contact) => Boolean(contact.Name && contact.Email))
      .map((contact) => {
        const partnerLinkedIn = normaliseLinkedInUrl(contact.LinkedIn) ?? ""
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
        .map((match) => ({
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

const RANKER_SYSTEM_PROMPT = `You are an expert venture capital analyst running a SORT operation, not a filter operation.

The pipeline has already done the filtering. Your input is a small, pre-curated pool of investors (\`candidatePoolSize\`). Your job is to rank them — every one of them — and return the top \`achievableMatchCount\` by fitScore. Think of it like sorting a deck of cards: every card must go somewhere; you don't throw away the low cards.

Hard requirements:
- Return JSON only.
- The \`rankedCandidates\` array MUST have EXACTLY \`achievableMatchCount\` entries. If your output has fewer, the pipeline rejects it and uses a worse fallback heuristic — you lose the chance to surface partners YOU think are best.
- Even mediocre fits MUST appear in the output, just with a lower fitScore. Sectors that don't perfectly match a partner's thesis are not grounds to exclude; we want partners whose adjacent thesis or geography overlap could still spark interest.
- Use the full 0-100 score range so the founder can see relative strength:
    90-100: exceptional thesis + stage + geography alignment
    70-89: strong overlap on 2+ dimensions
    50-69: plausible overlap on 1-2 dimensions
    30-49: weaker but reachable; still worth surfacing
    Avoid clustering — spread scores across this range.

How to score (in priority order):
1. Sector and sub-sector overlap. Read the founder's raw sector + deck summary, not just the enum bucket. A holdco/search-fund deck does NOT match a generic SaaS VC.
2. Stage match (the founder's stage vs the partner's typical stage).
3. Geography overlap.
4. Founder-specific deck signals (overall score, strengths, weaknesses, missing sections, fundraising risks).
5. Firm's recent deal velocity.
6. Partner's recent LinkedIn activity and title.

Output structure:
- Each entry must have a unique \`partnerLinkedIn\` (no duplicates).
- The \`matchRationale\` must be 2-4 sentences, specific to THIS partner AND THIS founder. Reference at least one concrete detail from the founder's deck (a strength, a category score, a sector phrase) AND at least one concrete detail from the investor's supplied data (firm focus, recent deal, post excerpt, geography).
- Never use "perfect fit", "great match", "aligns with our vision", "passionate about", "excited to connect", or other VC cliches.
- Two different founder decks must produce visibly different rationales for the same investor.`

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
