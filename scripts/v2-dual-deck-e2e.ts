/**
 * Full v2 investor pipeline — two pitch decks, no Supabase.
 * Produces JSON + Markdown with every match and outreach email.
 *
 * Usage:
 *   npx tsx scripts/v2-dual-deck-e2e.ts
 */
import "dotenv/config"
import { config as loadEnv } from "dotenv"
import { readFile, writeFile, mkdir } from "node:fs/promises"
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

import { discoverVCPartners } from "@/lib/apify/leads-finder"
import { enrichLinkedInProfiles, profileMapByUrl } from "@/lib/apify/linkedinProfile"
import { fetchLinkedInPostsForProfiles } from "@/lib/apify/linkedinPosts"
import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import { verifyEmails, validEmailSet } from "@/lib/apify/emailVerifier"
import { isLinkedInPostsEnabled } from "@/lib/apify/actors"
import { analyseDeckText } from "@/lib/openai/deck-analysis"
import { backfillRankedMatches } from "@/lib/matching/backfill-v2"
import { enrichedCandidatesToFirms } from "@/lib/matching/enriched-to-firms"
import { buildDeckDiscoveryConfig } from "@/lib/matching/deck-discovery"
import { buildDiscoveryFilterFromProfile } from "@/lib/matching/filterFromProfile"
import { buildOutreachApifyContext } from "@/lib/matching/outreach-context"
import { generateOutreachEmail } from "@/lib/matching/outreach"
import { preFilterPeople } from "@/lib/matching/preFilterPeople"
import { buildFounderProfile } from "@/lib/matching/profile"
import { rankInvestorsWithGPT } from "@/lib/matching/rank"
import { getInvestorPipelineV2Sizing } from "@/lib/matching/v2-sizing"
import { hashProfile } from "@/lib/utils/hash-profile"
import type { LinkedInPost } from "@/types/apify"
import type { EnrichedInvestorCandidate } from "@/types/matching-v2"
import type { InvestorMatch } from "@/types/profile"
import type { Plan } from "@/types/app"

type RankedMatch = Omit<InvestorMatch, "rank" | "outreachEmail">
type MatchWithOutreach = InvestorMatch & {
  source: "gpt" | "backfill"
}

/** Minimal onboarding — sector/stage/raise come from deck analysis + inference. */
const DECKS: Array<{
  label: string
  pdfPath: string
  plan: Plan
  profile: Record<string, unknown>
}> = [
  {
    label: "Mark Pal",
    pdfPath: "c:/Users/tomas/Downloads/Mark Pal  The Pitch Deck (1).pdf",
    plan: "pro",
    profile: {
      company_name: "Mark Pal",
      geography: "United Kingdom",
      location: "United Kingdom",
      full_name: "Founder",
      plan: "pro",
    },
  },
  {
    label: "Standen Capital",
    pdfPath: "c:/Users/tomas/Downloads/standen_capital_pitch_deck.pdf",
    plan: "pro",
    profile: {
      company_name: "Standen Capital",
      geography: "United Kingdom",
      location: "United Kingdom",
      full_name: "Founder",
      plan: "pro",
    },
  },
]

const REPORTS_DIR = path.resolve(process.cwd(), "scripts", "module3-reports")

async function extractText(pdfPath: string) {
  const buffer = await readFile(pdfPath)
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text.replace(/\s+/g, " ").trim()
  } finally {
    await parser.destroy()
  }
}

function isBackfillMatch(m: RankedMatch) {
  return m.matchRationale.startsWith("Secondary pick:")
}

function groupPostsByProfile(posts: LinkedInPost[]) {
  const map = new Map<string, LinkedInPost[]>()
  for (const post of posts) {
    const key = normaliseLinkedInUrl(post.profileUrl)
    if (!key) continue
    const list = map.get(key) ?? []
    list.push(post)
    map.set(key, list)
  }
  return map
}

