/**
 * Audit script: does the investor-matching pipeline produce distinct,
 * deck-tailored results for two materially different pitch decks?
 *
 * - Extracts text from both PDFs
 * - Runs analyseDeckText() with the real production prompt (OpenAI)
 * - Builds the FounderProfile the matcher sees
 * - Computes the cache key (hashProfile)
 * - Builds the Leads Finder Apify input
 * - Prints what GPT actually receives during ranking
 *
 * Usage:
 *   npx tsx scripts/audit-tailoring.ts
 */
import "dotenv/config"
import { config as loadEnv } from "dotenv"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import Module from "node:module"

// Stub Next.js' "server-only" guard so we can import production modules
// from a plain Node script.
const origResolve = Module.createRequire(import.meta.url).resolve
;(Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string })._resolveFilename = new Proxy(
  (Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string })._resolveFilename,
  {
    apply(target, thisArg, args) {
      if (args[0] === "server-only") {
        return path.join(process.cwd(), "scripts", "stub-server-only.cjs")
      }
      return Reflect.apply(target as never, thisArg, args)
    },
  }
)

loadEnv({ path: path.resolve(process.cwd(), ".env.local") })

// origResolve is used only for type cleanliness; unused at runtime
void origResolve

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
import { buildLeadsFinderInput } from "@/lib/apify/leads-finder"
import { buildFounderProfile } from "@/lib/matching/profile"
import { hashProfile } from "@/lib/utils/hash-profile"

type DeckSpec = {
  label: string
  pdfPath: string
  // Simulates what the founder typed during onboarding (or had auto-filled).
  // We use the SAME onboarding profile for both decks to isolate deck-driven
  // tailoring from profile-driven tailoring.
  profile: Record<string, unknown>
}

const decks: DeckSpec[] = [
  {
    label: "Mark Pal",
    pdfPath: "c:/Users/tomas/Downloads/Mark Pal  The Pitch Deck (1).pdf",
    profile: {
      company_name: "Mark Pal",
      sector: "EdTech",
      industry: "EdTech",
      stage: "pre-seed",
      funding_stage: "pre-seed",
      geography: "United Kingdom",
      location: "United Kingdom",
      target_raise: 250_000,
      full_name: "Founder",
    },
  },
  {
    label: "Standen Capital",
    pdfPath: "c:/Users/tomas/Downloads/standen_capital_pitch_deck.pdf",
    profile: {
      company_name: "Standen Capital",
      sector: "FinTech",
      industry: "FinTech",
      stage: "seed",
      funding_stage: "seed",
      geography: "United Kingdom",
      location: "United Kingdom",
      target_raise: 2_000_000,
      full_name: "Founder",
    },
  },
  // Worst-case-for-cache-key: SAME founder profile, DIFFERENT decks.
  // Under the old hash, these two would collide and the second upload would
  // be served from the first deck's cached matches. The new hash must
  // produce DIFFERENT cache keys for these two.
  {
    label: "Mark Pal (same-profile collision test)",
    pdfPath: "c:/Users/tomas/Downloads/Mark Pal  The Pitch Deck (1).pdf",
    profile: {
      company_name: "GenericCo",
      sector: "SaaS",
      industry: "SaaS",
      stage: "seed",
      funding_stage: "seed",
      geography: "United Kingdom",
      location: "United Kingdom",
      target_raise: 500_000,
      full_name: "Founder",
    },
  },
  {
    label: "Standen Capital (same-profile collision test)",
    pdfPath: "c:/Users/tomas/Downloads/standen_capital_pitch_deck.pdf",
    profile: {
      company_name: "GenericCo",
      sector: "SaaS",
      industry: "SaaS",
      stage: "seed",
      funding_stage: "seed",
      geography: "United Kingdom",
      location: "United Kingdom",
      target_raise: 500_000,
      full_name: "Founder",
    },
  },
]

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

