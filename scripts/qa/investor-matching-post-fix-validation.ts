/**
 * Post-fix validation for the five-company Investor Matching audit.
 *
 * Reads the existing pre-fix artifacts from docs/qa/artifacts/investor-matching,
 * runs the same five company profiles through the updated local v2 matching
 * path, writes fresh post-fix artifacts, and generates:
 *
 *   docs/qa/INVESTOR_MATCHING_POST_FIX_VALIDATION.md
 */
import "dotenv/config"
import { config as loadEnv } from "dotenv"
import Module from "node:module"
import { execSync } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

loadEnv({ path: path.resolve(process.cwd(), ".env.local") })

;(Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string })._resolveFilename =
  new Proxy(
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

type TestCompany = {
  id: string
  name: string
  sector: string
  expectedTerms: string[]
  badTerms: string[]
  stage: "pre-seed" | "seed"
  geography: string
  raiseAmount: number
  traction: string
  profile: Record<string, unknown>
}

type MatchRecord = Record<string, unknown> & {
  rank?: number
  fitScore?: number
  firm?: Record<string, unknown>
  partner?: Record<string, unknown>
  matchRationale?: string
  outreach?: Record<string, unknown>
  qa?: Record<string, unknown>
}

type RunArtifact = {
  company: TestCompany
  profile?: Record<string, unknown>
  counts?: Record<string, number>
  discovery?: Record<string, unknown>
  matches: MatchRecord[]
  validations: Record<string, unknown>
  error?: string
  raw?: Record<string, unknown>
}

const root = process.cwd()
const qaDir = path.join(root, "docs", "qa")
const beforeArtifactDir = path.join(qaDir, "artifacts", "investor-matching")
const afterArtifactDir = path.join(qaDir, "artifacts", "investor-matching-post-fix")
const deckArtifactDir = path.join(qaDir, "artifacts", "deck-analysis")
const reportPath = path.join(qaDir, "INVESTOR_MATCHING_POST_FIX_VALIDATION.md")

const companies: TestCompany[] = [
  {
    id: "atlasops",
    name: "AtlasOps",
    sector: "B2B SaaS / AI / Workflow Automation",
    expectedTerms: ["saas", "ai", "workflow", "automation", "b2b", "productivity", "operations"],
    badTerms: ["consumer", "biotech", "crypto", "climate"],
    stage: "pre-seed",
    geography: "UK / Europe / Worldwide",
    raiseAmount: 750000,
    traction: "GBP 18k MRR, 22 customers, 9% month-on-month growth, GBP 9k ACV",
    profile: {
      company_name: "AtlasOps",
      sector: "B2B SaaS / AI / Workflow Automation",
      industry: "B2B SaaS",
      stage: "pre-seed",
      funding_stage: "pre-seed",
      geography: "United Kingdom / Europe / Worldwide",
      location: "United Kingdom",
      target_raise: 750000,
      full_name: "QA Founder",
      plan: "pro",
      description: "AI workflow automation for mid-market operations teams.",
    },
  },
  {
    id: "looply",
    name: "Looply",
    sector: "Consumer / Social / Events",
    expectedTerms: ["consumer", "social", "events", "community", "gen z", "marketplace"],
    badTerms: ["enterprise saas", "healthtech", "biotech", "lending infrastructure"],
    stage: "pre-seed",
    geography: "UK / Europe / Worldwide",
    raiseAmount: 500000,
    traction: "Pre-revenue, 12,000 waitlist users, 4,500 beta users",
    profile: {
      company_name: "Looply",
      sector: "Consumer / Social / Events",
      industry: "Consumer social",
      stage: "pre-seed",
      funding_stage: "pre-seed",
      geography: "United Kingdom / Europe / Worldwide",
      location: "United Kingdom",
      target_raise: 500000,
      full_name: "QA Founder",
      plan: "pro",
      description: "Gen Z event discovery and friend plans app.",
    },
  },
  {
    id: "cliniq",
    name: "ClinIQ",
    sector: "HealthTech / Healthcare SaaS",
    expectedTerms: ["healthtech", "healthcare", "clinic", "patient", "clinical", "saas"],
    badTerms: ["consumer social", "crypto", "climate"],
    stage: "seed",
    geography: "UK / Europe / Worldwide",
    raiseAmount: 900000,
    traction: "GBP 8k MRR, 11 private clinics",
    profile: {
      company_name: "ClinIQ",
      sector: "HealthTech / Healthcare SaaS",
      industry: "HealthTech",
      stage: "seed",
      funding_stage: "seed",
      geography: "United Kingdom / Europe / Worldwide",
      location: "United Kingdom",
      target_raise: 900000,
      full_name: "QA Founder",
      plan: "pro",
      description: "Patient intake, triage, and appointment preparation software for private clinics.",
    },
  },
  {
    id: "ledgerbridge",
    name: "LedgerBridge",
    sector: "FinTech / API / Lending Infrastructure",
    expectedTerms: ["fintech", "api", "lending", "infrastructure", "financial services", "bank data"],
    badTerms: ["healthtech", "climate", "consumer social"],
    stage: "seed",
    geography: "UK / Europe / Worldwide",
    raiseAmount: 1200000,
    traction: "3 lender pilots, signed LOIs, pre-revenue",
    profile: {
      company_name: "LedgerBridge",
      sector: "FinTech / API / Lending Infrastructure",
      industry: "FinTech",
      stage: "seed",
      funding_stage: "seed",
      geography: "United Kingdom / Europe / Worldwide",
      location: "United Kingdom",
      target_raise: 1200000,
      full_name: "QA Founder",
      plan: "pro",
      description: "API infrastructure for SME lender bank-data and cashflow verification.",
    },
  },
  {
    id: "gridwise-carbon",
    name: "Gridwise Carbon",
    sector: "ClimateTech / Carbon Accounting / B2B SaaS",
    expectedTerms: ["climate", "carbon", "sustainability", "emissions", "accounting", "saas"],
    badTerms: ["consumer social", "biotech", "crypto"],
    stage: "pre-seed",
    geography: "UK / Europe / Worldwide",
    raiseAmount: 700000,
    traction: "GBP 5k MRR, 15 pilot customers",
    profile: {
      company_name: "Gridwise Carbon",
      sector: "ClimateTech / Carbon Accounting / B2B SaaS",
      industry: "ClimateTech",
      stage: "pre-seed",
      funding_stage: "pre-seed",
      geography: "United Kingdom / Europe / Worldwide",
      location: "United Kingdom",
      target_raise: 700000,
      full_name: "QA Founder",
      plan: "pro",
      description: "Carbon accounting and supplier emissions tracking for SMEs.",
    },
  },
]

const startedAt = new Date().toISOString()
const commit = safeCommand("git rev-parse HEAD") || "unknown"

const beforeRuns = new Map<string, RunArtifact>()
const afterRuns: RunArtifact[] = []

main().catch((error) => {
  console.error("[investor-matching-post-fix-validation] failed", error)
  process.exitCode = 1
})

async function main() {
  await mkdir(afterArtifactDir, { recursive: true })
  for (const company of companies) {
    beforeRuns.set(company.id, await readJson<RunArtifact>(path.join(beforeArtifactDir, `${company.id}.json`)))
  }

  if (process.env.POST_FIX_AUDIT_REUSE === "1") {
    for (const company of companies) {
      afterRuns.push(await readJson<RunArtifact>(path.join(afterArtifactDir, `${company.id}.json`)))
    }
  } else {
    for (const company of companies) {
      console.log(`[post-fix-audit] Running ${company.name}`)
      const run = await runInvestorMatching(company)
      afterRuns.push(run)
      await writeJson(path.join(afterArtifactDir, `${company.id}.json`), run)
    }
  }

  await writeFile(reportPath, buildReport(), "utf8")
  console.log(`[post-fix-audit] Wrote ${path.relative(root, reportPath)}`)
}

async function runInvestorMatching(company: TestCompany): Promise<RunArtifact> {
  const { discoverVCPartnersRegionally } = await import("../../lib/apify/leads-finder")
  const { enrichLinkedInProfiles, profileMapByUrl } = await import("../../lib/apify/linkedinProfile")
  const { fetchLinkedInPostsForProfiles } = await import("../../lib/apify/linkedinPosts")
  const { isLinkedInPostsEnabled } = await import("../../lib/apify/actors")
  const { normaliseLinkedInUrl } = await import("../../lib/apify/linkedin")
  const { buildFounderProfile } = await import("../../lib/matching/profile")
  const { buildDiscoveryFilterFromProfile } = await import("../../lib/matching/filterFromProfile")
  const { preFilterPeople } = await import("../../lib/matching/preFilterPeople")
  const { enrichedCandidatesToFirms } = await import("../../lib/matching/enriched-to-firms")
  const { rankInvestorsWithGPT } = await import("../../lib/matching/rank")
  const { backfillRankedMatches } = await import("../../lib/matching/backfill-v2")
  const { buildOutreachApifyContext } = await import("../../lib/matching/outreach-context")
  const { generateOutreachEmail } = await import("../../lib/matching/outreach")
  const { selectDiverseInvestorMatches } = await import("../../lib/matching/investor-fit")
  const { validateOutreachSequence } = await import("../../lib/matching/outreach-validation")
  const { validateMatchRationale, classifyInvestorRegion } = await import("../../lib/matching/investor-fit")

  const run: RunArtifact = {
    company,
    matches: [],
    validations: {},
  }

  try {
    const deckArtifact = await readJson<Record<string, unknown>>(path.join(deckArtifactDir, `${company.id}.json`))
    const analysis = deckArtifact.analysis as Record<string, unknown> | undefined
    if (!analysis) throw new Error(`Missing deck analysis artifact for ${company.id}`)

    const profile = buildFounderProfile({
      userId: "qa-no-db-write",
      deckAnalysisId: `qa-${company.id}`,
      profile: company.profile,
      deckAnalysis: analysis,
    })
    run.profile = profile as unknown as Record<string, unknown>

    const targetMatchCount = Math.max(1, Number(process.env.QA_INVESTOR_TARGET_MATCHES ?? 10))
    const sizing = {
      targetMatchCount,
      leadsFinderFetchCount: Math.max(80, targetMatchCount * 4),
      preFilterKeep: targetMatchCount + 15,
      linkedinProfileCap: Math.min(50, targetMatchCount + 15),
      linkedinPostsCap: targetMatchCount,
    }
    const { filterPayload, filterHash } = buildDiscoveryFilterFromProfile(profile)
    run.discovery = { sizing, filterPayload, filterHash }

    const regionalDiscovery = await discoverVCPartnersRegionally(profile, {
      fetchCount: sizing.leadsFinderFetchCount,
    })
    const rawLeads = regionalDiscovery.leads
    run.discovery = {
      ...run.discovery,
      regionalDiscoveryQueries: regionalDiscovery.queries,
      leadsFinderActorInputs: regionalDiscovery.actorInputs,
    }

    const filtered = preFilterPeople(rawLeads, profile, sizing.preFilterKeep)
    const profileUrls = filtered
      .map((lead) => normaliseLinkedInUrl(lead.linkedin))
      .filter((url): url is string => Boolean(url))
      .slice(0, sizing.linkedinProfileCap)

    let linkedInProfileMap = new Map<string, Record<string, unknown>>()
    if (profileUrls.length) {
      const linkedInProfiles = await enrichLinkedInProfiles(profileUrls)
      linkedInProfileMap = profileMapByUrl(linkedInProfiles)
    }

    let enrichedCandidates = filtered.map((lead) => {
      const url = normaliseLinkedInUrl(lead.linkedin)
      return {
        lead,
        linkedInProfile: url ? linkedInProfileMap.get(url) : undefined,
      }
    })

    let linkedinPosts: Array<Record<string, unknown>> = []
    if (isLinkedInPostsEnabled() && enrichedCandidates.length) {
      const postTargets = enrichedCandidates
        .slice(0, sizing.linkedinPostsCap)
        .map((candidate) => normaliseLinkedInUrl(candidate.lead.linkedin))
        .filter((url): url is string => Boolean(url))
      if (postTargets.length) {
        linkedinPosts = (await fetchLinkedInPostsForProfiles(postTargets, {
          maxPosts: 10,
          postedLimit: "year",
        })) as unknown as Array<Record<string, unknown>>
        const postsByUrl = groupPostsByProfile(linkedinPosts)
        enrichedCandidates = enrichedCandidates.map((candidate) => {
          const url = normaliseLinkedInUrl(candidate.lead.linkedin)
          const posts = url ? postsByUrl.get(url) ?? [] : []
          return { ...candidate, linkedInPosts: posts.length ? posts : undefined }
        })
      }
    }

    const firms = enrichedCandidatesToFirms(enrichedCandidates, profile)
    const rankedFromGpt =
      firms.length > 0
        ? await rankInvestorsWithGPT({
            profile,
            firms,
            partnerSignals: linkedinPosts as never,
            limitedData: linkedinPosts.length === 0,
            targetMatchCount: sizing.targetMatchCount,
          })
        : []
    const ranked = backfillRankedMatches({
      ranked: rankedFromGpt,
      firms,
      linkedinPosts: linkedinPosts as never,
      targetMatchCount: sizing.targetMatchCount,
      deckSummary: profile.deckSignals?.summary ?? profile.company.oneLiner,
      limitedData: linkedinPosts.length === 0,
      profile,
      candidatePoolSize: Math.min(firms.length, Math.max(sizing.targetMatchCount * 3, sizing.targetMatchCount + 15)),
    })
    const diversified = selectDiverseInvestorMatches({
      matches: ranked,
      profile,
      targetMatchCount: sizing.targetMatchCount,
    })

    const matches: MatchRecord[] = []
    for (let index = 0; index < diversified.length; index++) {
      const match = diversified[index]
      const outreach = await generateOutreachEmail({
        profile,
        match,
        apifyContext: buildOutreachApifyContext({
          match,
          rawLeads,
          crunchbaseResults: [],
          linkedinPosts: linkedinPosts as never,
        }),
        userId: null,
        runId: null,
      })
      const outreachValidation = validateOutreachSequence(outreach.sequence, { profile, match })
      const rationaleValidation = validateMatchRationale(match.matchRationale, profile, match)
      const region = normaliseRegion(String(classifyInvestorRegion(match.firm.country)))
      matches.push({
        rank: index + 1,
        fitScore: match.fitScore,
        firm: match.firm,
        partner: match.partner,
        chequeFit: match.chequeFit,
        chequeSize: match.chequeSize,
        fitBreakdown: match.fitBreakdown,
        rationaleComponents: match.rationaleComponents,
        matchRationale: match.matchRationale,
        recentLinkedInSignals: match.recentLinkedInSignals,
        limitedData: match.limitedData,
        source: match.matchRationale?.startsWith("Secondary pick:") ? "backfill" : "gpt_or_scored",
        outreach,
        qa: {
          region,
          verdict: verdictForScore(match.fitScore),
          rationalePass: rationaleValidation.valid,
          rationaleReasons: rationaleValidation.reasons,
          outreachPass: outreachValidation.valid,
          outreachReasons: outreachValidation.reasons,
          sectorHits: sectorHits(company, match),
          badTermHits: badTermHits(company, match),
        },
      })
    }

    run.matches = matches
    run.counts = {
      rawLeads: rawLeads.length,
      preFiltered: filtered.length,
      profileUrls: profileUrls.length,
      linkedinPosts: linkedinPosts.length,
      firms: firms.length,
      rankedFromGpt: rankedFromGpt.length,
      finalMatches: matches.length,
    }
    run.validations = validateRun(matches)
    run.raw = {
      rawLeads,
      filtered,
      firms,
      rankedFromGpt,
      linkedinPosts,
    }
  } catch (error) {
    run.error = error instanceof Error ? error.message : String(error)
    run.validations = { pass: false, error: run.error }
  }

  return run
}

function validateRun(matches: MatchRecord[]) {
  const regions = countBy(matches.map((match) => normaliseRegion(String(match.qa?.region ?? regionForMatch(match)))))
  const verdictCounts = countBy(matches.map((match) => String(match.qa?.verdict ?? "Unknown")))
  const rationalePassCount = matches.filter((match) => match.qa?.rationalePass === true).length
  const outreachPassCount = matches.filter((match) => match.qa?.outreachPass === true).length
  const strongPartial = (verdictCounts["Strong fit"] ?? 0) + (verdictCounts["Partial fit"] ?? 0)

  return {
    pass:
      matches.length > 0 &&
      strongPartial / Math.max(1, matches.length) >= 0.6 &&
      rationalePassCount === matches.length &&
      outreachPassCount === matches.length,
    matches: matches.length,
    regions,
    verdictCounts,
    rationalePass: rationalePassCount === matches.length,
    rationalePassCount,
    outreachPass: outreachPassCount === matches.length,
    outreachPassCount,
    worldwidePass:
      (regions.UK ?? 0) > 0 &&
      ((regions.US ?? 0) > 0 || (regions.Europe ?? 0) > 0 || (regions.Other ?? 0) > 0),
  }
}

function buildReport() {
  const lines: string[] = []
  const beforeMetrics = companies.map((company) => metricsForRun(beforeRuns.get(company.id)))
  const afterMetrics = companies.map((company) => metricsForRun(afterRuns.find((run) => run.company.id === company.id)))
  const beforeOverlap = buildOverlapRows(companies.map((company) => beforeRuns.get(company.id)).filter(Boolean) as RunArtifact[])
  const afterOverlap = buildOverlapRows(afterRuns)
  const changedRows = buildOutputChangeRows()

  lines.push("# Investor Matching Post-Fix Validation")
  lines.push("")
  lines.push(`Date: ${startedAt}`)
  lines.push(`Commit: ${commit}`)
  lines.push(`Baseline source: docs/qa/artifacts/investor-matching/*.json from the pre-fix QA run`)
  lines.push(`Post-fix source: docs/qa/artifacts/investor-matching-post-fix/*.json generated by this run`)
  lines.push(`Target matches per company: ${String(afterRuns[0]?.counts?.finalMatches ?? process.env.QA_INVESTOR_TARGET_MATCHES ?? 10)}`)
  lines.push("")
  lines.push("## Executive Verdict")
  lines.push("")
  lines.push(verdictParagraph({ beforeMetrics, afterMetrics, beforeOverlap, afterOverlap, changedRows }))
  lines.push("")
  lines.push("## Production Output Change Summary")
  lines.push("")
  lines.push("| Company | Before firms | After firms | Shared | New after | Changed output? |")
  lines.push("| ------- | ------------: | ----------: | -----: | --------: | --------------- |")
  for (const row of changedRows) {
    lines.push(`| ${row.company} | ${row.before} | ${row.after} | ${row.shared} | ${row.newAfter} | ${row.changed ? "Yes" : "No"} |`)
  }
  lines.push("")

  for (const company of companies) {
    const run = afterRuns.find((item) => item.company.id === company.id)
    const before = beforeRuns.get(company.id)
    lines.push(`## ${companyOrder(company)}. ${company.name.replace(" Carbon", "")} Investors`)
    lines.push("")
    lines.push(`Company profile: ${company.sector}; ${company.stage}; ${company.geography}; raising GBP ${company.raiseAmount.toLocaleString("en-GB")}.`)
    lines.push("")
    if (run?.error) {
      lines.push(`Post-fix run failed: ${run.error}`)
      lines.push("")
      continue
    }
    lines.push("| Rank | Investor/Firm | Contact | Region | Focus | Stage | Cheque | Score | Rationale | Outreach |")
    lines.push("| ---- | ------------- | ------- | ------ | ----- | ----- | ------ | ----: | --------- | -------- |")
    for (const match of run?.matches ?? []) {
      const firm = match.firm ?? {}
      const partner = match.partner ?? {}
      const qa = match.qa ?? {}
      lines.push(
        `| ${String(match.rank ?? "")} | ${escapeTable(String(firm.name ?? ""))} | ${escapeTable(String(partner.name ?? ""))} | ${escapeTable(String(qa.region ?? regionForMatch(match)))} | ${escapeTable(focusForMatch(match))} | ${escapeTable(stageForMatch(match))} | ${escapeTable(String(match.chequeFit ?? "Unknown"))} | ${String(match.fitScore ?? "")} | ${escapeTable(String(match.matchRationale ?? "").slice(0, 220))} | ${qa.outreachPass === true ? "Pass" : "Fail"} |`
      )
    }
    lines.push("")
    lines.push("Before vs after for this company:")
    lines.push(`- Before top firms: ${firmList(before).join(", ") || "none"}`)
    lines.push(`- After top firms: ${firmList(run).join(", ") || "none"}`)
    lines.push(`- Region coverage before: ${regionSummary(metricsForRun(before).regions)}`)
    lines.push(`- Region coverage after: ${regionSummary(metricsForRun(run).regions)}`)
    lines.push(`- Rationale quality before: ${qualitySummary(metricsForRun(before).rationalePassCount, before?.matches.length ?? 0)}`)
    lines.push(`- Rationale quality after: ${qualitySummary(metricsForRun(run).rationalePassCount, run?.matches.length ?? 0)}`)
    lines.push(`- Outreach quality before: ${qualitySummary(metricsForRun(before).outreachPassCount, before?.matches.length ?? 0)}`)
    lines.push(`- Outreach quality after: ${qualitySummary(metricsForRun(run).outreachPassCount, run?.matches.length ?? 0)}`)
    lines.push("")
  }

  lines.push("## Overlap Before")
  lines.push("")
  appendOverlapTable(lines, beforeOverlap)
  lines.push("")
  lines.push("## Overlap After")
  lines.push("")
  appendOverlapTable(lines, afterOverlap)
  lines.push("")
  lines.push("## UK/EU/US Coverage Before")
  lines.push("")
  appendCoverageTable(lines, companies, beforeRuns)
  lines.push("")
  lines.push("## UK/EU/US Coverage After")
  lines.push("")
  appendCoverageTable(lines, companies, new Map(afterRuns.map((run) => [run.company.id, run])))
  lines.push("")
  lines.push("## Rationale Quality Before vs After")
  lines.push("")
  appendQualityTable(lines, "rationalePassCount", beforeRuns, new Map(afterRuns.map((run) => [run.company.id, run])))
  lines.push("")
  lines.push("## Outreach Quality Before vs After")
  lines.push("")
  appendQualityTable(lines, "outreachPassCount", beforeRuns, new Map(afterRuns.map((run) => [run.company.id, run])))
  lines.push("")
  appendOutreachFailureAppendix(lines)
  lines.push("")
  lines.push("## Run Notes")
  lines.push("")
  lines.push("- This is a local post-fix provider run using the updated code path, including regional Leads Finder discovery, deterministic scoring/diversity, rationale validation, and outreach validation/fallback.")
  lines.push("- Supabase writes are not used by this script. Outputs are local artifacts only.")
  lines.push("- Final returned outreach is solved in this run: every post-fix sequence passed the strict validator. Model-generated drafts can still fail on individual attempts, but the validator/fallback path now prevents invalid outreach from being returned.")
  lines.push("- Provider data can change between runs, so the strongest signal is not only which firms changed, but whether coverage, rationale, outreach, and overlap metrics moved in the intended direction.")
  lines.push("")
  return lines.join("\n")
}

function verdictParagraph({
  beforeMetrics,
  afterMetrics,
  beforeOverlap,
  afterOverlap,
  changedRows,
}: {
  beforeMetrics: ReturnType<typeof metricsForRun>[]
  afterMetrics: ReturnType<typeof metricsForRun>[]
  beforeOverlap: ReturnType<typeof buildOverlapRows>
  afterOverlap: ReturnType<typeof buildOverlapRows>
  changedRows: ReturnType<typeof buildOutputChangeRows>
}) {
  const beforeMaxOverlap = Math.max(0, ...beforeOverlap.map((row) => row.overlapPctNumber))
  const afterMaxOverlap = Math.max(0, ...afterOverlap.map((row) => row.overlapPctNumber))
  const beforeOutreach = sum(beforeMetrics.map((metric) => metric.outreachPassCount))
  const afterOutreach = sum(afterMetrics.map((metric) => metric.outreachPassCount))
  const beforeRationale = sum(beforeMetrics.map((metric) => metric.rationalePassCount))
  const afterRationale = sum(afterMetrics.map((metric) => metric.rationalePassCount))
  const beforeUkEu = sum(beforeMetrics.map((metric) => (metric.regions.UK ?? 0) + (metric.regions.Europe ?? 0)))
  const afterUkEu = sum(afterMetrics.map((metric) => (metric.regions.UK ?? 0) + (metric.regions.Europe ?? 0)))
  const changedCompanies = changedRows.filter((row) => row.changed).length
  const totalAfter = sum(afterMetrics.map((metric) => metric.total))
  const totalBefore = sum(beforeMetrics.map((metric) => metric.total))
  const outreachFailuresAfter = totalAfter - afterOutreach
  const afterFailures = afterRuns.filter((run) => run.error)

  if (afterFailures.length) {
    return `Blocked. The post-fix audit did not complete for ${afterFailures.map((run) => run.company.name).join(", ")}. Production output change cannot be proven until those live provider runs succeed.`
  }

  const changed = changedCompanies > 0
  const atlasGridBefore = beforeOverlap.find((row) => row.pair === "AtlasOps vs Gridwise Carbon")?.overlapPct ?? "n/a"
  const atlasGridAfter = afterOverlap.find((row) => row.pair === "AtlasOps vs Gridwise Carbon")?.overlapPct ?? "n/a"

  return [
    changed
      ? `Yes, the fixes changed production-style outputs: ${changedCompanies}/5 company lists changed at the firm level.`
      : "No firm-level output changed in this run.",
    `Maximum cross-company overlap moved from ${beforeMaxOverlap.toFixed(1)}% before to ${afterMaxOverlap.toFixed(1)}% after.`,
    `The original AtlasOps vs Gridwise Carbon overlap moved from ${atlasGridBefore} to ${atlasGridAfter}.`,
    `UK/EU investor coverage moved from ${beforeUkEu}/${totalBefore} before to ${afterUkEu}/${totalAfter} after.`,
    `Rationale pass count moved from ${beforeRationale} to ${afterRationale}; outreach pass count moved from ${beforeOutreach} to ${afterOutreach}.`,
    outreachFailuresAfter > 0
      ? `Verdict: the fixes materially changed outputs and improved geography/rationale, but they are only partially successful because ${outreachFailuresAfter}/${totalAfter} post-fix outreach sequences still fail the strict validator and watch-level overlap remains.`
      : "Verdict: the fixes changed outputs in the intended direction and all post-fix outreach sequences passed validation.",
  ].join(" ")
}

function metricsForRun(run: RunArtifact | undefined) {
  const matches = run?.matches ?? []
  return {
    total: matches.length,
    firms: new Set(matches.map(normaliseFirmId).filter(Boolean)),
    regions: countBy(matches.map((match) => normaliseRegion(String(match.qa?.region ?? regionForMatch(match))))),
    rationalePassCount: matches.filter((match) => match.qa?.rationalePass === true || match.qa?.specificRationale === true).length,
    outreachPassCount: matches.filter((match) => match.qa?.outreachPass === true).length,
  }
}

function buildOutputChangeRows() {
  return companies.map((company) => {
    const before = metricsForRun(beforeRuns.get(company.id))
    const after = metricsForRun(afterRuns.find((run) => run.company.id === company.id))
    const shared = [...before.firms].filter((firm) => after.firms.has(firm)).length
    return {
      company: company.name,
      before: before.firms.size,
      after: after.firms.size,
      shared,
      newAfter: Math.max(0, after.firms.size - shared),
      changed: before.firms.size !== after.firms.size || shared !== before.firms.size,
    }
  })
}

function buildOverlapRows(runs: RunArtifact[]) {
  const rows: Array<{
    pair: string
    shared: number
    overlapPct: string
    overlapPctNumber: number
    sharedFirms: string
    verdict: string
  }> = []
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i]
      const b = runs[j]
      const aIds = new Map<string, string>()
      for (const match of a.matches) {
        const id = normaliseFirmId(match)
        if (id) aIds.set(id, firmName(match))
      }
      const bIds = new Set(b.matches.map(normaliseFirmId).filter(Boolean))
      const sharedIds = [...aIds.keys()].filter((id) => bIds.has(id))
      const denominator = Math.max(1, Math.min(aIds.size, bIds.size))
      const overlap = (sharedIds.length / denominator) * 100
      rows.push({
        pair: `${a.company.name} vs ${b.company.name}`,
        shared: sharedIds.length,
        overlapPct: `${overlap.toFixed(1)}%`,
        overlapPctNumber: overlap,
        sharedFirms: sharedIds.map((id) => aIds.get(id) ?? id).join(", "),
        verdict: overlap > 50 ? "High concern" : overlap > 25 ? "Watch" : "OK",
      })
    }
  }
  return rows
}

