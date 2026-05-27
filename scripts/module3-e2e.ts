/**
 * Module 3 end-to-end test.
 *
 * Runs the FULL production pipeline against two materially different pitch
 * decks (without touching Supabase) and prints the actual investor matches,
 * fit scores, rationales, and outreach emails. Verifies that the two decks
 * receive distinct, deck-tailored results.
 *
 * Stages exercised:
 *   1. PDF text extraction
 *   2. OpenAI deck analysis (`analyseDeckText`)
 *   3. FounderProfile build + cache key + Leads Finder input
 *   4. Apify Leads Finder discovery (`discoverVCPartners`)
 *   5. Group leads → firms (`groupLeadsIntoFirms`)
 *   6. Prefilter shortlist (`prefilterFirms`)
 *   7. Apify Crunchbase enrichment
 *   8. Merge Crunchbase deals into firms (`mergeInvestors`)
 *   9. Apify LinkedIn post enrichment
 *  10. OpenAI ranking (`rankInvestorsWithGPT`)
 *  11. OpenAI outreach generation for top 3 (`generateOutreachEmail`)
 *
 * Usage:
 *   npx tsx scripts/module3-e2e.ts
 */
import "dotenv/config"
import { config as loadEnv } from "dotenv"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

loadEnv({ path: path.resolve(process.cwd(), ".env.local") })

import { PDFParse } from "pdf-parse"
PDFParse.setWorker(
  pathToFileURL(
    path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    )
  ).href
)

import { analyseDeckText } from "@/lib/openai/deck-analysis"
import { buildFounderProfile } from "@/lib/matching/profile"
import { hashProfile } from "@/lib/utils/hash-profile"
import {
  buildLeadsFinderInput,
  discoverVCPartners,
} from "@/lib/apify/leads-finder"
import { groupLeadsIntoFirms } from "@/lib/matching/group-leads"
import { prefilterFirms } from "@/lib/matching/prefilter"
import {
  startCrunchbaseFirmEnrichment,
  fetchCrunchbaseResults,
} from "@/lib/apify/crunchbase"
import { mergeInvestors } from "@/lib/matching/merge"
import {
  startLinkedInEnrichment,
  fetchLinkedInResults,
} from "@/lib/apify/linkedin"
import { rankInvestorsWithGPT } from "@/lib/matching/rank"
import { generateOutreachEmail } from "@/lib/matching/outreach"
import { buildOutreachApifyContext } from "@/lib/matching/outreach-context"
import { getInvestorMatchPipelineSizing } from "@/lib/stripe/plans"
import type { MergedFirm } from "@/lib/matching/merge"
import type { InvestorMatch } from "@/types/profile"
import type { Plan } from "@/types/app"

type RankedMatch = Omit<InvestorMatch, "rank" | "outreachEmail">

function backfillForTest({
  ranked,
  shortlist,
  targetMatchCount,
}: {
  ranked: RankedMatch[]
  shortlist: MergedFirm[]
  targetMatchCount: number
}): RankedMatch[] {
  if (ranked.length >= targetMatchCount) return ranked
  const usedFirms = new Set(ranked.map((m) => m.firm.name.toLowerCase()))
  const usedPartners = new Set(ranked.map((m) => m.partner.linkedin.toLowerCase()))
  const fillers: RankedMatch[] = []
  for (const firm of shortlist) {
    if (ranked.length + fillers.length >= targetMatchCount) break
    if (usedFirms.has(firm.Firm_Name.toLowerCase())) continue
    const contact = firm.Contacts.find(
      (c) => c.Name && c.Email && !usedPartners.has((c.LinkedIn ?? "").toLowerCase())
    )
    if (!contact) continue
    fillers.push({
      fitScore: Math.max(35, 50 - fillers.length),
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
        linkedin: contact.LinkedIn ?? "",
      },
      matchRationale: `Backfill (test): ${firm.Firm_Name} - ${(firm.Focus_Areas[0] ?? "general venture")} - ${firm.Country}`,
      recentLinkedInSignals: [],
      limitedData: true,
    })
    usedFirms.add(firm.Firm_Name.toLowerCase())
    usedPartners.add((contact.LinkedIn ?? "").toLowerCase())
  }
  return [...ranked, ...fillers]
}

type DeckSpec = {
  label: string
  pdfPath: string
  plan: Plan
  profile: Record<string, unknown>
}

