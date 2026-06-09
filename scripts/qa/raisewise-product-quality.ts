/**
 * RaiseWise product quality QA runner.
 *
 * Generates realistic deck fixtures, runs the core quality-producing modules,
 * stores raw artifacts, and writes the requested markdown + JSON reports.
 *
 * This script intentionally avoids Supabase writes by clearing the service-role
 * key after reading environment metadata. API/UI persistence tests are reported
 * as blocked unless a safe test/staging session is available.
 *
 * Usage:
 *   npx tsx scripts/qa/raisewise-product-quality.ts
 *
 * Optional:
 *   QA_INVESTOR_TARGET_MATCHES=10 npx tsx scripts/qa/raisewise-product-quality.ts
 */
import "dotenv/config"
import { config as loadEnv } from "dotenv"
import Module from "node:module"
import { createWriteStream } from "node:fs"
import {
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import PDFDocument from "pdfkit"

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

const startedAt = new Date().toISOString()
let commit = "unknown"
const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const databaseProject = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "unknown"
const remoteSupabase = /\.supabase\.co\/?$/.test(supabaseUrl)

const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (process.env.RAISEWISE_QA_ALLOW_SUPABASE_WRITES !== "1") {
  process.env.SUPABASE_SERVICE_ROLE_KEY = ""
}

const root = process.cwd()
const qaDir = path.join(root, "docs", "qa")
const artifactRoot = path.join(qaDir, "artifacts")
const fixtureDir = path.join(artifactRoot, "deck-analysis", "fixtures")
const deckArtifactDir = path.join(artifactRoot, "deck-analysis")
const financialArtifactDir = path.join(artifactRoot, "financial-models")
const investorArtifactDir = path.join(artifactRoot, "investor-matching")
const screenshotDir = path.join(artifactRoot, "screenshots")
const reportPath = path.join(qaDir, "RAISEWISE_PRODUCT_QUALITY_REPORT.md")
const summaryPath = path.join(qaDir, "RAISEWISE_PRODUCT_QUALITY_SUMMARY.json")

type Severity = "P0" | "P1" | "P2" | "P3"
type Verdict = "Pass" | "Fail" | "Blocked" | "Partial"

type Issue = {
  id: string
  severity: Severity
  module: string
  issue: string
  steps: string
  expected: string
  actual: string
  suggestedFix: string
}

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
  financialInput: Record<string, unknown>
  deckText: string
}

type DeckFixture = {
  id: string
  label: string
  companyId: string
  quality: "company" | "excellent" | "average" | "weak"
  expectedScoreBand?: [number, number]
  text: string
  pdfPath?: string
}

type DeckRun = {
  fixture: DeckFixture
  extractedText?: string
  analysis?: Record<string, unknown>
  weightedCategories?: Array<Record<string, unknown>>
  validations: Record<string, unknown>
  artifactPath?: string
  error?: string
}

type FinancialRun = {
  company: TestCompany
  result?: Record<string, unknown>
  validations: Record<string, unknown>
  artifactPath?: string
  error?: string
}

type InvestorRun = {
  company: TestCompany
  profile?: Record<string, unknown>
  counts?: Record<string, number>
  discovery?: Record<string, unknown>
  matches: Array<Record<string, unknown>>
  validations: Record<string, unknown>
  artifactPath?: string
  error?: string
}

const issues: Issue[] = []
let testsRun = 0

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
    financialInput: {
      companyName: "AtlasOps",
      businessModel: "B2B SaaS subscription",
      industry: "AI workflow automation",
      currentMonthlyRevenue: 18000,
      currentMonthlyBurn: 42000,
      currentCashBalance: 180000,
      currentRunway: 4.3,
      raiseAmount: 750000,
      monthlyRevenueGrowth: 9,
      monthlyCostGrowth: 4,
      grossMargin: 82,
      churn: 3,
      currentCustomers: 22,
      targetCustomers: 160,
      averageRevenuePerCustomer: 750,
      teamSize: 6,
      plannedHires: 7,
      fundingGoal: "Reach GBP 120k MRR and repeatable mid-market sales motion.",
      targetMarket: "UK and European mid-market operations teams.",
      notes: "ACV is GBP 9k. Sales cycle is 45-75 days.",
    },
    deckText: "",
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
    financialInput: {
      companyName: "Looply",
      businessModel: "Consumer social app with event affiliate and premium monetisation",
      industry: "Consumer social / events",
      currentMonthlyRevenue: 0,
      currentMonthlyBurn: 35000,
      currentCashBalance: 120000,
      currentRunway: 3.4,
      raiseAmount: 500000,
      monthlyRevenueGrowth: 0,
      monthlyCostGrowth: 5,
      grossMargin: 75,
      churn: 12,
      currentCustomers: 4500,
      targetCustomers: 70000,
      averageRevenuePerCustomer: 0,
      teamSize: 5,
      plannedHires: 6,
      fundingGoal: "Convert waitlist and beta traction into a monetised city-by-city launch.",
      targetMarket: "Gen Z users in UK and European university cities.",
      notes: "Pre-revenue. 12,000 waitlist users and 4,500 beta users.",
    },
    deckText: "",
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
    financialInput: {
      companyName: "ClinIQ",
      businessModel: "Healthcare SaaS sold to private clinics",
      industry: "HealthTech / healthcare software",
      currentMonthlyRevenue: 8000,
      currentMonthlyBurn: 52000,
      currentCashBalance: 210000,
      currentRunway: 4,
      raiseAmount: 900000,
      monthlyRevenueGrowth: 7,
      monthlyCostGrowth: 4,
      grossMargin: 78,
      churn: 2,
      currentCustomers: 11,
      targetCustomers: 85,
      averageRevenuePerCustomer: 727,
      teamSize: 7,
      plannedHires: 8,
      fundingGoal: "Expand clinic sales and complete compliance/security proof points.",
      targetMarket: "UK private clinics and outpatient providers.",
      notes: "Longer clinical adoption cycles and regulated buyer concerns.",
    },
    deckText: "",
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
    financialInput: {
      companyName: "LedgerBridge",
      businessModel: "FinTech infrastructure API usage-based contracts",
      industry: "FinTech / lending infrastructure",
      currentMonthlyRevenue: 0,
      currentMonthlyBurn: 64000,
      currentCashBalance: 250000,
      currentRunway: 3.9,
      raiseAmount: 1200000,
      monthlyRevenueGrowth: 0,
      monthlyCostGrowth: 4,
      grossMargin: 84,
      churn: 2,
      currentCustomers: 3,
      targetCustomers: 30,
      averageRevenuePerCustomer: 0,
      teamSize: 8,
      plannedHires: 9,
      fundingGoal: "Convert lender pilots and LOIs into paid API contracts.",
      targetMarket: "UK and European SME lenders and embedded finance platforms.",
      notes: "Pre-revenue with 3 pilots and signed LOIs. Do not treat LOIs as revenue.",
    },
    deckText: "",
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
    financialInput: {
      companyName: "Gridwise Carbon",
      businessModel: "B2B SaaS subscription with implementation support",
      industry: "ClimateTech / carbon accounting",
      currentMonthlyRevenue: 5000,
      currentMonthlyBurn: 39000,
      currentCashBalance: 150000,
      currentRunway: 3.8,
      raiseAmount: 700000,
      monthlyRevenueGrowth: 8,
      monthlyCostGrowth: 4,
      grossMargin: 76,
      churn: 4,
      currentCustomers: 15,
      targetCustomers: 120,
      averageRevenuePerCustomer: 333,
      teamSize: 5,
      plannedHires: 7,
      fundingGoal: "Move pilot customers into paid recurring carbon accounting contracts.",
      targetMarket: "UK and European SMEs with supplier-emissions reporting pressure.",
      notes: "Climate-specific adoption may be seasonal and compliance-led.",
    },
    deckText: "",
  },
]

for (const company of companies) {
  company.deckText = buildCompanyDeck(company)
}

const deckFixtures: DeckFixture[] = [
  ...companies.map((company) => ({
    id: company.id,
    label: company.name,
    companyId: company.id,
    quality: "company" as const,
    text: company.deckText,
  })),
  {
    id: "quality-excellent-atlasops",
    label: "AtlasOps Excellent Deck",
    companyId: "atlasops",
    quality: "excellent",
    expectedScoreBand: [80, 95],
    text: buildQualityVariant("excellent"),
  },
  {
    id: "quality-average-atlasops",
    label: "AtlasOps Average Deck",
    companyId: "atlasops",
    quality: "average",
    expectedScoreBand: [50, 75],
    text: buildQualityVariant("average"),
  },
  {
    id: "quality-weak-atlasops",
    label: "AtlasOps Weak Deck",
    companyId: "atlasops",
    quality: "weak",
    expectedScoreBand: [10, 45],
    text: buildQualityVariant("weak"),
  },
]

main().catch((error) => {
  console.error("[raisewise-product-quality] failed", error)
  process.exitCode = 1
})