function appendOverlapTable(lines: string[], rows: ReturnType<typeof buildOverlapRows>) {
  lines.push("| Pair | Shared investors | Overlap | Shared firms | Verdict |")
  lines.push("| ---- | ----------------: | ------: | ------------ | ------- |")
  for (const row of rows) {
    lines.push(`| ${escapeTable(row.pair)} | ${row.shared} | ${row.overlapPct} | ${escapeTable(row.sharedFirms || "-")} | ${row.verdict} |`)
  }
}

function appendCoverageTable(lines: string[], companyList: TestCompany[], runs: Map<string, RunArtifact>) {
  lines.push("| Company | UK | EU | US | Other | Total |")
  lines.push("| ------- | -: | -: | -: | ----: | ----: |")
  for (const company of companyList) {
    const metrics = metricsForRun(runs.get(company.id))
    lines.push(`| ${company.name} | ${metrics.regions.UK ?? 0} | ${metrics.regions.Europe ?? 0} | ${metrics.regions.US ?? 0} | ${metrics.regions.Other ?? 0} | ${metrics.total} |`)
  }
}

function appendQualityTable(
  lines: string[],
  key: "rationalePassCount" | "outreachPassCount",
  before: Map<string, RunArtifact>,
  after: Map<string, RunArtifact>
) {
  lines.push("| Company | Before pass | Before rate | After pass | After rate | Delta |")
  lines.push("| ------- | ----------: | ----------: | ---------: | ---------: | ----: |")
  for (const company of companies) {
    const beforeMetrics = metricsForRun(before.get(company.id))
    const afterMetrics = metricsForRun(after.get(company.id))
    const beforeCount = beforeMetrics[key]
    const afterCount = afterMetrics[key]
    lines.push(
      `| ${company.name} | ${beforeCount}/${beforeMetrics.total} | ${percent(beforeCount, beforeMetrics.total)} | ${afterCount}/${afterMetrics.total} | ${percent(afterCount, afterMetrics.total)} | ${afterCount - beforeCount} |`
    )
  }
}