// We deliberately use the SAME onboarding profile (SaaS / seed / UK) for
// both decks so any tailoring we see must be deck-driven, not profile-driven.
const SAME_PROFILE = {
  sector: "SaaS",
  industry: "SaaS",
  stage: "seed",
  funding_stage: "seed",
  geography: "United Kingdom",
  location: "United Kingdom",
  target_raise: 500_000,
  full_name: "Founder",
}

// Picking Pro for both decks to exercise the new 35-match cap. Run a third
// pass with Lifetime if you want to verify the 50-match path.
const decks: DeckSpec[] = [
  {
    label: "Mark Pal",
    pdfPath: "c:/Users/tomas/Downloads/Mark Pal  The Pitch Deck (1).pdf",
    plan: "pro",
    profile: { ...SAME_PROFILE, company_name: "Mark Pal", plan: "pro" },
  },
  {
    label: "Standen Capital",
    pdfPath: "c:/Users/tomas/Downloads/standen_capital_pitch_deck.pdf",
    plan: "pro",
    profile: { ...SAME_PROFILE, company_name: "Standen Capital", plan: "pro" },
  },
]

const OUTREACH_SAMPLE_COUNT = 3
const REPORTS_DIR = path.resolve(process.cwd(), "scripts", "module3-reports")

async function extractText(pdfPath: string): Promise<string> {
  const buffer = await readFile(pdfPath)
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text.replace(/\s+/g, " ").trim()
  } finally {
    await parser.destroy()
  }
}

function logSection(title: string) {
  console.log(`\n${"=".repeat(70)}\n${title}\n${"=".repeat(70)}`)
}