async function runDeckV2(spec: (typeof DECKS)[0]) {
  const timings: Record<string, number> = {}
  const tick = (label: string, t0: number) => {
    timings[label] = Date.now() - t0
  }

  console.log(`\n${"=".repeat(72)}\nDECK: ${spec.label}\n${"=".repeat(72)}`)

  let t = Date.now()
  const text = await extractText(spec.pdfPath)
  tick("pdf_extract", t)
  console.log(`[pdf] ${text.length} chars`)

  t = Date.now()
  const analysis = await analyseDeckText(text)
  tick("deck_analysis", t)
  const parsed = analysis.parsed
  console.log(`[deck] score=${parsed.overallScore}`)

  const founderProfile = buildFounderProfile({
    userId: "e2e-v2",
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

  const sizing = getInvestorPipelineV2Sizing(spec.plan)!
  const cacheKey = hashProfile(founderProfile)
  const discovery = buildDeckDiscoveryConfig(founderProfile)
  const { filterPayload, filterHash } = buildDiscoveryFilterFromProfile(founderProfile)
  console.log(`[v2] target=${sizing.targetMatchCount} fetch=${sizing.leadsFinderFetchCount}`)
  console.log(`[v2] audience=${discovery.audience} stage=${discovery.stage} keywords=${discovery.thesisKeywords.join(",")}`)
  console.log(`[v2] filterHash=${filterHash} deckSignature=${filterPayload.deckSignature}`)

  t = Date.now()
  const rawLeads = await discoverVCPartners(founderProfile, {
    fetchCount: sizing.leadsFinderFetchCount,
  })
  tick("leads_finder", t)
  console.log(`[leads] ${rawLeads.length} validated`)

  const filtered = preFilterPeople(rawLeads, founderProfile, sizing.preFilterKeep)
  console.log(`[prefilter] ${filtered.length} people`)

  const profileUrls = filtered
    .map((l) => normaliseLinkedInUrl(l.linkedin))
    .filter((u): u is string => Boolean(u))
    .slice(0, sizing.linkedinProfileCap)

  let profileMap = new Map<string, Record<string, unknown>>()
  if (profileUrls.length) {
    t = Date.now()
    const profiles = await enrichLinkedInProfiles(profileUrls)
    tick("linkedin_profiles", t)
    profileMap = profileMapByUrl(profiles)
    console.log(`[linkedin-profile] ${profiles.length} profiles`)
  }

  let enrichedCandidates: EnrichedInvestorCandidate[] = filtered.map((lead) => {
    const url = normaliseLinkedInUrl(lead.linkedin)
    return { lead, linkedInProfile: url ? profileMap.get(url) : undefined }
  })

  let linkedinPosts: LinkedInPost[] = []
  let limitedData = enrichedCandidates.length === 0

  if (isLinkedInPostsEnabled() && enrichedCandidates.length) {
    const postTargets = enrichedCandidates
      .slice(0, sizing.linkedinPostsCap)
      .map((c) => normaliseLinkedInUrl(c.lead.linkedin))
      .filter((u): u is string => Boolean(u))

    if (postTargets.length) {
      t = Date.now()
      linkedinPosts = await fetchLinkedInPostsForProfiles(postTargets, {
        maxPosts: 10,
        postedLimit: "year",
      })
      tick("linkedin_posts", t)
      const postsByUrl = groupPostsByProfile(linkedinPosts)
      enrichedCandidates = enrichedCandidates.map((c) => {
        const url = normaliseLinkedInUrl(c.lead.linkedin)
        const posts = url ? postsByUrl.get(url) ?? [] : []
        return { ...c, linkedInPosts: posts.length ? posts : c.linkedInPosts }
      })
      console.log(`[linkedin-posts] ${linkedinPosts.length} posts`)
      limitedData = linkedinPosts.length === 0
    }
  }

  const firms = enrichedCandidatesToFirms(enrichedCandidates, founderProfile)
  console.log(`[firms] ${firms.length} merged firms`)

  t = Date.now()
  const rankedFromGpt =
    firms.length && sizing.targetMatchCount > 0
      ? await rankInvestorsWithGPT({
          profile: founderProfile,
          firms,
          partnerSignals: linkedinPosts,
          limitedData,
          targetMatchCount: sizing.targetMatchCount,
        })
      : []
  tick("ranking", t)

  const deckSummary = founderProfile.deckSignals?.summary ?? founderProfile.company.oneLiner
  const ranked = backfillRankedMatches({
    ranked: rankedFromGpt,
    firms,
    linkedinPosts,
    targetMatchCount: sizing.targetMatchCount,
    deckSummary,
    limitedData,
    profile: founderProfile,
  })

  let rankedForOutreach = ranked
  if (process.env.INVESTOR_PIPELINE_EMAIL_VERIFY?.trim().toLowerCase() !== "false") {
    const emails = ranked.map((m) => m.partner.email).filter((e): e is string => Boolean(e))
    if (emails.length) {
      t = Date.now()
      const verified = await verifyEmails(emails)
      const valid = validEmailSet(verified)
      tick("email_verify", t)
      if (verified.length > 0) {
        rankedForOutreach = ranked.map((match) => {
          const email = match.partner.email?.trim().toLowerCase()
          if (email && !valid.has(email)) {
            return { ...match, partner: { ...match.partner, email: undefined } }
          }
          return match
        })
        console.log(`[email-verify] ${valid.size}/${emails.length} valid`)
      }
    }
  }

  console.log(`[rank] gpt=${rankedFromGpt.length} final=${rankedForOutreach.length} backfill=${rankedForOutreach.length - rankedFromGpt.length}`)

  t = Date.now()
  const withOutreach: MatchWithOutreach[] = []
  for (let index = 0; index < rankedForOutreach.length; index++) {
    const match = rankedForOutreach[index]
    const outreachEmail = await generateOutreachEmail({
      profile: founderProfile,
      match,
      apifyContext: buildOutreachApifyContext({
        match,
        rawLeads,
        crunchbaseResults: [],
        linkedinPosts,
      }),
      userId: "e2e-v2",
      runId: `e2e-v2-${spec.label}`,
    })
    withOutreach.push({
      ...match,
      rank: index + 1,
      outreachEmail,
      source: isBackfillMatch(match) ? "backfill" : "gpt",
    })
    if ((index + 1) % 5 === 0) {
      console.log(`[outreach] ${index + 1}/${rankedForOutreach.length}`)
    }
  }
  tick("outreach_all", t)
  console.log(`[outreach] done (${withOutreach.length} emails)`)

  return {
    spec,
    pipelineVersion: "v2",
    timings,
    deckAnalysis: {
      overallScore: parsed.overallScore,
      summary: parsed.summary,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      investorReadiness: parsed.investorReadiness,
    },
    founderProfile: {
      companyName: founderProfile.company.name,
      sector: founderProfile.company.sector,
      stage: founderProfile.company.stage,
      geography: founderProfile.company.geography,
      oneLiner: founderProfile.company.oneLiner,
      deckKeywords: founderProfile.deckSignals?.keywords ?? [],
      deckSummary: founderProfile.deckSignals?.summary ?? "",
    },
    cacheKey,
    filterHash,
    filterPayload,
    sizing,
    counts: {
      rawLeads: rawLeads.length,
      preFiltered: filtered.length,
      linkedinProfiles: profileUrls.length,
      linkedinPosts: linkedinPosts.length,
      firms: firms.length,
      rankedFromGpt: rankedFromGpt.length,
      backfillCount: rankedForOutreach.length - rankedFromGpt.length,
      finalMatches: withOutreach.length,
    },
    matches: withOutreach.map((m) => ({
      rank: m.rank,
      fitScore: m.fitScore,
      source: m.source,
      limitedData: m.limitedData,
      firm: m.firm,
      partner: m.partner,
      matchRationale: m.matchRationale,
      recentLinkedInSignals: m.recentLinkedInSignals,
      outreach: m.outreachEmail,
    })),
  }
}

function buildMarkdown(
  results: Awaited<ReturnType<typeof runDeckV2>>[],
  startedAt: string
) {
  const lines: string[] = []
  lines.push("# Investor pipeline v2 — dual deck full test")
  lines.push("")
  lines.push(`**Run:** ${startedAt}`)
  lines.push(`**Pipeline:** v2 (Leads Finder → prefilter → LinkedIn profile/posts → GPT rank → backfill → outreach)`)
  lines.push(`**Plan:** Pro (25 matches per deck)`)
  lines.push("")

  if (results.length === 2) {
    const [a, b] = results
    const aIds = new Set(
      a.matches.map((m) => m.partner.linkedin || `${m.partner.name}@${m.firm.name}`)
    )
    const bIds = new Set(
      b.matches.map((m) => m.partner.linkedin || `${m.partner.name}@${m.firm.name}`)
    )
    const overlap = [...aIds].filter((id) => bIds.has(id))
    const overlapRatio = overlap.length / Math.max(1, Math.min(aIds.size, bIds.size))

    lines.push("## Cross-deck summary")
    lines.push("")
    lines.push("| Metric | Mark Pal | Standen Capital |")
    lines.push("|--------|----------|-----------------|")
    lines.push(`| Cache key | \`${a.cacheKey}\` | \`${b.cacheKey}\` |`)
    lines.push(`| Filter hash | \`${a.filterHash}\` | \`${b.filterHash}\` |`)
    lines.push(`| Investor audience | ${a.filterPayload.investorAudience} | ${b.filterPayload.investorAudience} |`)
    lines.push(`| Discovery keywords | ${a.filterPayload.company_keywords.join(", ")} | ${b.filterPayload.company_keywords.join(", ")} |`)
    lines.push(`| Deck score | ${a.deckAnalysis.overallScore} | ${b.deckAnalysis.overallScore} |`)
    lines.push(`| GPT-ranked | ${a.counts.rankedFromGpt} | ${b.counts.rankedFromGpt} |`)
    lines.push(`| Backfill | ${a.counts.backfillCount} | ${b.counts.backfillCount} |`)
    lines.push(`| Final matches | ${a.counts.finalMatches} | ${b.counts.finalMatches} |`)
    lines.push(`| Partner overlap | ${overlap.length} shared (${(overlapRatio * 100).toFixed(1)}% of smaller set) | |`)
    lines.push("")
    lines.push("**Tailoring checks:**")
    lines.push(`- Cache keys differ: **${a.cacheKey !== b.cacheKey ? "yes ✓" : "no ✗"}**`)
    lines.push(`- Filter hashes differ (deck-aware discovery): **${a.filterHash !== b.filterHash ? "yes ✓" : "no ✗"}**`)
    lines.push(`- Partner overlap < 80%: **${overlapRatio < 0.8 ? "yes ✓" : "no ✗"}** (${(overlapRatio * 100).toFixed(1)}%)`)
    lines.push("")
    if (overlap.length) {
      lines.push("<details><summary>Shared partners</summary>")
      lines.push("")
      for (const id of overlap.slice(0, 30)) {
        lines.push(`- ${id}`)
      }
      lines.push("</details>")
      lines.push("")
    }
  }

  for (const r of results) {
    lines.push(`## ${r.spec.label}`)
    lines.push("")
    lines.push("### Deck analysis")
    lines.push("")
    lines.push(`- **Score:** ${r.deckAnalysis.overallScore}`)
    lines.push(`- **Summary:** ${r.deckAnalysis.summary}`)
    lines.push(`- **Deck keywords:** ${(r.founderProfile.deckKeywords as string[]).join(", ") || "(none)"}`)
    lines.push("")
    lines.push("### Pipeline counts")
    lines.push("")
    lines.push("| Stage | Count |")
    lines.push("|-------|------:|")
    for (const [k, v] of Object.entries(r.counts)) {
      lines.push(`| ${k} | ${v} |`)
    }
    lines.push("")
    lines.push("### Timings")
    lines.push("")
    for (const [k, v] of Object.entries(r.timings)) {
      lines.push(`- ${k}: ${(v / 1000).toFixed(1)}s`)
    }
    lines.push("")
    lines.push(`### All ${r.matches.length} investors`)
    lines.push("")

    for (const m of r.matches) {
      lines.push(`#### #${m.rank} — ${m.partner.name} @ ${m.firm.name}`)
      lines.push("")
      lines.push(`| Field | Value |`)
      lines.push(`|-------|-------|`)
      lines.push(`| Fit score | ${m.fitScore} |`)
      lines.push(`| Source | ${m.source} |`)
      lines.push(`| Title | ${m.partner.title} |`)
      lines.push(`| Email | ${m.partner.email ?? "—"} |`)
      lines.push(`| LinkedIn | ${m.partner.linkedin || "—"} |`)
      lines.push(`| Location | ${m.firm.country || "—"} |`)
      lines.push(`| Focus | ${m.firm.focusAreas.slice(0, 5).join("; ") || "—"} |`)
      lines.push(`| Stages | ${m.firm.investmentStages.join(", ")} |`)
      lines.push("")
      lines.push("**Match rationale**")
      lines.push("")
      lines.push(m.matchRationale)
      lines.push("")
      if (m.recentLinkedInSignals?.length) {
        lines.push("**LinkedIn signals**")
        lines.push("")
        for (const s of m.recentLinkedInSignals.slice(0, 2)) {
          lines.push(`- (${s.postedAt || "?"}) ${s.postText.slice(0, 200)}${s.postText.length > 200 ? "…" : ""}`)
        }
        lines.push("")
      }
      lines.push("**Outreach email**")
      lines.push("")
      lines.push(`**Subject:** ${m.outreach.subject}`)
      lines.push("")
      lines.push("```")
      lines.push(m.outreach.body)
      lines.push("```")
      lines.push("")
      lines.push("---")
      lines.push("")
    }
  }

  return lines.join("\n")
}

async function main() {
  const startedAt = new Date().toISOString()
  console.log("[v2-e2e] Starting dual-deck full pipeline test", { startedAt })

  const results: Awaited<ReturnType<typeof runDeckV2>>[] = []
  for (const spec of DECKS) {
    results.push(await runDeckV2(spec))
  }

  await mkdir(REPORTS_DIR, { recursive: true })
  const stamp = startedAt.replace(/[:.]/g, "-")
  const jsonPath = path.join(REPORTS_DIR, `v2-full-test-${stamp}.json`)
  const mdPath = path.join(REPORTS_DIR, `v2-full-test-${stamp}.md`)

  await writeFile(jsonPath, JSON.stringify({ startedAt, results }, null, 2), "utf8")
  await writeFile(mdPath, buildMarkdown(results, startedAt), "utf8")

  console.log(`\n[v2-e2e] Reports written:`)
  console.log(`  ${mdPath}`)
  console.log(`  ${jsonPath}`)
}

main().catch((err) => {
  console.error("[v2-e2e] failed", err)
  process.exitCode = 1
})
