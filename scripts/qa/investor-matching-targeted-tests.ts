import assert from "node:assert/strict"

import {
  assessChequeFit,
  buildCompanySpecificThesisKeywords,
  buildInvestorDiscoveryQueries,
  classifyInvestorRegion,
  scoreFirmForProfile,
  selectDiverseInvestorMatches,
  validateMatchRationale,
} from "@/lib/matching/investor-fit"
import {
  buildFallbackOutreachSequence,
  ensureValidOutreachSequence,
  validateOutreachSequence,
} from "@/lib/matching/outreach-validation"
import type { MergedFirm } from "@/lib/matching/merge"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

type TestCase = {
  name: string
  fn: () => void
}

const companies = {
  atlasops: makeProfile({
    name: "AtlasOps",
    sectorRaw: "B2B SaaS / AI / Workflow Automation",
    subSector: "AI workflow automation",
    stage: "pre-seed",
    raise: 750000,
    geography: "United Kingdom / Europe / Worldwide",
    oneLiner: "AI workflow automation for mid-market operations teams.",
    traction: { mrr: 18000, customers: 22, growthRate: 9 },
    keywords: ["AI workflow automation", "B2B SaaS", "operations"],
  }),
  looply: makeProfile({
    name: "Looply",
    sectorRaw: "Consumer / Social / Events",
    subSector: "Consumer social",
    stage: "pre-seed",
    raise: 500000,
    geography: "United Kingdom / Europe / Worldwide",
    oneLiner: "Gen Z event discovery and friend plans app.",
    traction: { users: 12000 },
    keywords: ["consumer social", "Gen Z", "events", "community"],
  }),
  cliniq: makeProfile({
    name: "ClinIQ",
    sectorRaw: "HealthTech / Healthcare SaaS",
    subSector: "HealthTech",
    stage: "seed",
    raise: 900000,
    geography: "United Kingdom / Europe / Worldwide",
    oneLiner: "Patient intake, triage, and appointment preparation software for private clinics.",
    traction: { mrr: 8000, customers: 11 },
    keywords: ["HealthTech", "clinic SaaS", "patient intake"],
  }),
  ledgerbridge: makeProfile({
    name: "LedgerBridge",
    sectorRaw: "FinTech / API / Lending Infrastructure",
    subSector: "FinTech infrastructure",
    stage: "seed",
    raise: 1200000,
    geography: "United Kingdom / Europe / Worldwide",
    oneLiner: "Bank data and lending API infrastructure for SME credit teams.",
    traction: { customers: 3 },
    keywords: ["fintech infrastructure", "lending API", "bank data"],
  }),
  gridwise: makeProfile({
    name: "Gridwise Carbon",
    sectorRaw: "ClimateTech / Carbon Accounting / B2B SaaS",
    subSector: "Carbon accounting",
    stage: "pre-seed",
    raise: 700000,
    geography: "United Kingdom / Europe / Worldwide",
    oneLiner: "Carbon accounting and SME emissions tracking software.",
    traction: { mrr: 5000, customers: 15 },
    keywords: ["ClimateTech", "carbon accounting", "SME emissions"],
  }),
}