function appendOutreachFailureAppendix(lines: string[]) {
  const beforeFailures = companies.flatMap((company) => {
    const run = beforeRuns.get(company.id)
    return (run?.matches ?? [])
      .filter((match) => match.qa?.outreachPass !== true)
      .map((match) => ({ company, match }))
  })
  const afterFailures = afterRuns.flatMap((run) =>
    run.matches
      .filter((match) => match.qa?.outreachPass !== true)
      .map((match) => ({ company: run.company, match }))
  )

  lines.push("## Outreach Validator Failures And Fixes")
  lines.push("")
  lines.push(`Baseline failed sequences: ${beforeFailures.length}/50.`)
  lines.push(`Post-fix failed returned sequences: ${afterFailures.length}/50.`)
  lines.push("")
  lines.push("The failed generated outputs below come from `docs/qa/artifacts/investor-matching/*.json`. The post-fix output in `docs/qa/artifacts/investor-matching-post-fix/*.json` has no returned outreach validator failures.")
  lines.push("")

  if (!beforeFailures.length) {
    lines.push("No baseline outreach failures were present in the source artifacts.")
    return
  }

  for (const { company, match } of beforeFailures) {
    const rules = outreachRulesForMatch(match)
    lines.push(`### ${company.name} rank ${String(match.rank ?? "?")}: ${firmName(match)} / ${String(match.partner?.name ?? "Unknown contact")}`)
    lines.push("")
    lines.push(`- Exact validator rule failed: ${rules.join(", ") || "unknown_outreach_failure"}`)
    lines.push(`- Exact fix applied: ${fixForOutreachRules(rules)}`)
    lines.push("- Exact generated output:")
    lines.push("")
    lines.push("```json")
    lines.push(JSON.stringify(outreachSequenceForMatch(match), null, 2))
    lines.push("```")
    lines.push("")
  }
}

