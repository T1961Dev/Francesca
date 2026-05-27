/**
 * Quick check: two PDFs → different deck-aware discovery configs.
 * Usage: npx tsx scripts/verify-deck-discovery.ts
 */
import "dotenv/config"
import { config as loadEnv } from "dotenv"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import Module from "node:module"

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

import { PDFParse } from "pdf-parse"
PDFParse.setWorker(
  pathToFileURL(
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")
  ).href
)

import { analyseDeckText } from "@/lib/openai/deck-analysis"
import { buildDeckDiscoveryConfig } from "@/lib/matching/deck-discovery"
import { buildDiscoveryFilterFromProfile } from "@/lib/matching/filterFromProfile"
import { buildFounderProfile } from "@/lib/matching/profile"

const decks = [
  { label: "Mark Pal", pdf: "c:/Users/tomas/Downloads/Mark Pal  The Pitch Deck (1).pdf" },
  { label: "Standen Capital", pdf: "c:/Users/tomas/Downloads/standen_capital_pitch_deck.pdf" },
]

async function extractText(pdfPath: string) {
  const buffer = await readFile(pdfPath)
  const parser = new PDFParse({ data: buffer })
  try {
    return (await parser.getText()).text.replace(/\s+/g, " ").trim()
  } finally {
    await parser.destroy()
  }
}

async function main() {
  for (const deck of decks) {
    const text = await extractText(deck.pdf)
    const analysis = await analyseDeckText(text)
    const p = analysis.parsed
    const profile = buildFounderProfile({
      userId: "verify",
      deckAnalysisId: deck.label,
      profile: {
        company_name: deck.label,
        geography: "United Kingdom",
        full_name: "Founder",
      },
      deckAnalysis: {
        summary: p.summary,
        overall_score: p.overallScore,
        category_scores: p.categoryScores,
        strengths: p.strengths,
        weaknesses: p.weaknesses,
        missing_sections: p.missingSections,
        investor_readiness: p.investorReadiness,
        priority_actions: p.priorityActions,
        fundraising_risks: p.fundraisingRisks,
      } as Record<string, unknown>,
    })

    const discovery = buildDeckDiscoveryConfig(profile)
    const { filterHash } = buildDiscoveryFilterFromProfile(profile)

    console.log(`\n=== ${deck.label} ===`)
    console.log({
      sector: profile.company.sector,
      stage: profile.company.stage,
      businessModelRaw: profile.company.businessModelRaw,
      audience: discovery.audience,
      thesisKeywords: discovery.thesisKeywords,
      jobTitles: discovery.contactJobTitles.slice(0, 3),
      filterHash,
      deckKeywords: profile.deckSignals?.keywords,
    })
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