const tests: TestCase[] = [
  {
    name: "search query generation differs across five QA companies",
    fn: () => {
      const querySets = Object.values(companies).map((profile) =>
        buildInvestorDiscoveryQueries(profile).map((query) => query.query).join(" | ")
      )
      assert.equal(new Set(querySets).size, 5)
    },
  },
  {
    name: "ClinIQ query generation includes UK and Europe HealthTech terms",
    fn: () => {
      const queries = buildInvestorDiscoveryQueries(companies.cliniq)
      const text = JSON.stringify(queries).toLowerCase()
      assert.match(text, /uk/)
      assert.match(text, /europe/)
      assert.match(text, /healthtech|healthcare|clinic|digital health/)
    },
  },
  {
    name: "Gridwise Carbon query generation includes climate and carbon terms, not just SaaS",
    fn: () => {
      const terms = buildCompanySpecificThesisKeywords(companies.gridwise).join(" ").toLowerCase()
      assert.match(terms, /climate|climatetech/)
      assert.match(terms, /carbon/)
      assert.notEqual(terms.trim(), "saas b2b software")
    },
  },
  {
    name: "LedgerBridge query generation includes fintech API lending infrastructure terms",
    fn: () => {
      const terms = buildCompanySpecificThesisKeywords(companies.ledgerbridge).join(" ").toLowerCase()
      assert.match(terms, /fintech/)
      assert.match(terms, /api/)
      assert.match(terms, /lending/)
      assert.match(terms, /infrastructure/)
    },
  },
  {
    name: "generalist investor penalty works",
    fn: () => {
      const broad = firm({
        name: "Broad Ventures",
        country: "United States",
        focus: ["venture capital", "early stage startups", "founders"],
        stages: ["Pre-Seed", "Seed"],
      })
      const specialist = firm({
        name: "Carbon Ledger Capital",
        country: "United Kingdom",
        focus: ["climatetech", "carbon accounting", "climate software"],
        stages: ["Pre-Seed", "Seed"],
      })
      const broadScore = scoreFirmForProfile(broad, companies.gridwise)
      const specialistScore = scoreFirmForProfile(specialist, companies.gridwise)
      assert.ok(specialistScore.score - broadScore.score >= 20)
      assert.ok(broadScore.penalties.includes("generic_broad_fund_without_vertical_evidence"))
    },
  },
  {
    name: "region balancing does not return 100% US when UK/EU candidates exist",
    fn: () => {
      const matches = [
        ...Array.from({ length: 8 }, (_, index) =>
          matchFromFirm(
            firm({
              name: `US Health Generalist ${index}`,
              country: "United States",
              focus: ["venture capital", "healthcare", "early stage"],
              stages: ["Seed"],
            }),
            companies.cliniq
          )
        ),
        matchFromFirm(
          firm({
            name: "London Health Seed",
            country: "United Kingdom",
            focus: ["healthtech", "clinic software", "digital health"],
            stages: ["Seed"],
          }),
          companies.cliniq
        ),
        matchFromFirm(
          firm({
            name: "Berlin Digital Health",
            country: "Germany",
            focus: ["digital health", "healthcare SaaS", "clinic"],
            stages: ["Seed"],
          }),
          companies.cliniq
        ),
      ]
      const selected = selectDiverseInvestorMatches({
        matches,
        profile: companies.cliniq,
        targetMatchCount: 5,
      })
      const localCount = selected.filter((item) => {
        const region = classifyInvestorRegion(item.firm.country)
        return region === "UK" || region === "Europe"
      }).length
      assert.ok(localCount >= 2)
    },
  },
  {
    name: "worldwide UK founder selection includes UK Europe and US when suitable candidates exist",
    fn: () => {
      const matches = [
        matchFromFirm(
          firm({
            name: "London Workflow Seed",
            country: "United Kingdom",
            focus: ["AI workflow automation", "B2B SaaS", "productivity"],
            stages: ["Pre-Seed", "Seed"],
          }),
          companies.atlasops
        ),
        matchFromFirm(
          firm({
            name: "Berlin Workflow Seed",
            country: "Germany",
            focus: ["AI workflow automation", "B2B SaaS", "enterprise software"],
            stages: ["Pre-Seed", "Seed"],
          }),
          companies.atlasops
        ),
        matchFromFirm(
          firm({
            name: "New York Workflow Seed",
            country: "United States",
            focus: ["AI workflow automation", "B2B SaaS", "productivity"],
            stages: ["Pre-Seed", "Seed"],
          }),
          companies.atlasops
        ),
        ...Array.from({ length: 7 }, (_, index) =>
          matchFromFirm(
            firm({
              name: `UK Workflow Specialist ${index}`,
              country: "United Kingdom",
              focus: ["AI workflow automation", "B2B SaaS", "operations"],
              stages: ["Pre-Seed", "Seed"],
            }),
            companies.atlasops
          )
        ),
      ]
      const selected = selectDiverseInvestorMatches({
        matches,
        profile: companies.atlasops,
        targetMatchCount: 10,
      })
      const regions = selected.map((item) => classifyInvestorRegion(item.firm.country))
      assert.ok(regions.includes("UK"))
      assert.ok(regions.includes("Europe"))
      assert.ok(regions.includes("US"))
      assert.notEqual(regions.every((region) => region === "UK"), true)
      assert.notEqual(regions.every((region) => region === "US"), true)
    },
  },
  {
    name: "AtlasOps and LedgerBridge top ten overlap stays below 30 percent on mixed candidate pool",
    fn: () => {
      const shared = [
        firm({
          name: "Broad Tech Capital",
          country: "United Kingdom",
          focus: ["venture capital", "technology", "b2b", "financial services"],
          stages: ["Pre-Seed", "Seed"],
        }),
        firm({
          name: "AI Fintech Generalist",
          country: "United States",
          focus: ["artificial intelligence", "fintech", "enterprise software"],
          stages: ["Pre-Seed", "Seed"],
        }),
        firm({
          name: "Security Infrastructure Ventures",
          country: "United Kingdom",
          focus: ["cybersecurity", "critical infrastructure", "financial services"],
          stages: ["Pre-Seed", "Seed"],
        }),
      ]
      const atlasSpecific = Array.from({ length: 8 }, (_, index) =>
        firm({
          name: `Workflow Automation Fund ${index}`,
          country: index === 6 ? "Germany" : index === 7 ? "United States" : "United Kingdom",
          focus: ["AI workflow automation", "B2B SaaS", "operations productivity"],
          stages: ["Pre-Seed", "Seed"],
        })
      )
      const ledgerSpecific = Array.from({ length: 8 }, (_, index) =>
        firm({
          name: `Lending API Fund ${index}`,
          country: index === 6 ? "Germany" : index === 7 ? "United States" : "United Kingdom",
          focus: ["fintech infrastructure", "lending API", "open banking"],
          stages: ["Seed", "Series A"],
        })
      )
      const atlasSelected = selectDiverseInvestorMatches({
        matches: [...shared, ...atlasSpecific, ...ledgerSpecific].map((item) => matchFromFirm(item, companies.atlasops)),
        profile: companies.atlasops,
        targetMatchCount: 10,
      })
      const ledgerSelected = selectDiverseInvestorMatches({
        matches: [...shared, ...atlasSpecific, ...ledgerSpecific].map((item) => matchFromFirm(item, companies.ledgerbridge)),
        profile: companies.ledgerbridge,
        targetMatchCount: 10,
      })
      const atlasFirms = new Set(atlasSelected.map((item) => item.firm.name.toLowerCase()))
      const sharedCount = ledgerSelected.filter((item) => atlasFirms.has(item.firm.name.toLowerCase())).length
      assert.ok(sharedCount < 3, `sharedCount=${sharedCount}`)
    },
  },
  {
    name: "rationale validator rejects generic rationale",
    fn: () => {
      const match = matchFromFirm(
        firm({
          name: "Generic Seed Fund",
          country: "United States",
          focus: ["venture capital"],
          stages: ["Seed"],
        }),
        companies.ledgerbridge
      )
      const result = validateMatchRationale(
        "They invest in startups and support founders with a strong network.",
        companies.ledgerbridge,
        match
      )
      assert.equal(result.valid, false)
    },
  },
  {
    name: "rationale validator passes evidence-based rationale",
    fn: () => {
      const match = matchFromFirm(
        firm({
          name: "API Ledger Ventures",
          country: "United Kingdom",
          focus: ["fintech infrastructure", "lending API", "financial services"],
          stages: ["Seed"],
        }),
        companies.ledgerbridge
      )
      const result = validateMatchRationale(
        "LedgerBridge is raising GBP 1.2m at seed for lending API infrastructure after 3 lender pilots. API Ledger Ventures shows fintech infrastructure and lending API focus at Seed stage, so the fit is strongest around financial services infrastructure. Caveat: cheque size is unknown.",
        companies.ledgerbridge,
        match
      )
      assert.equal(result.valid, true, result.reasons.join(", "))
    },
  },
  {
    name: "outreach validator rejects placeholders",
    fn: () => {
      const context = { profile: companies.atlasops, match: atlasMatch() }
      const sequence = buildFallbackOutreachSequence(context)
      sequence.steps[0].body = "Hi [Name], I am building [Company]."
      assert.equal(validateOutreachSequence(sequence, context).valid, false)
    },
  },
  {
    name: "outreach validator rejects missing Day 0/5/12",
    fn: () => {
      const context = { profile: companies.atlasops, match: atlasMatch() }
      const sequence = buildFallbackOutreachSequence(context)
      sequence.steps[1].sendAfterDays = 6
      assert.equal(validateOutreachSequence(sequence, context).valid, false)
    },
  },
  {
    name: "outreach fallback returns exactly Day 0/5/12",
    fn: () => {
      const context = { profile: companies.atlasops, match: atlasMatch() }
      const sequence = buildFallbackOutreachSequence(context)
      assert.deepEqual(sequence.steps.map((step) => step.sendAfterDays), [0, 5, 12])
      assert.equal(validateOutreachSequence(sequence, context).valid, true)
    },
  },
  {
    name: "outreach fallback includes company name and investor firm",
    fn: () => {
      const context = { profile: companies.atlasops, match: atlasMatch() }
      const sequence = buildFallbackOutreachSequence(context)
      const text = JSON.stringify(sequence).toLowerCase()
      assert.match(text, /atlasops/)
      assert.match(text, /workflow seed/)
    },
  },
  {
    name: "outreach fallback stays valid with huge scraped focus text",
    fn: () => {
      const hugeMatch = matchFromFirm(
        firm({
          name: "Huge Focus Ventures",
          country: "United Kingdom",
          focus: [
            "Venture Capital & Private Equity",
            Array.from({ length: 80 }, (_, index) => `very long scraped focus term ${index}`).join(", "),
            "AI workflow automation",
            "B2B SaaS",
          ],
          stages: ["Pre-Seed", "Seed"],
        }),
        companies.atlasops
      )
      const context = { profile: companies.atlasops, match: hugeMatch }
      const sequence = buildFallbackOutreachSequence(context)
      const result = validateOutreachSequence(sequence, context)
      assert.equal(result.valid, true, result.reasons.join(", "))
    },
  },
  {
    name: "ensureValidOutreachSequence returns valid fallback for invalid generated sequence",
    fn: () => {
      const context = { profile: companies.gridwise, match: matchFromFirm(
        firm({
          name: "Climate Seed",
          country: "Germany",
          focus: ["climate tech", "carbon accounting", "sustainability"],
          stages: ["Pre-Seed", "Seed"],
        }),
        companies.gridwise
      ) }
      const invalid = {
        steps: [
          { step: 1, label: "Intro", subject: "Hi", body: "Dear Investor, [Company]", sendAfterDays: 0 },
        ],
      }
      const repaired = ensureValidOutreachSequence(invalid, context)
      const result = validateOutreachSequence(repaired.sequence, context)
      assert.equal(result.valid, true, result.reasons.join(", "))
    },
  },
  {
    name: "cheque fit unknown does not count as strong",
    fn: () => {
      const unknown = assessChequeFit("Seed stage B2B SaaS investor.", 750000, true)
      assert.equal(unknown.fit, "Unknown")
      assert.ok(unknown.score < 10)
    },
  },
]