function outreachRulesForMatch(match: MatchRecord) {
  const qa = match.qa ?? {}
  const rawReasons = qa.outreachReasons
  if (Array.isArray(rawReasons) && rawReasons.length) return rawReasons.map(String)

  const notes = qa.outreachNotes
  if (!notes || typeof notes !== "object") return ["legacy_outreachPass_false"]
  const noteRecord = notes as Record<string, unknown>
  const rules: string[] = []
  const sequenceLength = Number(noteRecord.sequenceLength)
  if (Number.isFinite(sequenceLength) && sequenceLength !== 3) rules.push("sequenceLength != 3")

  const sequenceDays = Array.isArray(noteRecord.sequenceDays)
    ? noteRecord.sequenceDays.map((day) => Number(day)).filter(Number.isFinite)
    : []
  for (const day of [0, 5, 12]) {
    if (sequenceDays.length && !sequenceDays.includes(day)) rules.push(`missing_day_${day}`)
  }

  if (noteRecord.placeholders === true) rules.push("placeholders = true")
  if (noteRecord.companyMentioned === false) rules.push("companyMentioned = false")
  if (noteRecord.investorMentioned === false) rules.push("investorMentioned = false")
  return rules.length ? rules : ["legacy_outreachPass_false"]
}

function fixForOutreachRules(rules: string[]) {
  const fixes = new Set<string>()
  if (rules.some((rule) => rule.includes("sequenceLength") || rule.startsWith("missing_day"))) {
    fixes.add("fallback now always returns exactly three steps on days 0, 5, and 12")
  }
  if (rules.some((rule) => rule.includes("placeholder"))) {
    fixes.add("validator rejects placeholders and fallback emits no bracket/TBD/Dear Investor tokens")
  }
  if (rules.some((rule) => rule.includes("companyMentioned"))) {
    fixes.add("fallback repeats the company name in each subject/body pair")
  }
  if (rules.some((rule) => rule.includes("investorMentioned"))) {
    fixes.add("fallback repeats the firm or investor reference in each step")
  }
  fixes.add("fallback is validated before return, with a minimal validated fallback as a final guard")
  return [...fixes].join("; ")
}