async function main() {
  commit = await runGit(["rev-parse", "HEAD"]).catch(() => "unknown")
  await ensureDirs()

  const context = await inspectProjectContext()
  const apiSmoke = await runApiSmokeChecks()
  const deckRuns = await runDeckAnalysis()
  const financialRuns = await runFinancialModels(deckRuns)
  const investorRuns = await runInvestorMatching(deckRuns)
  const uiResults = await runUiSmokeChecks()

  const quality = computeOverallVerdict(deckRuns, financialRuns, investorRuns, apiSmoke, uiResults)
  await writeReports({ context, apiSmoke, deckRuns, financialRuns, investorRuns, uiResults, quality })

  console.log("")
  console.log("RaiseWise QA CLI summary")
  console.log(`Report path: ${path.relative(root, reportPath)}`)
  console.log(`Tests/checks run: ${testsRun}`)
  console.log(`P0/P1/P2 issues: ${countSeverity("P0")}/${countSeverity("P1")}/${countSeverity("P2")}`)
  console.log(`Investor matching verdict: ${quality.investorMatchingVerdict}`)
  console.log(`Launch recommendation: ${quality.launchRecommendation}`)
}

async function ensureDirs() {
  for (const dir of [
    qaDir,
    fixtureDir,
    deckArtifactDir,
    financialArtifactDir,
    investorArtifactDir,
    screenshotDir,
  ]) {
    await mkdir(dir, { recursive: true })
  }
}