for (const test of tests) {
  test.fn()
  console.log(`PASS ${test.name}`)
}

console.log(`\n${tests.length}/${tests.length} targeted investor matching tests passed.`)

function makeProfile(input: {
  name: string
  sectorRaw: string
  subSector: string
  stage: FounderProfile["company"]["stage"]
  raise: number
  geography: string
  oneLiner: string
  traction: FounderProfile["traction"]
  keywords: string[]
}): FounderProfile {
  return {
    userId: "qa",
    deckId: input.name.toLowerCase().replace(/\s+/g, "-"),
    company: {
      name: input.name,
      oneLiner: input.oneLiner,
      sector: inferBucket(input.sectorRaw),
      businessModel: input.sectorRaw.toLowerCase().includes("consumer") ? "b2c" : "b2b-saas",
      sectorRaw: input.sectorRaw,
      subSector: input.subSector,
      businessModelRaw: input.sectorRaw,
      stage: input.stage,
      geography: input.geography,
    },
    traction: input.traction,
    team: { founders: [{ name: "QA Founder", role: "Founder", background: "" }] },
    raise: { amount: input.raise, use_of_funds: ["product", "sales"] },
    deckSignals: {
      overallScore: 65,
      summary: `${input.name} ${input.oneLiner} ${input.sectorRaw}`,
      categoryScores: [{ category: "Problem", score: 80, feedback: "Clear problem" }],
      strengths: [`${input.name} has concrete traction in ${input.subSector}`],
      weaknesses: ["Market size needs more detail"],
      missingSections: [],
      priorityActions: [],
      fundraisingRisks: [],
      investorReadiness: "Needs more detail",
      keywords: input.keywords,
    },
  }
}