function summarise(s: string, max = 240) {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

async function run() {
  const results = [] as Array<{
    label: string
    score: number
    summary: string
    categoryScores: Array<{ category: string; score: number }>
    strengths: string[]
    weaknesses: string[]
    fundraisingRisks: string[]
    founderProfile: ReturnType<typeof buildFounderProfile>
    cacheKey: string
    leadsFinderInput: Record<string, unknown>
  }>

  for (const deck of decks) {
    console.log(`\n=== ${deck.label} ===`)
    console.log(`Extracting text from ${deck.pdfPath}`)
    const text = await extractText(deck.pdfPath)
    console.log(`Extracted ${text.length} chars. Sample:\n  ${summarise(text)}\n`)

    console.log("Analysing deck with OpenAI…")
    const analysis = await analyseDeckText(text)
    const parsed = analysis.parsed

    const deckAnalysisRow = {
      summary: parsed.summary,
      overall_score: parsed.overallScore,
      category_scores: parsed.categoryScores,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      missing_sections: parsed.missingSections,
      investor_readiness: parsed.investorReadiness,
      suggested_fixes: parsed.suggestedFixes,
      priority_actions: parsed.priorityActions,
      fundraising_risks: parsed.fundraisingRisks,
    }

    const founderProfile = buildFounderProfile({
      userId: "test-user",
      deckAnalysisId: "test-deck",
      profile: deck.profile,
      deckAnalysis: deckAnalysisRow as unknown as Record<string, unknown>,
    })

    const cacheKey = hashProfile(founderProfile)
    const leadsFinderInput = buildLeadsFinderInput(founderProfile)

    results.push({
      label: deck.label,
      score: parsed.overallScore,
      summary: parsed.summary,
      categoryScores: parsed.categoryScores.map((c) => ({ category: c.category, score: c.score })),
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      fundraisingRisks: parsed.fundraisingRisks,
      founderProfile,
      cacheKey,
      leadsFinderInput,
    })

    console.log("Deck analysis:", {
      score: parsed.overallScore,
      summary: summarise(parsed.summary),
      categoryScores: parsed.categoryScores.map((c) => `${c.category}=${c.score}`),
      strengths: parsed.strengths.slice(0, 3),
      weaknesses: parsed.weaknesses.slice(0, 3),
    })
    console.log("FounderProfile (input to ranker):", JSON.stringify(founderProfile, null, 2))
    console.log("hashProfile cache key:", cacheKey)
    console.log("Leads Finder Apify input:", JSON.stringify(leadsFinderInput, null, 2))
  }

  console.log("\n=========================")
  console.log("CROSS-DECK COMPARISON")
  console.log("=========================")
  const [a, b, aSame, bSame] = results
  console.log(`A vs B (different profile + different deck):`)
  console.log(`  Cache keys differ? ${a.cacheKey !== b.cacheKey} (${a.cacheKey} vs ${b.cacheKey})`)
  console.log(`  Leads Finder queries identical? ${JSON.stringify(a.leadsFinderInput) === JSON.stringify(b.leadsFinderInput)}`)
  console.log(`  Overall scores: ${a.label}=${a.score}, ${b.label}=${b.score}`)
  console.log(`  oneLiners distinct? ${a.founderProfile.company.oneLiner !== b.founderProfile.company.oneLiner}`)

  console.log(`\nA-same vs B-same (IDENTICAL profile, different deck — must still differ):`)
  console.log(`  Cache keys differ? ${aSame.cacheKey !== bSame.cacheKey} (${aSame.cacheKey} vs ${bSame.cacheKey})`)
  console.log(`  Leads Finder queries identical? ${JSON.stringify(aSame.leadsFinderInput) === JSON.stringify(bSame.leadsFinderInput)}`)
  console.log(`  Leads Finder keywords A-same: ${JSON.stringify(aSame.leadsFinderInput.company_keywords)}`)
  console.log(`  Leads Finder keywords B-same: ${JSON.stringify(bSame.leadsFinderInput.company_keywords)}`)

  // What the ranker actually sees per founder. Mirrors buildFounderPayload()
  // in lib/matching/rank.ts so this audit reflects production behaviour.
  const rankerSnapshot = (r: (typeof results)[number]) => {
    const p = r.founderProfile
    const signals = p.deckSignals
    return {
      company: {
        name: p.company.name,
        oneLiner: p.company.oneLiner,
        sectorBucket: p.company.sector,
        sectorRaw: p.company.sectorRaw,
        subSector: p.company.subSector,
        businessModelBucket: p.company.businessModel,
        businessModelRaw: p.company.businessModelRaw,
        stage: p.company.stage,
        geography: p.company.geography,
      },
      traction: p.traction,
      team: p.team,
      raise: p.raise,
      deck: signals
        ? {
            overallScore: signals.overallScore,
            categoryScores: signals.categoryScores,
            strengths: signals.strengths,
            weaknesses: signals.weaknesses,
            missingSections: signals.missingSections,
            fundraisingRisks: signals.fundraisingRisks,
            keywords: signals.keywords,
          }
        : null,
    }
  }
  console.log("\nRanker founder payload — Deck A:", JSON.stringify(rankerSnapshot(a), null, 2))
  console.log("\nRanker founder payload — Deck B:", JSON.stringify(rankerSnapshot(b), null, 2))

  const aJson = JSON.stringify(rankerSnapshot(a))
  const bJson = JSON.stringify(rankerSnapshot(b))
  console.log("\nRanker payloads identical?", aJson === bJson)
  console.log("Deck keywords A:", a.founderProfile.deckSignals?.keywords)
  console.log("Deck keywords B:", b.founderProfile.deckSignals?.keywords)
  console.log("Deck keywords A-same:", aSame.founderProfile.deckSignals?.keywords)
  console.log("Deck keywords B-same:", bSame.founderProfile.deckSignals?.keywords)

  console.log("\nSummary:")
  const allGood =
    a.cacheKey !== b.cacheKey &&
    aSame.cacheKey !== bSame.cacheKey &&
    JSON.stringify(aSame.leadsFinderInput) !== JSON.stringify(bSame.leadsFinderInput) &&
    aJson !== bJson
  console.log(allGood ? "  ✅ All tailoring checks pass" : "  ❌ One or more tailoring checks failed")
}

run().catch((error) => {
  console.error("audit failed", error)
  process.exitCode = 1
})