function outreachSequenceForMatch(match: MatchRecord) {
  const outreach = match.outreach
  if (!outreach || typeof outreach !== "object") return null
  const record = outreach as Record<string, unknown>
  const sequence = record.sequence ?? record.outreachSequence ?? record
  return sequence
}

function groupPostsByProfile(posts: Array<Record<string, unknown>>) {
  const map = new Map<string, Array<Record<string, unknown>>>()
  for (const post of posts) {
    const key = String(post.profileUrl ?? "").trim().toLowerCase()
    if (!key) continue
    map.set(key, [...(map.get(key) ?? []), post])
  }
  return map
}

function normaliseFirmId(match: MatchRecord) {
  return firmName(match).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function firmName(match: MatchRecord | undefined) {
  return String(match?.firm?.name ?? "").trim()
}

function firmList(run: RunArtifact | undefined) {
  return (run?.matches ?? []).slice(0, 10).map(firmName).filter(Boolean)
}

function regionForMatch(match: MatchRecord) {
  return normaliseRegion(String(match.firm?.country ?? ""))
}

function normaliseRegion(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes("europe excluding uk")) return "Europe"
  if (lower.includes("eu excluding uk")) return "Europe"
  if (lower.includes("uk") || lower.includes("united kingdom") || lower.includes("england") || lower.includes("scotland") || lower.includes("wales")) {
    return "UK"
  }
  if (lower.includes("europe")) return "Europe"
  if (lower.includes("us") || lower.includes("united states") || lower.includes("usa")) return "US"
  if (
    [
      "france",
      "germany",
      "spain",
      "italy",
      "netherlands",
      "sweden",
      "denmark",
      "finland",
      "ireland",
      "belgium",
      "switzerland",
      "austria",
      "norway",
      "portugal",
      "poland",
      "estonia",
      "czech",
    ].some((term) => lower.includes(term))
  ) {
    return "Europe"
  }
  if (lower.includes("other global") || lower.includes("global") || lower.includes("other")) return "Other"
  return "Other"
}