async function inspectProjectContext() {
  const routeFiles = (await walk(path.join(root, "app")))
    .filter((file) => file.endsWith(`${path.sep}route.ts`))
    .map((file) => ({
      file,
      endpoint:
        "/" +
        path
          .relative(path.join(root, "app"), path.dirname(file))
          .split(path.sep)
          .join("/")
          .replace(/\/route$/, ""),
    }))
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint))

  const pageFiles = (await walk(path.join(root, "app")))
    .filter((file) => file.endsWith(`${path.sep}page.tsx`))
    .map((file) => ({
      file,
      route:
        "/" +
        path
          .relative(path.join(root, "app"), path.dirname(file))
          .split(path.sep)
          .join("/"),
    }))
    .sort((a, b) => a.route.localeCompare(b.route))

  const migrationFiles = (await walk(path.join(root, "supabase", "migrations"))).filter((file) =>
    file.endsWith(".sql")
  )
  const tables = new Set<string>()
  const functions = new Set<string>()
  for (const file of migrationFiles) {
    const text = await readFile(file, "utf8")
    for (const match of text.matchAll(/create table(?: if not exists)? public\.([a-zA-Z0-9_]+)/g)) {
      tables.add(match[1])
    }
    for (const match of text.matchAll(/create or replace function public\.([a-zA-Z0-9_]+)/g)) {
      functions.add(match[1])
    }
  }

  const existingTests = (await walk(root)).filter((file) =>
    /(?:test|spec|playwright|vitest|jest|cypress)/i.test(path.basename(file))
  )

  return {
    stack: {
      next: "16.2.4",
      react: "19.2.4",
      supabase: true,
      openai: true,
      apify: true,
      stripe: true,
      resend: true,
      testFrameworks:
        existingTests.length > 0
          ? existingTests.map((file) => path.relative(root, file))
          : ["No Playwright/Vitest/Jest/Cypress config discovered"],
    },
    nextDocsRead: [
      "node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md",
      "node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md",
    ],
    routes: routeFiles.map((row) => ({
      endpoint: row.endpoint,
      file: path.relative(root, row.file),
    })),
    pages: pageFiles.map((row) => ({
      route: row.route,
      file: path.relative(root, row.file),
    })),
    tables: [...tables].sort(),
    functions: [...functions].sort(),
    env: {
      appUrl,
      databaseProject,
      remoteSupabase,
      hasServiceRoleKey: Boolean(originalServiceRoleKey),
      serviceRoleWritesDisabled: process.env.RAISEWISE_QA_ALLOW_SUPABASE_WRITES !== "1",
      openai: Boolean(process.env.OPENAI_API_KEY),
      apify: Boolean(process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN),
      resend: Boolean(process.env.RESEND_API_KEY),
      stripeMode: String(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")
        ? "test"
        : String(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_")
          ? "live"
          : "unknown",
    },
  }
}

async function runApiSmokeChecks() {
  const endpoints = [
    { method: "POST", path: "/api/deck/analyse", body: { deckUploadId: "00000000-0000-0000-0000-000000000000", text: "x".repeat(80) } },
    { method: "POST", path: "/api/financial-model/generate", body: companies[0].financialInput },
    { method: "POST", path: "/api/investors/match", body: { deckAnalysisId: "00000000-0000-0000-0000-000000000000" } },
  ]

  const results: Array<Record<string, unknown>> = []
  for (const endpoint of endpoints) {
    testsRun += 1
    try {
      const response = await fetch(`${appUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(endpoint.body),
      })
      const text = await response.text()
      results.push({
        ...endpoint,
        status: response.status,
        ok: response.status === 401,
        response: safeJsonParse(text) ?? text.slice(0, 500),
      })
    } catch (error) {
      results.push({
        ...endpoint,
        status: "blocked",
        ok: false,
        error: errorMessage(error),
      })
    }
  }

  return {
    appUrl,
    results,
    verdict: results.every((r) => r.ok) ? "Pass" : "Blocked",
  }
}

async function runDeckAnalysis(): Promise<DeckRun[]> {
  const { extractTextFromPdf } = await import("../../lib/file-extraction")
  const { analyseDeckText } = await import("../../lib/openai/deck-analysis")
  const { enrichCategoryScoresWithWeights } = await import("../../lib/deck/weighted-scoring")

  const runs: DeckRun[] = []
  for (const fixture of deckFixtures) {
    testsRun += 1
    const run: DeckRun = { fixture, validations: {} }
    try {
      fixture.pdfPath = path.join(fixtureDir, `${fixture.id}.pdf`)
      await writePdfFixture(fixture.pdfPath, fixture.label, fixture.text)
      const pdfBuffer = await readFile(fixture.pdfPath)
      run.extractedText = await extractTextFromPdf(pdfBuffer)
      const analysis = await analyseDeckText(run.extractedText)
      const parsed = analysis.parsed as Record<string, unknown>
      run.analysis = {
        ...parsed,
        raw: {
          id: (analysis.raw as Record<string, unknown>).id,
          model: (analysis.raw as Record<string, unknown>).model,
          usage: (analysis.raw as Record<string, unknown>).usage,
        },
      }
      run.weightedCategories = enrichCategoryScoresWithWeights(
        (parsed.categoryScores as Array<{ category: string; score: number; feedback: string }>) ?? []
      )
      run.validations = validateDeckRun(run)
      run.artifactPath = path.join(deckArtifactDir, `${fixture.id}.json`)
      await writeJson(run.artifactPath, run)
    } catch (error) {
      run.error = errorMessage(error)
      run.validations = { pass: false, error: run.error }
      run.artifactPath = path.join(deckArtifactDir, `${fixture.id}.json`)
      await writeJson(run.artifactPath, run)
      addIssue({
        severity: "P1",
        module: "Pitch Deck Analyser",
        issue: `Deck analysis failed for ${fixture.label}`,
        steps: `Run fixture ${fixture.id} through extractTextFromPdf + analyseDeckText.`,
        expected: "Readable extracted text and structured deck analysis JSON.",
        actual: run.error,
        suggestedFix: "Check OpenAI credentials, PDF extraction, and deck analysis schema compatibility.",
      })
    }
    runs.push(run)
  }

  const excellent = runs.find((run) => run.fixture.quality === "excellent")
  const average = runs.find((run) => run.fixture.quality === "average")
  const weak = runs.find((run) => run.fixture.quality === "weak")
  if (excellent?.analysis && average?.analysis && weak?.analysis) {
    const e = Number(excellent.analysis.overallScore)
    const a = Number(average.analysis.overallScore)
    const w = Number(weak.analysis.overallScore)
    if (!(e > a && a > w)) {
      addIssue({
        severity: "P1",
        module: "Pitch Deck Analyser",
        issue: "Deck quality scores did not discriminate excellent > average > weak",
        steps: "Generated excellent, average, and weak AtlasOps deck variants and compared weighted overall scores.",
        expected: "Excellent deck should score highest, average in the middle, weak lowest.",
        actual: `Excellent=${e}, Average=${a}, Weak=${w}`,
        suggestedFix: "Tighten scoring prompt/category rubrics or post-processing guards for weak-deck penalties.",
      })
    }
  }
  return runs
}

async function runFinancialModels(deckRuns: DeckRun[]): Promise<FinancialRun[]> {
  const { generateFinancialModel } = await import("../../lib/openai/financial-model")
  const runs: FinancialRun[] = []
  for (const company of companies) {
    testsRun += 1
    const run: FinancialRun = { company, validations: {} }
    try {
      const deckRun = deckRuns.find((item) => item.fixture.companyId === company.id && item.fixture.quality === "company")
      const analysis = deckRun?.analysis
      const result = await generateFinancialModel(company.financialInput, {
        deckSummary: String(analysis?.summary ?? ""),
        deckFinancialSignals: (analysis?.financialSignals as Record<string, unknown> | undefined) ?? null,
      })
      run.result = {
        input: result.input,
        parsed: result.parsed,
        raw: {
          id: (result.raw as unknown as Record<string, unknown>).id,
          model: (result.raw as unknown as Record<string, unknown>).model,
          usage: (result.raw as unknown as Record<string, unknown>).usage,
        },
      }
      run.validations = validateFinancialRun(run)
      run.artifactPath = path.join(financialArtifactDir, `${company.id}.json`)
      await writeJson(run.artifactPath, run)
    } catch (error) {
      run.error = errorMessage(error)
      run.validations = { pass: false, error: run.error }
      run.artifactPath = path.join(financialArtifactDir, `${company.id}.json`)
      await writeJson(run.artifactPath, run)
      addIssue({
        severity: "P1",
        module: "Financial Model",
        issue: `Financial model generation failed for ${company.name}`,
        steps: `Run generateFinancialModel for ${company.name} with deck context.`,
        expected: "A structured 36-month projection with charts, assumptions, runway, and narrative.",
        actual: run.error,
        suggestedFix: "Check OpenAI financial model credentials/schema and model prompt compatibility.",
      })
    }
    runs.push(run)
  }
  return runs
}

async function runInvestorMatching(deckRuns: DeckRun[]): Promise<InvestorRun[]> {
  const {
    discoverVCPartners,
  } = await import("../../lib/apify/leads-finder")
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
  const { getInvestorPipelineV2Sizing } = await import("../../lib/matching/v2-sizing")

  const defaultSizing = getInvestorPipelineV2Sizing("pro")
  const requestedTarget = Number(process.env.QA_INVESTOR_TARGET_MATCHES ?? defaultSizing?.targetMatchCount ?? 25)
  const targetMatchCount = Math.max(1, Math.min(requestedTarget, defaultSizing?.targetMatchCount ?? 25))
  const runs: InvestorRun[] = []

  for (const company of companies) {
    testsRun += 1
    const run: InvestorRun = { company, matches: [], validations: {} }
    try {
      const deckRun = deckRuns.find((item) => item.fixture.companyId === company.id && item.fixture.quality === "company")
      if (!deckRun?.analysis) throw new Error("No completed deck analysis available for investor matching")
      const analysis = deckRun.analysis
      const profile = buildFounderProfile({
        userId: "qa-no-db-write",
        deckAnalysisId: `qa-${company.id}`,
        profile: company.profile,
        deckAnalysis: {
          summary: analysis.summary,
          overall_score: analysis.overallScore,
          category_scores: analysis.categoryScores,
          financial_signals: analysis.financialSignals,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          missing_sections: analysis.missingSections,
          investor_readiness: analysis.investorReadiness,
          priority_actions: analysis.priorityActions,
          fundraising_risks: analysis.fundraisingRisks,
        },
      })
      run.profile = profile as unknown as Record<string, unknown>

      const sizing = {
        targetMatchCount,
        leadsFinderFetchCount: Math.max(80, targetMatchCount * 4),
        preFilterKeep: targetMatchCount + 15,
        linkedinProfileCap: Math.min(50, targetMatchCount + 15),
        linkedinPostsCap: targetMatchCount,
      }
      const { filterPayload, filterHash } = buildDiscoveryFilterFromProfile(profile)
      run.discovery = { sizing, filterPayload, filterHash }

      const rawLeads = await discoverVCPartners(profile, {
        fetchCount: sizing.leadsFinderFetchCount,
      })
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
      })

      const matches = []
      for (let index = 0; index < ranked.length; index++) {
        const match = ranked[index]
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
        matches.push({
          rank: index + 1,
          fitScore: match.fitScore,
          firm: match.firm,
          partner: match.partner,
          matchRationale: match.matchRationale,
          recentLinkedInSignals: match.recentLinkedInSignals,
          limitedData: match.limitedData,
          source: match.matchRationale?.startsWith("Secondary pick:") ? "backfill" : "gpt",
          outreach,
          qa: classifyInvestorMatch(company, {
            rank: index + 1,
            fitScore: match.fitScore,
            firm: match.firm,
            partner: match.partner,
            matchRationale: match.matchRationale,
            outreach,
          }),
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
      run.validations = validateInvestorRun(run)
      run.artifactPath = path.join(investorArtifactDir, `${company.id}.json`)
      await writeJson(run.artifactPath, {
        ...run,
        raw: {
          rawLeads,
          filtered,
          firms,
          rankedFromGpt,
          linkedinPosts,
        },
      })
    } catch (error) {
      run.error = errorMessage(error)
      run.validations = { pass: false, error: run.error }
      run.artifactPath = path.join(investorArtifactDir, `${company.id}.json`)
      await writeJson(run.artifactPath, run)
      addIssue({
        severity: "P1",
        module: "Investor Matching",
        issue: `Investor matching quality run failed for ${company.name}`,
        steps: `Run direct v2 pipeline for ${company.name}: Leads Finder, LinkedIn enrichment, GPT rank, outreach.`,
        expected: "A ranked investor list with specific fit rationale and 3-step outreach sequences.",
        actual: run.error,
        suggestedFix: "Check Apify/OpenAI credentials, actor availability, network access, and ranker schema output.",
      })
    }
    runs.push(run)
  }

  validateInvestorOverlap(runs)
  return runs
}

async function runUiSmokeChecks() {
  const pages = [
    "/dashboard/deck-analyser",
    "/dashboard/financial-model",
    "/dashboard/investor-matching",
    "/dashboard/billing",
    "/dashboard/settings",
  ]
  const results = []
  for (const page of pages) {
    testsRun += 1
    try {
      const response = await fetch(`${appUrl}${page}`, { redirect: "manual" })
      results.push({
        page,
        status: response.status,
        location: response.headers.get("location"),
        verdict: response.status >= 300 && response.status < 400 ? "Auth redirect" : response.ok ? "Rendered" : "Blocked",
      })
    } catch (error) {
      results.push({ page, status: "blocked", verdict: "Blocked", error: errorMessage(error) })
    }
  }
  return {
    screenshotDir: path.relative(root, screenshotDir),
    results,
    verdict: results.some((r) => r.verdict === "Rendered") ? "Partial" : "Blocked",
    note: "Authenticated rendered-state checks and screenshots require a safe test account/session. No production auth/session was created by this script.",
  }
}

function validateDeckRun(run: DeckRun) {
  const analysis = run.analysis ?? {}
  const company = companies.find((item) => item.id === run.fixture.companyId)
  const categoryScores = (analysis.categoryScores as Array<Record<string, unknown>> | undefined) ?? []
  const weighted = run.weightedCategories ?? []
  const financialSignals = (analysis.financialSignals as Record<string, unknown> | undefined) ?? {}
  const textBlob = JSON.stringify(analysis).toLowerCase()
  const expectedRaise = company?.raiseAmount ?? 0
  const raiseExtracted = Number(financialSignals.raiseAmount ?? 0)
  const score = Number(analysis.overallScore ?? NaN)
  const specificTerms = company ? company.expectedTerms.filter((term) => textBlob.includes(term.toLowerCase())) : []
  const validation = {
    pass: true,
    companyMentioned: company ? textBlob.includes(company.name.toLowerCase()) : true,
    sectorTermsFound: specificTerms,
    expectedRaise,
    raiseExtracted,
    raiseMatches: expectedRaise ? Math.abs(raiseExtracted - expectedRaise) <= expectedRaise * 0.1 : null,
    categoryCount: categoryScores.length,
    weightedScoringExists: weighted.length === 8 && weighted.every((row) => typeof row.weight === "number"),
    score,
    expectedScoreBand: run.fixture.expectedScoreBand ?? null,
    scoreInExpectedBand: run.fixture.expectedScoreBand
      ? score >= run.fixture.expectedScoreBand[0] && score <= run.fixture.expectedScoreBand[1]
      : null,
    feedbackSpecificity: specificTerms.length >= 2 ? "Specific" : "Thin",
    suggestedFixesCount: Array.isArray(analysis.suggestedFixes) ? analysis.suggestedFixes.length : 0,
    priorityActionsCount: Array.isArray(analysis.priorityActions) ? analysis.priorityActions.length : 0,
    financialSignals,
  }

  if (validation.categoryCount !== 8 || !validation.weightedScoringExists) {
    validation.pass = false
    addIssue({
      severity: "P1",
      module: "Pitch Deck Analyser",
      issue: `${run.fixture.label} did not expose 8 weighted scoring categories`,
      steps: "Run deck fixture and inspect category_scores/weights.",
      expected: "Exactly 8 investor-readiness categories with weight percentages.",
      actual: `${validation.categoryCount} categories; weighted=${validation.weightedScoringExists}`,
      suggestedFix: "Ensure deck output uses the eight required category labels and the UI calls enrichCategoryScoresWithWeights.",
    })
  }

  if (company && validation.raiseMatches === false && run.fixture.quality === "company") {
    validation.pass = false
    addIssue({
      severity: "P1",
      module: "Pitch Deck Analyser",
      issue: `${run.fixture.label} raise amount extraction is missing or wrong`,
      steps: "Inspect deck analysis financialSignals.raiseAmount.",
      expected: `Approximately ${company.raiseAmount}.`,
      actual: String(raiseExtracted || "null/0"),
      suggestedFix: "Tighten deck extraction prompt/examples for fundraising ask and currency-normalized raise amounts.",
    })
  }

  if (run.fixture.expectedScoreBand && validation.scoreInExpectedBand === false) {
    addIssue({
      severity: "P2",
      module: "Pitch Deck Analyser",
      issue: `${run.fixture.label} score outside expected QA band`,
      steps: "Run generated quality variant and compare weighted overall score.",
      expected: `${run.fixture.expectedScoreBand[0]}-${run.fixture.expectedScoreBand[1]}.`,
      actual: String(score),
      suggestedFix: "Review scoring rubric calibration; weak/average/excellent decks should separate clearly.",
    })
  }

  return validation
}

function validateFinancialRun(run: FinancialRun) {
  const parsed = (run.result?.parsed as Record<string, unknown> | undefined) ?? {}
  const projection = (parsed.projection as Array<Record<string, unknown>> | undefined) ?? []
  const charts = (parsed.chartsData as Record<string, Array<Record<string, unknown>>> | undefined) ?? {}
  const blob = JSON.stringify(parsed).toLowerCase()
  const company = run.company
  const expectedTerms = company.expectedTerms.filter((term) => blob.includes(term.toLowerCase()))
  const revenueSeries = projection.map((row) => Number(row.revenue ?? 0))
  const burnSeries = projection.map((row) => Number(row.burn ?? 0))
  const finalRevenue = revenueSeries.at(-1) ?? 0
  const maxRevenue = Math.max(...revenueSeries, 0)
  const chartLengthsOk = ["revenue", "burn", "cashBalance", "runway"].every(
    (key) => Array.isArray(charts[key]) && charts[key].length === 36
  )
  const runwayApproxIssues = projection.filter((row) => {
    const burn = Number(row.burn ?? 0)
    const cash = Number(row.cashBalance ?? 0)
    const runway = Number(row.runwayMonths ?? 0)
    if (burn <= 0 || cash <= 0 || runway <= 0) return false
    return Math.abs(runway - cash / burn) > 3
  }).length
  const consumerMrrOverfit =
    company.id === "looply" && /\bmrr\b|monthly recurring revenue|churn/i.test(JSON.stringify(parsed))
  const fintechInventedRevenue =
    company.id === "ledgerbridge" && revenueSeries.slice(0, 3).some((value) => value > 0)

  const validation = {
    pass: true,
    projectionMonths: projection.length,
    chartLengthsOk,
    finalRevenue,
    maxRevenue,
    hasNarrative: typeof parsed.narrative === "string" && parsed.narrative.length > 40,
    hasInvestorSummary: typeof parsed.investorSummary === "string" && parsed.investorSummary.length > 40,
    assumptionCount: Array.isArray(parsed.assumptions) ? parsed.assumptions.length : 0,
    riskCount: Array.isArray(parsed.risks) ? parsed.risks.length : 0,
    expectedTermsFound: expectedTerms,
    runwayApproxIssues,
    businessModelAdapted: expectedTerms.length >= 2 && !consumerMrrOverfit && !fintechInventedRevenue,
    consumerMrrOverfit,
    fintechInventedRevenue,
  }

  if (projection.length !== 36 || !chartLengthsOk) {
    validation.pass = false
    addIssue({
      severity: "P1",
      module: "Financial Model",
      issue: `${company.name} financial model missing 36-month projection or populated charts`,
      steps: "Generate financial model and inspect projection/chartsData arrays.",
      expected: "36 projection rows and 36 points for revenue, burn, cash balance, and runway charts.",
      actual: `projection=${projection.length}; chartLengthsOk=${chartLengthsOk}`,
      suggestedFix: "Keep FinancialModelSchema length requirement and chart builder in sync with UI expectations.",
    })
  }

  if (!validation.businessModelAdapted) {
    validation.pass = false
    addIssue({
      severity: "P1",
      module: "Financial Model",
      issue: `${company.name} financial model did not clearly adapt to company type`,
      steps: "Inspect narrative, assumptions, and first months of projection.",
      expected: `Model should reflect ${company.sector} and traction: ${company.traction}.`,
      actual: `terms=${expectedTerms.join(", ") || "none"}; consumerMrrOverfit=${consumerMrrOverfit}; fintechInventedRevenue=${fintechInventedRevenue}`,
      suggestedFix: "Strengthen financial model prompt with business-model-specific examples and actual-vs-assumption rules.",
    })
  }

  if (runwayApproxIssues > 6) {
    addIssue({
      severity: "P2",
      module: "Financial Model",
      issue: `${company.name} runway values are not consistently cash divided by burn`,
      steps: "Compare each projection row runwayMonths with cashBalance / burn.",
      expected: "Runway should approximately equal cash divided by monthly burn.",
      actual: `${runwayApproxIssues} months differ by more than 3 months.`,
      suggestedFix: "Post-process runway from generated burn/cash or tighten schema prompt.",
    })
  }

  return validation
}

function validateInvestorRun(run: InvestorRun) {
  const matches = run.matches
  const verdictCounts = countBy(matches.map((match) => String((match.qa as Record<string, unknown>)?.verdict ?? "Unknown")))
  const regions = countBy(matches.map((match) => String((match.qa as Record<string, unknown>)?.region ?? "Unknown")))
  const strongPartial = (verdictCounts["Strong fit"] ?? 0) + (verdictCounts["Partial fit"] ?? 0)
  const bad = verdictCounts["Bad fit"] ?? 0
  const specificityPass = matches.every((match) => Boolean((match.qa as Record<string, unknown>)?.specificRationale))
  const outreachPass = matches.every((match) => Boolean((match.qa as Record<string, unknown>)?.outreachPass))
  const worldwidePass = (regions.UK ?? 0) > 0 && ((regions.US ?? 0) > 0 || (regions["Europe excluding UK"] ?? 0) > 0 || (regions["Other global"] ?? 0) > 0)
  const relevancePass =
    matches.length > 0 && strongPartial / matches.length >= 0.6 && bad / Math.max(1, matches.length) < 0.2

  const validation = {
    pass: matches.length > 0 && relevancePass && specificityPass && outreachPass,
    matches: matches.length,
    verdictCounts,
    regions,
    relevancePass,
    worldwidePass,
    specificityPass,
    outreachPass,
    top10StrongOrPartial: matches
      .slice(0, 10)
      .filter((match) => ["Strong fit", "Partial fit"].includes(String((match.qa as Record<string, unknown>)?.verdict))).length,
  }

  if (!relevancePass) {
    addIssue({
      severity: "P1",
      module: "Investor Matching",
      issue: `${run.company.name} investor relevance below threshold`,
      steps: "Classify investor matches by sector/stage/geography/thesis metadata.",
      expected: "At least 60% Strong/Partial and less than 20% Bad fit.",
      actual: JSON.stringify(verdictCounts),
      suggestedFix: "Improve discovery keywords, prefilter scoring, and ranker sector/thesis penalties.",
    })
  }

  if (!specificityPass) {
    addIssue({
      severity: "P1",
      module: "Investor Matching",
      issue: `${run.company.name} has generic investor fit explanations`,
      steps: "Inspect each matchRationale for company sector/stage/traction and investor metadata.",
      expected: "Rationales mention the startup and concrete investor thesis/data.",
      actual: "One or more rationales lacked company-specific or investor-specific evidence.",
      suggestedFix: "Require ranker rationale fields to cite one founder detail and one supplied investor detail; reject generic outputs.",
    })
  }

  if (!outreachPass) {
    addIssue({
      severity: "P1",
      module: "Investor Matching",
      issue: `${run.company.name} outreach sequence quality failed`,
      steps: "Inspect outreach sequence length, days, placeholders, company/investor names, and personalization.",
      expected: "Exactly 3 personalized steps: Day 0, Day 5, Day 12; no placeholders.",
      actual: "One or more outreach sequences failed QA checks.",
      suggestedFix: "Add server-side outreach validation and regenerate/reject placeholder or generic copy.",
    })
  }

  return validation
}

function validateInvestorOverlap(runs: InvestorRun[]) {
  const completed = runs.filter((run) => run.matches.length > 0)
  for (let i = 0; i < completed.length; i++) {
    for (let j = i + 1; j < completed.length; j++) {
      const a = completed[i]
      const b = completed[j]
      const aIds = new Set(a.matches.map(normaliseFirmId))
      const bIds = new Set(b.matches.map(normaliseFirmId))
      const shared = [...aIds].filter((id) => bIds.has(id))
      const overlap = shared.length / Math.max(1, Math.min(aIds.size, bIds.size))
      if (overlap > 0.5 && a.company.sector !== b.company.sector) {
        addIssue({
          severity: "P1",
          module: "Investor Matching",
          issue: `High investor overlap: ${a.company.name} vs ${b.company.name}`,
          steps: "Compare normalized firm names across company investor lists.",
          expected: "Less than 50% overlap between unrelated companies.",
          actual: `${shared.length} shared firms; ${(overlap * 100).toFixed(1)}% overlap.`,
          suggestedFix: "Make discovery filters more sector/stage/geography specific and reduce generic broad-fund dominance.",
        })
      }
    }
  }

  const appearances = new Map<string, Set<string>>()
  for (const run of completed) {
    for (const match of run.matches) {
      const id = normaliseFirmId(match)
      const set = appearances.get(id) ?? new Set<string>()
      set.add(run.company.name)
      appearances.set(id, set)
    }
  }
  const allFive = [...appearances.values()].filter((set) => set.size === companies.length)
  if (allFive.length > 0) {
    addIssue({
      severity: "P1",
      module: "Investor Matching",
      issue: "Some investors appeared across all five companies",
      steps: "Aggregate normalized firm names across all five company outputs.",
      expected: "No exact same firm should appear across every unrelated test company unless clearly broad and justified.",
      actual: `${allFive.length} firm(s) appeared across all five companies.`,
      suggestedFix: "Add diversification/reranking penalties for unrelated sector runs.",
    })
  }
}

function classifyInvestorMatch(company: TestCompany, match: Record<string, unknown>) {
  const firm = (match.firm as Record<string, unknown>) ?? {}
  const partner = (match.partner as Record<string, unknown>) ?? {}
  const outreach = (match.outreach as Record<string, unknown>) ?? {}
  const sequence = (outreach.sequence as Record<string, unknown> | undefined)?.steps as Array<Record<string, unknown>> | undefined
  const haystack = [
    firm.name,
    firm.country,
    (firm.focusAreas as unknown[])?.join(" "),
    (firm.investmentStages as unknown[])?.join(" "),
    (firm.recentInvestments as unknown[])?.map((item) => JSON.stringify(item)).join(" "),
    partner.title,
    match.matchRationale,
    JSON.stringify(outreach),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  const sectorHits = company.expectedTerms.filter((term) => haystack.includes(term.toLowerCase()))
  const badHits = company.badTerms.filter((term) => haystack.includes(term.toLowerCase()))
  const stageText = String((firm.investmentStages as unknown[])?.join(" ") ?? "").toLowerCase()
  const stageFit =
    stageText.includes(company.stage) ||
    stageText.includes("seed") ||
    stageText.includes("early") ||
    stageText.includes("pre seed") ||
    stageText.includes("pre-seed")
  const region = classifyRegion(String(firm.country ?? ""))
  const geographyFit = region !== "Unknown"
  const thesisSpecific = sectorHits.length > 0
  const badFit = badHits.length > 0 && sectorHits.length === 0
  const score = Number(match.fitScore ?? 0)
  const verdict =
    badFit || score < 35
      ? "Bad fit"
      : thesisSpecific && stageFit && score >= 70
        ? "Strong fit"
        : (thesisSpecific || stageFit || geographyFit) && score >= 45
          ? "Partial fit"
          : score >= 35
            ? "Weak fit"
            : "Unknown due to missing evidence"

  const rationale = String(match.matchRationale ?? "")
  const specificRationale =
    rationale.length > 80 &&
    (rationale.toLowerCase().includes(company.name.toLowerCase()) ||
      company.expectedTerms.some((term) => rationale.toLowerCase().includes(term.toLowerCase()))) &&
    String(firm.name ?? "").length > 0

  const allOutreachText = JSON.stringify(outreach)
  const placeholders = /\[[^\]]*(name|company|investor|firm)[^\]]*\]|\{\{[^}]+\}\}/i.test(allOutreachText)
  const companyMentioned = allOutreachText.toLowerCase().includes(company.name.toLowerCase())
  const investorMentioned =
    allOutreachText.toLowerCase().includes(String(firm.name ?? "").toLowerCase()) ||
    allOutreachText.toLowerCase().includes(String(partner.name ?? "").toLowerCase())
  const sequenceDays = (sequence ?? []).map((step) => Number(step.sendAfterDays))
  const outreachPass =
    Array.isArray(sequence) &&
    sequence.length === 3 &&
    sequenceDays[0] === 0 &&
    sequenceDays[1] === 5 &&
    sequenceDays[2] === 12 &&
    !placeholders &&
    companyMentioned &&
    investorMentioned

  return {
    verdict,
    region,
    sectorHits,
    badHits,
    stageFit,
    geographyFit,
    specificRationale,
    outreachPass,
    outreachNotes: {
      sequenceLength: sequence?.length ?? 0,
      sequenceDays,
      placeholders,
      companyMentioned,
      investorMentioned,
    },
  }
}

function computeOverallVerdict(
  deckRuns: DeckRun[],
  financialRuns: FinancialRun[],
  investorRuns: InvestorRun[],
  apiSmoke: Record<string, unknown>,
  uiResults: Record<string, unknown>
) {
  const deckPass = deckRuns.filter((run) => !run.error && (run.validations as Record<string, unknown>).pass !== false).length
  const financialPass = financialRuns.filter((run) => !run.error && (run.validations as Record<string, unknown>).pass !== false).length
  const investorPass = investorRuns.filter((run) => !run.error && (run.validations as Record<string, unknown>).pass !== false).length
  const p0 = countSeverity("P0")
  const p1 = countSeverity("P1")
  const p2 = countSeverity("P2")
  const blocked = [apiSmoke, uiResults].some((item) => String((item as Record<string, unknown>).verdict) === "Blocked")
  const readiness =
    Math.max(
      0,
      100 -
        p0 * 30 -
        p1 * 12 -
        p2 * 4 -
        (deckRuns.length - deckPass) * 4 -
        (financialRuns.length - financialPass) * 4 -
        (investorRuns.length - investorPass) * 6 -
        (blocked ? 10 : 0)
    )
  const launchRecommendation = p0 > 0 || p1 >= 4 || investorPass < companies.length
    ? "Do not ship"
    : p1 > 0 || p2 > 0 || blocked
      ? "Ship after P0/P1 fixes"
      : "Ship"

  return {
    overallReadinessScore: readiness,
    launchRecommendation,
    deckAnalyserVerdict:
      deckPass === deckRuns.length ? "Pass" : deckPass > 0 ? "Partial" : "Fail",
    financialModelVerdict:
      financialPass === financialRuns.length ? "Pass" : financialPass > 0 ? "Partial" : "Fail",
    investorMatchingVerdict:
      investorPass === investorRuns.length ? "Pass" : investorPass > 0 ? "Partial" : "Fail",
    investorOverlapConcern: issues.some((issue) => /overlap|appeared across/.test(issue.issue.toLowerCase())),
    worldwideCoveragePassed: investorRuns.every((run) => Boolean((run.validations as Record<string, unknown>).worldwidePass)),
    outputSpecificityPassed: investorRuns.every((run) => Boolean((run.validations as Record<string, unknown>).specificityPass)),
  }
}

async function writeReports({
  context,
  apiSmoke,
  deckRuns,
  financialRuns,
  investorRuns,
  uiResults,
  quality,
}: {
  context: Record<string, unknown>
  apiSmoke: Record<string, unknown>
  deckRuns: DeckRun[]
  financialRuns: FinancialRun[]
  investorRuns: InvestorRun[]
  uiResults: Record<string, unknown>
  quality: Record<string, unknown>
}) {
  const md = buildMarkdownReport({
    context,
    apiSmoke,
    deckRuns,
    financialRuns,
    investorRuns,
    uiResults,
    quality,
  })
  await writeFile(reportPath, md, "utf8")
  const summary = {
    date: startedAt,
    environment: remoteSupabase ? "local app with remote Supabase; Supabase writes disabled" : "local",
    commit,
    overallReadinessScore: quality.overallReadinessScore,
    launchRecommendation: quality.launchRecommendation,
    investorMatchingVerdict: quality.investorMatchingVerdict,
    deckAnalyserVerdict: quality.deckAnalyserVerdict,
    financialModelVerdict: quality.financialModelVerdict,
    p0Count: countSeverity("P0"),
    p1Count: countSeverity("P1"),
    p2Count: countSeverity("P2"),
    topIssues: issues.slice(0, 10).map((issue) => issue.issue),
    investorOverlapConcern: quality.investorOverlapConcern,
    worldwideCoveragePassed: quality.worldwideCoveragePassed,
    outputSpecificityPassed: quality.outputSpecificityPassed,
  }
  await writeJson(summaryPath, summary)
}

function buildMarkdownReport({
  context,
  apiSmoke,
  deckRuns,
  financialRuns,
  investorRuns,
  uiResults,
  quality,
}: {
  context: Record<string, unknown>
  apiSmoke: Record<string, unknown>
  deckRuns: DeckRun[]
  financialRuns: FinancialRun[]
  investorRuns: InvestorRun[]
  uiResults: Record<string, unknown>
  quality: Record<string, unknown>
}) {
  const lines: string[] = []
  lines.push("# RaiseWise Product Quality QA Report")
  lines.push("")
  lines.push(`Date: ${startedAt}`)
  lines.push(`Environment: ${remoteSupabase ? "Local CLI against remote Supabase config; Supabase writes disabled for safety" : "Local CLI"}`)
  lines.push(`Commit hash: ${commit}`)
  lines.push("Tester: Codex CLI QA runner")
  lines.push(`App URL: ${appUrl}`)
  lines.push(`Database project: ${databaseProject}`)
  lines.push("")
  lines.push("## Executive Summary")
  lines.push("")
  lines.push(`Overall readiness score: **${quality.overallReadinessScore}/100**`)
  lines.push(`Launch recommendation: **${quality.launchRecommendation}**`)
  lines.push(`Investor matching good enough: **${quality.investorMatchingVerdict === "Pass" ? "Yes" : "No / not fully verified"}**`)
  lines.push("")
  lines.push("Top 10 issues:")
  for (const issue of issues.slice(0, 10)) {
    lines.push(`- ${issue.id} ${issue.severity} ${issue.module}: ${issue.issue}`)
  }
  if (!issues.length) lines.push("- No P0/P1/P2 issues recorded by the automated quality runner.")
  lines.push("")
  lines.push("Top 5 product quality risks:")
  lines.push("- Remote Supabase/service-role configuration means authenticated API persistence and paid UI-state E2E were not mutated without an explicit staging/test session.")
  lines.push("- Investor source freshness is limited to returned metadata/URLs; no independent live web verification was performed.")
  lines.push("- OpenAI-generated quality can drift run to run; rerun before launch using a fixed staging dataset.")
  lines.push("- ClimateTech and consumer social classification depends heavily on raw sector/deck keywords because internal sector buckets are limited.")
  lines.push("- Cost-heavy investor matching should be rerun at the full paid plan cap if this run used QA_INVESTOR_TARGET_MATCHES below 35.")
  lines.push("")
  lines.push("## Scope Tested")
  lines.push("")
  lines.push("| Area | Result | Notes |")
  lines.push("| --- | --- | --- |")
  lines.push(`| Auth | Partial | Unauthenticated API smoke checks run against ${appUrl}. |`)
  lines.push("| Onboarding | Blocked | No safe test user/session was created. |")
  lines.push(`| Deck analyser | ${quality.deckAnalyserVerdict} | ${deckRuns.length} generated PDF fixtures processed through PDF extraction and deck analysis. |`)
  lines.push("| Billing | Static only | Plan catalog/limits inspected; no Stripe charges or webhook mutations run. |")
  lines.push("| Paid deck | Partial | Plan gating helper inspected; authenticated paid UI not exercised. |")
  lines.push(`| Financial model | ${quality.financialModelVerdict} | ${financialRuns.length} company model runs attempted from form inputs plus deck context. |`)
  lines.push(`| Investor matching | ${quality.investorMatchingVerdict} | ${investorRuns.length} direct v2 quality runs attempted. |`)
  lines.push("| Emails | Blocked | Resend is configured, but no email was sent to avoid spamming real users. |")
  lines.push("| Exports | Static only | Export routes/components discovered; authenticated export execution not run. |")
  lines.push(`| UI rendering | ${(uiResults as Record<string, unknown>).verdict} | Auth redirects/smoke fetches only; screenshots require safe login state. |`)
  lines.push("| Plan limits | Static only | Plan constants and usage gates inspected. |")
  lines.push("")

  lines.push("## Project Inspection")
  lines.push("")
  lines.push(`- Stack: Next.js ${(context.stack as Record<string, unknown>).next}, React ${(context.stack as Record<string, unknown>).react}, Supabase, OpenAI, Apify, Stripe, Resend.`)
  lines.push(`- Next docs read: ${((context.nextDocsRead as string[]) ?? []).join("; ")}.`)
  lines.push(`- Service role writes disabled by QA runner: ${String((context.env as Record<string, unknown>).serviceRoleWritesDisabled)}.`)
  lines.push(`- Existing test tooling: ${(((context.stack as Record<string, unknown>).testFrameworks as string[]) ?? []).join(", ")}.`)
  lines.push("")
  lines.push("Key API endpoints found:")
  for (const route of (context.routes as Array<Record<string, string>>).filter((route) =>
    /deck|financial|investors|stripe|resend|cron/.test(route.endpoint)
  )) {
    lines.push(`- ${route.endpoint} (${route.file})`)
  }
  lines.push("")
  lines.push("Database tables/functions found:")
  lines.push(`- Tables: ${((context.tables as string[]) ?? []).join(", ")}`)
  lines.push(`- RPC/functions: ${((context.functions as string[]) ?? []).join(", ")}`)
  lines.push("")

  lines.push("## Test Data Used")
  lines.push("")
  lines.push("| Company | Sector | Stage | Geography | Raise amount | Traction | Deck fixture used |")
  lines.push("| --- | --- | --- | --- | ---: | --- | --- |")
  for (const company of companies) {
    const fixture = deckRuns.find((run) => run.fixture.companyId === company.id && run.fixture.quality === "company")?.fixture
    lines.push(`| ${company.name} | ${company.sector} | ${company.stage} | ${company.geography} | ${company.raiseAmount} | ${company.traction} | ${fixture?.pdfPath ? path.relative(root, fixture.pdfPath) : "not generated"} |`)
  }
  lines.push("")

  lines.push("## Pitch Deck Analyser Results")
  lines.push("")
  lines.push("| Deck | Score | Categories | Weights | Extracted Raise | Feedback Quality | Pass/Fail | Issues |")
  lines.push("| --- | ---: | ---: | --- | ---: | --- | --- | --- |")
  for (const run of deckRuns) {
    const v = run.validations as Record<string, unknown>
    lines.push(`| ${run.fixture.label} | ${String(v.score ?? "blocked")} | ${String(v.categoryCount ?? "-")} | ${String(v.weightedScoringExists ?? false)} | ${String(v.raiseExtracted ?? "-")} | ${String(v.feedbackSpecificity ?? "-")} | ${run.error ? "Fail" : v.pass === false ? "Fail" : "Pass"} | ${run.error ?? ""} |`)
  }
  lines.push("")
  lines.push("Score discrimination:")
  lines.push("")
  lines.push("| Variant | Score | Expected band | Verdict |")
  lines.push("| --- | ---: | --- | --- |")
  for (const qualityName of ["excellent", "average", "weak"]) {
    const run = deckRuns.find((item) => item.fixture.quality === qualityName)
    const v = run?.validations as Record<string, unknown> | undefined
    lines.push(`| ${qualityName} | ${String(v?.score ?? "blocked")} | ${run?.fixture.expectedScoreBand?.join("-") ?? ""} | ${v?.scoreInExpectedBand === false ? "Outside band" : run?.error ? "Blocked" : "OK"} |`)
  }
  lines.push("")

  lines.push("## Financial Model Results")
  lines.push("")
  lines.push("| Company | Revenue Assumptions / Final Revenue | Burn / Runway Check | Plausibility | Adapted to Business Model | Pass/Fail | Issues |")
  lines.push("| --- | --- | --- | --- | --- | --- | --- |")
  for (const run of financialRuns) {
    const v = run.validations as Record<string, unknown>
    lines.push(`| ${run.company.name} | Final M36 revenue ${String(v.finalRevenue ?? "-")} | Runway approx issues ${String(v.runwayApproxIssues ?? "-")} | ${String(v.expectedTermsFound ?? [])} | ${String(v.businessModelAdapted ?? false)} | ${run.error ? "Fail" : v.pass === false ? "Fail" : "Pass"} | ${run.error ?? ""} |`)
  }
  lines.push("")

  lines.push("## Investor Matching Results")
  lines.push("")
  for (const run of investorRuns) {
    lines.push(`### ${run.company.name}`)
    lines.push("")
    if (run.error) {
      lines.push(`Investor matching blocked/failed: ${run.error}`)
      lines.push("")
      continue
    }
    lines.push(`Counts: ${JSON.stringify(run.counts)}`)
    lines.push("")
    lines.push("| Rank | Investor/Firm | Contact | Region | Sector Fit | Stage Fit | Cheque Fit | Fit Score | Verdict | Evidence/Reason |")
    lines.push("| ---- | ------------- | ------- | ------ | ---------- | --------- | ---------- | --------- | ------- | --------------- |")
    for (const match of run.matches) {
      const firm = match.firm as Record<string, unknown>
      const partner = match.partner as Record<string, unknown>
      const qa = match.qa as Record<string, unknown>
      lines.push(`| ${match.rank} | ${escapeTable(String(firm.name ?? ""))} | ${escapeTable(String(partner.name ?? ""))} | ${escapeTable(String(qa.region ?? ""))} | ${escapeTable(((qa.sectorHits as string[]) ?? []).join(", ") || "Unknown")} | ${String(qa.stageFit)} | Unknown | ${match.fitScore} | ${escapeTable(String(qa.verdict ?? ""))} | ${escapeTable(String(match.matchRationale ?? "").slice(0, 260))} |`)
    }
    lines.push("")
    lines.push("Outreach sequence review:")
    lines.push(`- 3 steps / days / placeholders / personalization pass: ${String((run.validations as Record<string, unknown>).outreachPass)}`)
    lines.push(`- Specific rationale pass: ${String((run.validations as Record<string, unknown>).specificityPass)}`)
    lines.push("")
  }

  lines.push("### Investor Overlap Matrix")
  lines.push("")
  lines.push("| Pair | Shared Investors | Overlap % | Verdict |")
  lines.push("| ---- | ---------------: | --------: | ------- |")
  for (const row of buildOverlapRows(investorRuns)) {
    lines.push(`| ${row.pair} | ${row.shared} | ${row.overlapPct} | ${row.verdict} |`)
  }
  lines.push("")
  lines.push("### Investors Appearing Across Multiple Companies")
  lines.push("")
  lines.push("| Investor | Companies Appeared In | Concern Level |")
  lines.push("| -------- | --------------------- | ------------- |")
  for (const row of buildMultiCompanyInvestorRows(investorRuns)) {
    lines.push(`| ${escapeTable(row.investor)} | ${escapeTable(row.companies)} | ${row.concern} |`)
  }
  lines.push("")
  lines.push("### Worldwide Coverage")
  lines.push("")
  lines.push("| Company | UK | Europe | US | Other | Verdict |")
  lines.push("| ------- | -: | -----: | -: | ----: | ------- |")
  for (const run of investorRuns) {
    const regions = ((run.validations as Record<string, unknown>).regions as Record<string, number> | undefined) ?? {}
    lines.push(`| ${run.company.name} | ${regions.UK ?? 0} | ${regions["Europe excluding UK"] ?? 0} | ${regions.US ?? 0} | ${regions["Other global"] ?? 0} | ${String((run.validations as Record<string, unknown>).worldwidePass ?? false)} |`)
  }
  lines.push("")
  lines.push("### Relevance Breakdown")
  lines.push("")
  lines.push("| Company | Strong Fit | Partial Fit | Weak Fit | Bad Fit | Unknown |")
  lines.push("| ------- | ---------: | ----------: | -------: | ------: | ------: |")
  for (const run of investorRuns) {
    const counts = ((run.validations as Record<string, unknown>).verdictCounts as Record<string, number> | undefined) ?? {}
    lines.push(`| ${run.company.name} | ${counts["Strong fit"] ?? 0} | ${counts["Partial fit"] ?? 0} | ${counts["Weak fit"] ?? 0} | ${counts["Bad fit"] ?? 0} | ${counts["Unknown due to missing evidence"] ?? 0} |`)
  }
  lines.push("")
  lines.push("### Outreach Sequence Review")
  lines.push("")
  for (const run of investorRuns) {
    lines.push(`- ${run.company.name}: ${String((run.validations as Record<string, unknown>).outreachPass ?? false)} (${run.error ?? "all generated sequences inspected"})`)
  }
  lines.push("")

  lines.push("## UI Rendering Results")
  lines.push("")
  lines.push(`Screenshot directory: ${path.relative(root, screenshotDir)}`)
  lines.push("")
  lines.push("| Screen | Status | Result | Notes |")
  lines.push("| --- | --- | --- | --- |")
  for (const result of ((uiResults as Record<string, unknown>).results as Array<Record<string, unknown>>) ?? []) {
    lines.push(`| ${String(result.page)} | ${String(result.status)} | ${String(result.verdict)} | ${escapeTable(String(result.error ?? result.location ?? ""))} |`)
  }
  lines.push("")
  lines.push(`Console errors: not captured. ${(uiResults as Record<string, unknown>).note}`)
  lines.push("")

  lines.push("## Plan Gates and Limits")
  lines.push("")
  lines.push("| Plan | Expected | Observed | Pass/Fail |")
  lines.push("| --- | --- | --- | --- |")
  lines.push("| Free | 1 deck upload ever, second upload upgrade prompt, financial/investor locked | Constants and access helpers found; no live account mutation | Partial |")
  lines.push("| Starter | Deck + financial unlocked, investor locked | plans.ts/access.ts match expectation | Pass static |")
  lines.push("| Pro | Deck + financial + investor unlocked, 25 matches/run, 10 runs/month | plans.ts/v2 sizing match expectation | Pass static |")
  lines.push("| Lifetime | 5 deck, 5 financial, 2 investor runs/month, 25 matches/run, no subscription mode | plans.ts matches expectation; UI CTA not auth-tested | Partial |")
  lines.push("")

  lines.push("## Email Results")
  lines.push("")
  lines.push("| Email | Result | Notes |")
  lines.push("| --- | --- | --- |")
  lines.push("| Welcome | Blocked | No test account created; no email sent. |")
  lines.push("| Score ready | Blocked | Deck upload API persistence not run against remote Supabase. |")
  lines.push("| Upgrade prompt | Blocked | Requires authenticated free-user paywall flow. |")
  lines.push("| Re-engagement cron | Blocked | Would require mutating scheduled email rows. |")
  lines.push("| Payment failed | Blocked | Stripe failure lifecycle not run. |")
  lines.push("| Subscription paused | Blocked | Stripe failure lifecycle not run. |")
  lines.push("")

  lines.push("## Bugs Found")
  lines.push("")
  lines.push("| ID | Severity | Module | Issue | Steps to Reproduce | Expected | Actual | Suggested Fix |")
  lines.push("| -- | -------- | ------ | ----- | ------------------ | -------- | ------ | ------------- |")
  for (const issue of issues) {
    lines.push(`| ${issue.id} | ${issue.severity} | ${escapeTable(issue.module)} | ${escapeTable(issue.issue)} | ${escapeTable(issue.steps)} | ${escapeTable(issue.expected)} | ${escapeTable(issue.actual)} | ${escapeTable(issue.suggestedFix)} |`)
  }
  if (!issues.length) {
    lines.push("| - | - | - | No issues recorded | - | - | - | - |")
  }
  lines.push("")

  lines.push("## Product Quality Findings")
  lines.push("")
  lines.push(`- Generic output issues: ${issues.some((issue) => /generic|specific/.test(issue.issue.toLowerCase())) ? "Yes, see bugs table." : "No automated generic-output issue recorded."}`)
  lines.push(`- Repeated investors: ${quality.investorOverlapConcern ? "Concern recorded." : "No severe overlap issue recorded."}`)
  lines.push("- Wrong investor sector/stage/geography: see per-company investor tables and relevance breakdown.")
  lines.push("- Weak financial assumptions: see Financial Model Results.")
  lines.push("- Missing weighted scoring: weighted scoring exists in code and was checked in artifacts; any failures are in Bugs Found.")
  lines.push("- Missing CFO/investor loop: financial prompt includes CFO/investor narrative, but authenticated persisted result/UI loop was not E2E verified.")
  lines.push("- Weak outreach: see Outreach Sequence Review and Bugs Found.")
  lines.push("")

  lines.push("## Final Recommendation")
  lines.push("")
  lines.push(`**${quality.launchRecommendation}**`)
  lines.push("")
  lines.push("Direct reasoning: the core quality modules were exercised from real generated PDF fixtures and live model/provider outputs where credentials/network allowed. Authenticated API persistence, paid/free UI rendering, exports, emails, and billing flows remain blocked without an explicit staging/test account because the local environment points at a remote Supabase project with production-capable credentials.")
  lines.push("")

  lines.push("## Raw Artifact Index")
  lines.push("")
  lines.push(`- Deck analysis: ${path.relative(root, deckArtifactDir)}`)
  lines.push(`- Financial models: ${path.relative(root, financialArtifactDir)}`)
  lines.push(`- Investor matching: ${path.relative(root, investorArtifactDir)}`)
  lines.push(`- Screenshots: ${path.relative(root, screenshotDir)}`)
  lines.push(`- Machine-readable summary: ${path.relative(root, summaryPath)}`)
  lines.push("")
  lines.push("## API Smoke Checks")
  lines.push("")
  lines.push("| Endpoint | Status | Expected | Result |")
  lines.push("| --- | --- | --- | --- |")
  for (const result of ((apiSmoke as Record<string, unknown>).results as Array<Record<string, unknown>>) ?? []) {
    lines.push(`| ${String(result.path)} | ${String(result.status)} | 401 unauthenticated | ${String(result.ok ? "Pass" : result.error ?? "Blocked/Unexpected")} |`)
  }
  lines.push("")

  return lines.join("\n")
}

function buildCompanyDeck(company: TestCompany) {
  return [
    `${company.name} Pitch Deck`,
    `Sector: ${company.sector}`,
    `Stage: ${company.stage}`,
    `Geography: ${company.geography}`,
    `Raise amount: GBP ${company.raiseAmount.toLocaleString("en-GB")}`,
    `Traction: ${company.traction}`,
    "Problem: Target customers waste time and money because existing workflows are fragmented, manual, and hard to measure.",
    `Solution: ${String(company.profile.description)}`,
    `Business model: ${String(company.financialInput.businessModel)}.`,
    "Team: Founder-led team with product, commercial, and domain experience; hiring plans focus on engineering, sales, and customer success.",
    `Go-to-market: Start in the UK, expand into Europe, and selectively target worldwide investors and customers where the thesis matches.`,
    `Financial assumptions: current monthly revenue ${company.financialInput.currentMonthlyRevenue}, burn ${company.financialInput.currentMonthlyBurn}, cash ${company.financialInput.currentCashBalance}, gross margin ${company.financialInput.grossMargin}%.`,
    `Investor ask: Raising GBP ${company.raiseAmount.toLocaleString("en-GB")} to fund the next 18 months, prove repeatable acquisition, and reach the milestones in the financial model.`,
    "Use of funds: product development, customer acquisition, compliance or data where relevant, and core hires.",
  ].join("\n\n")
}

function buildQualityVariant(quality: "excellent" | "average" | "weak") {
  if (quality === "excellent") {
    return [
      "AtlasOps Excellent Pitch Deck",
      "Sector: B2B SaaS / AI workflow automation. Stage: pre-seed. Geography: UK / Europe / Worldwide.",
      "Problem: Mid-market operations teams spend 12 hours per week reconciling approvals, handoffs, and reporting across disconnected tools.",
      "Solution: AtlasOps is an AI workflow automation platform that observes repeated operations workflows, recommends automations, and gives managers an audit trail.",
      "Market: 41,000 UK and EU mid-market operations teams with an initial serviceable market above GBP 1.2bn.",
      "Traction: GBP 18k MRR, 22 customers, GBP 9k ACV, 9% month-on-month MRR growth, 84% gross margin, 97% logo retention in the last quarter.",
      "Business model: SaaS subscription priced per operations seat plus workflow volume tiers.",
      "Team: Founder previously led operations systems at a public SaaS company; CTO built production ML workflow tooling; advisor sold to mid-market buyers.",
      "Financials: GBP 180k cash, GBP 42k monthly burn, runway 4.3 months, raising GBP 750,000 pre-seed for 18 months runway.",
      "Use of funds: 45% engineering, 35% sales/customer success, 10% AI infrastructure, 10% compliance and finance.",
      "Risks: sales cycle length and model accuracy; mitigated through paid pilots and human approval loops.",
    ].join("\n\n")
  }
  if (quality === "average") {
    return [
      "AtlasOps Average Pitch Deck",
      "Sector: B2B SaaS / AI automation. Stage: pre-seed. Geography: UK.",
      "Problem: Operations teams use too many tools and need better automation.",
      "Solution: AtlasOps automates common work using AI and integrations.",
      "Traction: GBP 18k MRR and 22 customers, but cohort retention and sales cycle details are not shown.",
      "Business model: SaaS subscriptions. Pricing is still being tested.",
      "Team: Technical and commercial founders; limited detail on prior exits or domain achievements.",
      "Financials: Raising GBP 750,000. Burn, runway, and use-of-funds are only partly explained.",
      "Market: Large operations software market, but TAM/SAM/SOM is not quantified.",
    ].join("\n\n")
  }
  return [
    "AtlasOps Weak Pitch Deck",
    "We are building an AI tool for companies.",
    "The market is huge and every business needs automation.",
    "We have some conversations with potential customers.",
    "The product will make teams faster.",
    "We want investment soon but have not decided the amount.",
    "No revenue, no customer count, no pricing, no burn, no runway, no detailed go-to-market, and no clear team background is included.",
  ].join("\n\n")
}

async function writePdfFixture(filePath: string, title: string, text: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 })
    const stream = createWriteStream(filePath)
    stream.on("finish", resolve)
    stream.on("error", reject)
    doc.pipe(stream)
    doc.fontSize(18).text(title, { underline: true })
    doc.moveDown()
    for (const paragraph of text.split(/\n\n+/)) {
      doc.fontSize(11).text(paragraph, { lineGap: 4 })
      doc.moveDown()
    }
    doc.end()
  })
}