function ms(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

async function runDeck(spec: DeckSpec) {
  const timings: Record<string, number> = {}
  const tick = (label: string, t0: number) => {
    timings[label] = Date.now() - t0
  }

  logSection(`DECK: ${spec.label}`)

  let t = Date.now()
  const text = await extractText(spec.pdfPath)
  tick("pdf_extract", t)
  console.log(`[pdf] ${text.length} chars`)

  t = Date.now()
  const analysis = await analyseDeckText(text)
  tick("deck_analysis", t)
  const parsed = analysis.parsed
  console.log(`[deck-analysis] score=${parsed.overallScore} summary="${parsed.summary.slice(0, 100)}…"`)

  const founderProfile = buildFounderProfile({
    userId: "test-user",
    deckAnalysisId: `deck-${spec.label}`,
    profile: spec.profile,
    deckAnalysis: {
      summary: parsed.summary,
      overall_score: parsed.overallScore,
      category_scores: parsed.categoryScores,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      missing_sections: parsed.missingSections,
      investor_readiness: parsed.investorReadiness,
      priority_actions: parsed.priorityActions,
      fundraising_risks: parsed.fundraisingRisks,
    } as Record<string, unknown>,
  })
  const sizing = getInvestorMatchPipelineSizing(spec.plan)
  if (!sizing) throw new Error(`Plan ${spec.plan} has no matching budget`)
  console.log(`[plan] ${spec.plan} sizing`, sizing)

  const cacheKey = hashProfile(founderProfile)
  const leadsFinderInput = buildLeadsFinderInput(founderProfile, {
    fetchCount: sizing.leadsFinderFetchCount,
  })
  console.log(`[profile] cacheKey=${cacheKey}`)
  console.log(`[profile] deckKeywords=${JSON.stringify(founderProfile.deckSignals?.keywords)}`)
  console.log(`[profile] leadsFinderKeywords=${JSON.stringify(leadsFinderInput.company_keywords)}`)
  console.log(`[profile] leadsFinderFetchCount=${leadsFinderInput.fetch_count}`)

  t = Date.now()
  const rawLeads = await discoverVCPartners(founderProfile, {
    fetchCount: sizing.leadsFinderFetchCount,
  })
  tick("leads_finder", t)
  console.log(`[leads-finder] ${rawLeads.length} validated leads`)

  const groupedFirms = groupLeadsIntoFirms(rawLeads, founderProfile)
  const shortlistedFirms = prefilterFirms(groupedFirms, founderProfile, sizing.shortlistTarget)
  console.log(`[group+prefilter] ${groupedFirms.length} firms → ${shortlistedFirms.length} shortlisted`)

  t = Date.now()
  const crunchbaseRun = await startCrunchbaseFirmEnrichment(shortlistedFirms, "e2e-test")
  const crunchbaseResults = crunchbaseRun.datasetId
    ? await fetchCrunchbaseResults(String(crunchbaseRun.datasetId))
    : []
  tick("crunchbase", t)
  console.log(`[crunchbase] ${crunchbaseResults.length} firm records returned`)

  const shortlist = mergeInvestors(crunchbaseResults, shortlistedFirms)

  const partnerUrls = shortlist.flatMap((firm) =>
    firm.Contacts.slice(0, sizing.partnersPerFirm)
      .map((contact) => contact.LinkedIn)
      .filter((url): url is string => Boolean(url))
  )
  console.log(`[linkedin] preparing ${partnerUrls.length} partner URLs`)

  let linkedinPosts: Awaited<ReturnType<typeof fetchLinkedInResults>> = []
  if (partnerUrls.length) {
    t = Date.now()
    const linkedInRun = await startLinkedInEnrichment(partnerUrls, "e2e-test")
    linkedinPosts = linkedInRun.datasetId
      ? await fetchLinkedInResults(String(linkedInRun.datasetId))
      : []
    tick("linkedin", t)
    console.log(`[linkedin] ${linkedinPosts.length} posts`)
  } else {
    console.log("[linkedin] skipped — no partner URLs")
  }

  t = Date.now()
  const rankedFromGpt = shortlist.length
    ? await rankInvestorsWithGPT({
        profile: founderProfile,
        firms: shortlist,
        partnerSignals: linkedinPosts,
        limitedData: linkedinPosts.length === 0,
        targetMatchCount: sizing.targetMatchCount,
      })
    : []
  tick("ranking", t)
  console.log(
    `[rank] ${rankedFromGpt.length} ranked by GPT (target=${sizing.targetMatchCount})`
  )

  const ranked = backfillForTest({
    ranked: rankedFromGpt,
    shortlist,
    targetMatchCount: sizing.targetMatchCount,
  })
  console.log(
    `[rank] ${ranked.length} after backfill (target=${sizing.targetMatchCount}, filled=${ranked.length - rankedFromGpt.length})`
  )

  t = Date.now()
  const topN = ranked.slice(0, OUTREACH_SAMPLE_COUNT)
  const withOutreach = await Promise.all(
    topN.map(async (match, index) => {
      const outreach = await generateOutreachEmail({
        profile: founderProfile,
        match,
        apifyContext: buildOutreachApifyContext({
          match,
          rawLeads,
          crunchbaseResults,
          linkedinPosts,
        }),
        userId: "test-user",
        runId: "e2e-test",
      })
      return { rank: index + 1, ...match, outreach }
    })
  )
  tick("outreach", t)
  console.log(`[outreach] generated ${withOutreach.length} sample emails`)

  console.log(
    `\n[timings] ${Object.entries(timings)
      .map(([k, v]) => `${k}=${ms(v)}`)
      .join(", ")}`
  )

  return {
    spec,
    text,
    analysis: parsed,
    founderProfile,
    cacheKey,
    leadsFinderInput,
    rawLeadCount: rawLeads.length,
    firmCount: groupedFirms.length,
    shortlistCount: shortlistedFirms.length,
    crunchbaseCount: crunchbaseResults.length,
    linkedinPostCount: linkedinPosts.length,
    rankedAll: ranked,
    rankedTop: withOutreach,
    timings,
  }
}

function summarisePartner(p: { partner: { name: string; title: string }; firm: { name: string; country: string } }) {
  return `${p.partner.name} (${p.partner.title}) — ${p.firm.name}, ${p.firm.country || "?"}`
}

function compareDecks(
  a: Awaited<ReturnType<typeof runDeck>>,
  b: Awaited<ReturnType<typeof runDeck>>
) {
  logSection("CROSS-DECK COMPARISON")

  const aPartners = new Set(a.rankedAll.map((m) => m.partner.linkedin || `${m.partner.name}@${m.firm.name}`))
  const bPartners = new Set(b.rankedAll.map((m) => m.partner.linkedin || `${m.partner.name}@${m.firm.name}`))
  const overlap = [...aPartners].filter((id) => bPartners.has(id))
  const aOnly = [...aPartners].filter((id) => !bPartners.has(id)).length
  const bOnly = [...bPartners].filter((id) => !aPartners.has(id)).length

  console.log(`\nCache keys differ:        ${a.cacheKey !== b.cacheKey} (${a.cacheKey} vs ${b.cacheKey})`)
  console.log(
    `Leads Finder identical:   ${
      JSON.stringify(a.leadsFinderInput) === JSON.stringify(b.leadsFinderInput)
    }`
  )
  console.log(
    `Overall deck scores:      ${a.spec.label}=${a.analysis.overallScore}, ${b.spec.label}=${b.analysis.overallScore}`
  )
  console.log(
    `Ranked partners — ${a.spec.label}:        ${aPartners.size}`
  )
  console.log(
    `Ranked partners — ${b.spec.label}:        ${bPartners.size}`
  )
  console.log(`Overlap (same partner in both): ${overlap.length}`)
  console.log(`${a.spec.label}-only partners:  ${aOnly}`)
  console.log(`${b.spec.label}-only partners:  ${bOnly}`)

  const overlapRatio = overlap.length / Math.max(1, Math.min(aPartners.size, bPartners.size))
  console.log(`Overlap ratio:            ${(overlapRatio * 100).toFixed(1)}%`)

  // Per-partner score divergence among shared candidates
  if (overlap.length > 0) {
    const aScores = new Map(
      a.rankedAll.map((m) => [m.partner.linkedin || `${m.partner.name}@${m.firm.name}`, m.fitScore])
    )
    const bScores = new Map(
      b.rankedAll.map((m) => [m.partner.linkedin || `${m.partner.name}@${m.firm.name}`, m.fitScore])
    )
    const diffs = overlap.map((id) => Math.abs((aScores.get(id) ?? 0) - (bScores.get(id) ?? 0)))
    const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length
    const maxDiff = Math.max(...diffs)
    console.log(`Shared-partner score divergence: avg=${avgDiff.toFixed(1)} pts, max=${maxDiff} pts`)
  }

  console.log(`\n--- Top 5 ranked, ${a.spec.label} ---`)
  for (const m of a.rankedAll.slice(0, 5)) {
    console.log(`  #${a.rankedAll.indexOf(m) + 1} ${m.fitScore} ${summarisePartner(m)}`)
    console.log(`     ${m.matchRationale.slice(0, 220)}${m.matchRationale.length > 220 ? "…" : ""}`)
  }
  console.log(`\n--- Top 5 ranked, ${b.spec.label} ---`)
  for (const m of b.rankedAll.slice(0, 5)) {
    console.log(`  #${b.rankedAll.indexOf(m) + 1} ${m.fitScore} ${summarisePartner(m)}`)
    console.log(`     ${m.matchRationale.slice(0, 220)}${m.matchRationale.length > 220 ? "…" : ""}`)
  }

  console.log(`\n--- Sample outreach: ${a.spec.label}, rank #1 ---`)
  if (a.rankedTop[0]) {
    console.log(`Subject: ${a.rankedTop[0].outreach.subject}`)
    console.log(a.rankedTop[0].outreach.body)
  }
  console.log(`\n--- Sample outreach: ${b.spec.label}, rank #1 ---`)
  if (b.rankedTop[0]) {
    console.log(`Subject: ${b.rankedTop[0].outreach.subject}`)
    console.log(b.rankedTop[0].outreach.body)
  }

  const verdict =
    a.cacheKey !== b.cacheKey &&
    JSON.stringify(a.leadsFinderInput) !== JSON.stringify(b.leadsFinderInput) &&
    overlapRatio < 0.8

  logSection(verdict ? "VERDICT: ✅ TAILORED" : "VERDICT: ❌ INSUFFICIENT TAILORING")
  if (!verdict) {
    console.log(`overlap_ratio=${(overlapRatio * 100).toFixed(1)}% (must be <80%)`)
  }
}

async function persistReport(
  results: Awaited<ReturnType<typeof runDeck>>[]
) {
  await mkdir(REPORTS_DIR, { recursive: true })
  const file = path.join(REPORTS_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
  await writeFile(file, JSON.stringify(results, null, 2), "utf8")
  console.log(`\nFull report written to: ${file}`)
}

async function run() {
  const results: Awaited<ReturnType<typeof runDeck>>[] = []
  for (const spec of decks) {
    try {
      results.push(await runDeck(spec))
    } catch (error) {
      console.error(`\n[FATAL] Pipeline failed for ${spec.label}:`, error)
      throw error
    }
  }

  if (results.length === 2) {
    compareDecks(results[0], results[1])
  }

  await persistReport(results)
}

run().catch((error) => {
  console.error("module 3 e2e failed", error)
  process.exitCode = 1
})