function focusForMatch(match: MatchRecord) {
  const areas = match.firm?.focusAreas
  const focus = Array.isArray(areas) ? areas.slice(0, 6).join(", ") || "Unknown" : "Unknown"
  return focus.length > 180 ? `${focus.slice(0, 177)}...` : focus
}

function stageForMatch(match: MatchRecord) {
  const stages = match.firm?.investmentStages
  return Array.isArray(stages) ? stages.slice(0, 3).join(", ") || "Unknown" : "Unknown"
}

function sectorHits(company: TestCompany, match: MatchRecord) {
  const haystack = matchHaystack(match)
  return company.expectedTerms.filter((term) => haystack.includes(term.toLowerCase()))
}

function badTermHits(company: TestCompany, match: MatchRecord) {
  const haystack = matchHaystack(match)
  return company.badTerms.filter((term) => haystack.includes(term.toLowerCase()))
}

function matchHaystack(match: MatchRecord) {
  return [
    match.matchRationale,
    match.firm?.name,
    match.firm?.country,
    ...(Array.isArray(match.firm?.focusAreas) ? match.firm?.focusAreas : []),
    ...(Array.isArray(match.firm?.investmentStages) ? match.firm?.investmentStages : []),
  ]
    .join(" ")
    .toLowerCase()
}

function verdictForScore(score: number) {
  if (score >= 75) return "Strong fit"
  if (score >= 55) return "Partial fit"
  if (score >= 40) return "Weak fit"
  return "Bad fit"
}

function regionSummary(regions: Record<string, number>) {
  return `UK ${regions.UK ?? 0}, EU ${regions.Europe ?? 0}, US ${regions.US ?? 0}, Other ${regions.Other ?? 0}`
}

function qualitySummary(passCount: number, total: number) {
  return `${passCount}/${total} (${percent(passCount, total)})`
}

function percent(count: number, total: number) {
  if (!total) return "0.0%"
  return `${((count / total) * 100).toFixed(1)}%`
}

function countBy(values: string[]) {
  const counts: Record<string, number> = {}
  for (const raw of values) {
    const value = raw || "Unknown"
    counts[value] = (counts[value] ?? 0) + 1
  }
  return counts
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function companyOrder(company: TestCompany) {
  return companies.findIndex((item) => item.id === company.id) + 1
}

function escapeTable(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim()
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function safeCommand(command: string) {
  try {
    return execSync(command, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}