function inferBucket(raw: string): FounderProfile["company"]["sector"] {
  const lower = raw.toLowerCase()
  if (lower.includes("health")) return "HealthTech"
  if (lower.includes("fintech")) return "FinTech"
  if (lower.includes("ai")) return "AI"
  if (lower.includes("saas") || lower.includes("climate")) return "SaaS"
  return "Other"
}

function firm(input: {
  name: string
  country: string
  focus: string[]
  stages: string[]
  description?: string
}): MergedFirm {
  return {
    Firm_Name: input.name,
    Firm_Type: "Venture Capital Investor",
    Country: input.country,
    Focus_Areas: input.focus,
    Investment_Stages: input.stages,
    Description: input.description ?? input.focus.join(", "),
    Contacts: [
      {
        Name: `${input.name} Partner`,
        Title: "Partner",
        Email: `${input.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
        LinkedIn: `https://www.linkedin.com/in/${input.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      },
    ],
    recentDealCount: 0,
    recentDealCompanies: [],
  }
}

function matchFromFirm(firmInput: MergedFirm, profile: FounderProfile): Omit<InvestorMatch, "rank" | "outreachEmail" | "outreachSequence"> {
  const assessment = scoreFirmForProfile(firmInput, profile)
  const contact = firmInput.Contacts[0]!
  return {
    fitScore: assessment.score,
    firm: {
      name: firmInput.Firm_Name,
      type: firmInput.Firm_Type,
      country: firmInput.Country,
      focusAreas: firmInput.Focus_Areas,
      investmentStages: firmInput.Investment_Stages,
      recentInvestments: [],
    },
    partner: {
      name: contact.Name,
      title: contact.Title,
      email: contact.Email,
      linkedin: contact.LinkedIn ?? "",
    },
    matchRationale: `${profile.company.name} is raising GBP ${Math.round(profile.raise.amount / 1000)}k for ${profile.company.sectorRaw}. ${firmInput.Firm_Name} shows ${firmInput.Focus_Areas.join(", ")} focus at ${firmInput.Investment_Stages.join(", ")} stage. Caveat: cheque size is unknown.`,
    chequeFit: assessment.chequeFit,
    chequeSize: assessment.chequeSize,
    fitBreakdown: assessment.facets,
    recentLinkedInSignals: [],
  }
}

function atlasMatch() {
  return matchFromFirm(
    firm({
      name: "Workflow Seed",
      country: "United Kingdom",
      focus: ["AI workflow automation", "B2B SaaS", "productivity"],
      stages: ["Pre-Seed", "Seed"],
    }),
    companies.atlasops
  )
}