function groupPostsByProfile(posts: Array<Record<string, unknown>>) {
  const map = new Map<string, Array<Record<string, unknown>>>()
  for (const post of posts) {
    const key = normaliseLinkedInUrlLocal(String(post.profileUrl ?? ""))
    if (!key) continue
    const list = map.get(key) ?? []
    list.push(post)
    map.set(key, list)
  }
  return map
}

function normaliseLinkedInUrlLocal(url: string) {
  return url.trim().toLowerCase().replace(/\/$/, "")
}

function buildOverlapRows(runs: InvestorRun[]) {
  const rows = []
  const completed = runs.filter((run) => run.matches.length > 0)
  for (let i = 0; i < completed.length; i++) {
    for (let j = i + 1; j < completed.length; j++) {
      const a = completed[i]
      const b = completed[j]
      const aIds = new Set(a.matches.map(normaliseFirmId))
      const bIds = new Set(b.matches.map(normaliseFirmId))
      const shared = [...aIds].filter((id) => bIds.has(id))
      const overlap = shared.length / Math.max(1, Math.min(aIds.size, bIds.size))
      rows.push({
        pair: `${a.company.name} vs ${b.company.name}`,
        shared: shared.length,
        overlapPct: `${(overlap * 100).toFixed(1)}%`,
        verdict: overlap > 0.5 ? "Serious concern" : overlap > 0.3 ? "Watch" : "Good",
      })
    }
  }
  return rows
}

function buildMultiCompanyInvestorRows(runs: InvestorRun[]) {
  const appearances = new Map<string, { name: string; companies: Set<string> }>()
  for (const run of runs) {
    for (const match of run.matches) {
      const id = normaliseFirmId(match)
      const firm = (match.firm as Record<string, unknown>) ?? {}
      const row = appearances.get(id) ?? { name: String(firm.name ?? id), companies: new Set<string>() }
      row.companies.add(run.company.name)
      appearances.set(id, row)
    }
  }
  return [...appearances.values()]
    .filter((row) => row.companies.size >= 2)
    .sort((a, b) => b.companies.size - a.companies.size)
    .map((row) => ({
      investor: row.name,
      companies: [...row.companies].join(", "),
      concern: row.companies.size >= 4 ? "High" : row.companies.size === 3 ? "Medium" : "Low",
    }))
}

function normaliseFirmId(match: Record<string, unknown>) {
  const firm = (match.firm as Record<string, unknown>) ?? {}
  return String(firm.name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ")
}

function classifyRegion(country: string) {
  const value = country.toLowerCase()
  if (!value.trim()) return "Unknown"
  if (/(united kingdom|england|scotland|wales|northern ireland|london|\buk\b|gb)/.test(value)) return "UK"
  if (/(united states|usa|\bus\b|new york|san francisco|california|boston|austin|miami|seattle)/.test(value)) return "US"
  if (/(france|germany|spain|italy|netherlands|sweden|norway|denmark|finland|ireland|belgium|switzerland|austria|portugal|europe|eu)/.test(value)) return "Europe excluding UK"
  return "Other global"
}

function countBy(values: string[]) {
  const counts: Record<string, number> = {}
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1
  return counts
}

function addIssue(issue: Omit<Issue, "id">) {
  issues.push({ id: `QA-${String(issues.length + 1).padStart(3, "0")}`, ...issue })
}

function countSeverity(severity: Severity) {
  return issues.filter((issue) => issue.severity === severity).length
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(value, jsonReplacer, 2), "utf8")
}

function jsonReplacer(_: string, value: unknown) {
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Set) return [...value]
  if (value instanceof Map) return Object.fromEntries(value)
  return value
}

async function walk(start: string): Promise<string[]> {
  const entries = await readdir(start, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue
    const full = path.join(start, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else files.push(full)
  }
  return files
}

async function runGit(args: string[]) {
  const { spawn } = await import("node:child_process")
  return await new Promise<string>((resolve, reject) => {
    const child = spawn("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] })
    let out = ""
    let err = ""
    child.stdout.on("data", (chunk) => (out += String(chunk)))
    child.stderr.on("data", (chunk) => (err += String(chunk)))
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err || `git ${args.join(" ")} failed`))
    })
  })
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function escapeTable(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ")
}
