import type { MergedFirm } from "@/lib/matching/merge"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

export type InvestorVertical =
  | "ai_workflow"
  | "b2b_saas"
  | "climate"
  | "consumer"
  | "edtech"
  | "fintech"
  | "healthtech"
  | "search_fund"
  | "other"

export type InvestorRegion = "UK" | "Europe" | "US" | "Global" | "Other"
export type ChequeFit = "Strong" | "Partial" | "Weak" | "Unknown"

export type InvestorDiscoveryQuery = {
  region: InvestorRegion
  query: string
  companyKeywords: string[]
  locations: string[]
}

export type InvestorFitAssessment = {
  score: number
  region: InvestorRegion
  vertical: InvestorVertical
  isGeneralist: boolean
  isSectorSpecialist: boolean
  chequeFit: ChequeFit
  chequeSize?: string
  facets: {
    sectorFit: number
    stageFit: number
    geographyFit: number
    chequeFit: number
    businessModelFit: number
    tractionFit: number
    evidenceQuality: number
  }
  penalties: string[]
  evidence: {
    sector: string[]
    stage: string[]
    geography: string[]
    businessModel: string[]
  }
}

type RankedMatch = Omit<InvestorMatch, "rank" | "outreachEmail" | "outreachSequence">

const EUROPE_COUNTRIES = [
  "united kingdom",
  "ireland",
  "france",
  "germany",
  "netherlands",
  "belgium",
  "luxembourg",
  "spain",
  "portugal",
  "italy",
  "switzerland",
  "austria",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "poland",
  "czech republic",
  "estonia",
  "latvia",
  "lithuania",
  "romania",
  "bulgaria",
  "greece",
  "slovenia",
  "croatia",
]

const REGION_LOCATIONS: Record<InvestorRegion, string[]> = {
  UK: ["united kingdom"],
  Europe: EUROPE_COUNTRIES.filter((country) => country !== "united kingdom"),
  US: ["united states", "canada"],
  Global: [
    "united kingdom",
    "france",
    "germany",
    "netherlands",
    "united states",
    "canada",
    "singapore",
    "israel",
  ],
  Other: [],
}

const VERTICAL_TERMS: Record<InvestorVertical, string[]> = {
  ai_workflow: [
    "ai",
    "artificial intelligence",
    "workflow",
    "workflow automation",
    "automation",
    "productivity",
    "operations",
    "b2b saas",
    "enterprise software",
  ],
  b2b_saas: [
    "b2b saas",
    "saas",
    "enterprise software",
    "workflow software",
    "business software",
    "productivity",
  ],
  climate: [
    "climatetech",
    "climate",
    "carbon",
    "carbon accounting",
    "emissions",
    "sustainability",
    "esg",
    "climate software",
    "carbon accounting saas",
    "sme emissions",
  ],
  consumer: [
    "consumer",
    "consumer app",
    "social",
    "gen z",
    "events",
    "community",
    "marketplace",
    "consumer social",
  ],
  edtech: [
    "edtech",
    "education",
    "education technology",
    "learning",
    "exam prep",
    "student",
  ],
  fintech: [
    "fintech",
    "fin tech",
    "lending api",
    "lending",
    "api",
    "infrastructure",
    "fintech infrastructure",
    "lending infrastructure",
    "financial infrastructure",
    "banking",
    "open banking",
    "embedded finance",
    "payments",
    "credit",
    "financial technology",
    "finance technology",
    "financial services",
  ],
  healthtech: [
    "healthtech",
    "healthcare",
    "digital health",
    "clinic",
    "clinical",
    "patient",
    "private clinics",
    "healthcare saas",
  ],
  search_fund: [
    "search fund",
    "acquisition",
    "buy and build",
    "holdco",
    "lower middle market",
  ],
  other: [],
}

const VERTICAL_QUERY_PHRASES: Record<InvestorVertical, string> = {
  ai_workflow: "B2B SaaS AI workflow automation productivity",
  b2b_saas: "B2B SaaS enterprise software",
  climate: "ClimateTech carbon accounting climate software SME emissions",
  consumer: "consumer social app Gen Z community events",
  edtech: "EdTech education software learning",
  fintech: "fintech infrastructure lending API financial services",
  healthtech: "HealthTech digital health clinic SaaS healthcare software",
  search_fund: "search fund acquisition holdco",
  other: "specialist early-stage",
}

const STAGE_TERMS: Record<FounderProfile["company"]["stage"], string[]> = {
  "pre-seed": ["pre-seed", "pre seed", "first cheque", "first check", "seed"],
  seed: ["seed", "pre-seed", "pre seed", "series a"],
  "series-a": ["series a", "series-a", "series b"],
}

const BUSINESS_MODEL_TERMS: Record<FounderProfile["company"]["businessModel"], string[]> = {
  "b2b-saas": ["b2b", "saas", "enterprise", "software", "subscription"],
  b2c: ["consumer", "b2c", "mobile app", "social"],
  marketplace: ["marketplace", "network effects", "two-sided"],
  b2b2c: ["b2b2c", "platform", "partners"],
}

const GENERIC_INVESTOR_TERMS = [
  "venture capital",
  "private equity",
  "startup",
  "startups",
  "entrepreneurs",
  "founders",
  "early stage",
  "early-stage",
  "seed stage",
  "capital",
  "portfolio",
  "community",
  "network",
]

const GENERIC_RATIONALE_PATTERNS = [
  /\binvests? in startups\b/i,
  /\bearly[- ]stage\b.{0,40}\bfit\b/i,
  /\baligns? with (your|our|the) (sector|vision|mission)\b/i,
  /\bsupports? founders\b/i,
  /\bstrong network\b/i,
  /\bvaluable support\b/i,
  /\bperfect fit\b/i,
  /\bgreat match\b/i,
  /\bpassionate about\b/i,
]

export function detectInvestorVertical(profile: FounderProfile): InvestorVertical {
  const text = founderText(profile)

  if (hasAny(text, ["search fund", "buy and build", "holdco", "lower middle market"])) {
    return "search_fund"
  }
  if (hasAny(text, ["climatetech", "climate", "carbon", "emissions", "sustainability", "net zero", "esg"])) {
    return "climate"
  }
  if (hasAny(text, ["healthtech", "healthcare", "digital health", "clinic", "clinical", "patient", "medical"])) {
    return "healthtech"
  }
  if (hasAny(text, ["fintech", "financial services", "lending", "banking", "payments", "embedded finance", "credit"])) {
    return "fintech"
  }
  if (hasAny(text, ["consumer", "social", "gen z", "events", "community", "consumer app"])) {
    return "consumer"
  }
  if (hasAny(text, ["edtech", "education", "exam prep", "learning", "student"])) {
    return "edtech"
  }
  if (hasAny(text, ["ai workflow", "workflow automation", "ai automation"]) || (text.includes("ai") && hasAny(text, ["workflow", "automation", "productivity", "operations"]))) {
    return "ai_workflow"
  }
  if (hasAny(text, ["b2b saas", "saas", "enterprise software", "software platform"])) {
    return "b2b_saas"
  }
  return "other"
}

export function buildCompanySpecificThesisKeywords(
  profile: FounderProfile,
  maxKeywords = 8
): string[] {
  const vertical = detectInvestorVertical(profile)
  const seen = new Set<string>()
  const keywords: string[] = []

  const add = (value: string | undefined | null) => {
    if (!value || keywords.length >= maxKeywords) return
    const cleaned = value.trim().replace(/\s+/g, " ")
    const lower = cleaned.toLowerCase()
    if (cleaned.length < 2 || cleaned.length > 48) return
    if (seen.has(lower) || lower === "other") return
    if (GENERIC_INVESTOR_TERMS.includes(lower)) return
    seen.add(lower)
    keywords.push(cleaned)
  }

  for (const term of VERTICAL_TERMS[vertical]) add(term)
  for (const raw of [profile.company.sectorRaw, profile.company.subSector, profile.company.businessModelRaw]) {
    for (const part of raw.split(/[|/,]+/)) add(part)
  }
  for (const term of profile.deckSignals?.keywords ?? []) add(term)

  if (keywords.length < 3) {
    add(profile.company.sector)
    add(profile.company.businessModel)
  }

  return keywords.slice(0, maxKeywords)
}

export function buildInvestorDiscoveryQueries(profile: FounderProfile): InvestorDiscoveryQuery[] {
  const vertical = detectInvestorVertical(profile)
  const stage = readableStage(profile.company.stage)
  const phrase = VERTICAL_QUERY_PHRASES[vertical]
  const keywords = buildCompanySpecificThesisKeywords(profile, 8)

  return founderDiscoveryRegions(profile).map((region) => {
    const regionPrefix =
      region === "UK" ? "UK" : region === "Europe" ? "Europe" : region === "US" ? "US/global" : "global"
    return {
      region,
      query: `${regionPrefix} ${stage} ${phrase} investor`,
      companyKeywords: keywords,
      locations: locationsForInvestorRegion(region),
    }
  })
}

export function founderDiscoveryRegions(profile: FounderProfile): InvestorRegion[] {
  const geo = `${profile.company.geography} ${profile.company.oneLiner}`.toLowerCase()

  if (geo.startsWith("uk") || hasAny(geo, ["united kingdom", " uk", "london", "britain"])) {
    return ["UK", "Europe", "US"]
  }
  if (geo.includes("europe")) return ["Europe", "UK", "US"]
  if (hasAny(geo, ["united states", " usa", " us ", "north america"])) {
    return ["US", "UK", "Europe"]
  }
  if (hasAny(geo, ["worldwide", "global", "international"])) {
    return ["UK", "Europe", "US"]
  }
  return ["Global"]
}

export function locationsForInvestorRegion(region: InvestorRegion): string[] {
  return [...REGION_LOCATIONS[region]]
}

export function classifyInvestorRegion(country: string | undefined | null): InvestorRegion {
  const lower = (country ?? "").trim().toLowerCase()
  if (!lower) return "Other"
  if (hasAny(lower, ["united kingdom", "england", "scotland", "wales", "northern ireland", "london"])) {
    return "UK"
  }
  if (hasAny(lower, ["united states", "usa", "u.s.", "new york", "san francisco", "california"])) {
    return "US"
  }
  if (EUROPE_COUNTRIES.some((countryName) => lower.includes(countryName))) return "Europe"
  if (hasAny(lower, ["global", "worldwide", "international"])) return "Global"
  return "Other"
}

export function scoreFirmForProfile(
  firm: Pick<MergedFirm, "Country" | "Description" | "Firm_Name" | "Firm_Type" | "Focus_Areas" | "Investment_Stages" | "recentDealCompanies" | "recentDealCount">,
  profile: FounderProfile
): InvestorFitAssessment {
  const vertical = detectInvestorVertical(profile)
  const text = investorTextFromFirm(firm)
  const region = classifyInvestorRegion(firm.Country)
  const sectorEvidence = matchedSectorEvidence(text, vertical)
  const businessEvidence = matchedTerms(text, BUSINESS_MODEL_TERMS[profile.company.businessModel])
  const stageEvidence = matchedTerms(text, STAGE_TERMS[profile.company.stage])
  const cheque = assessChequeFit(text, profile.raise.amount, stageEvidence.length > 0)
  const focusText = firm.Focus_Areas.join(" ").toLowerCase()
  const hasSpecificFocus = sectorEvidence.length > 0 || businessEvidence.length > 1
  const isGeneralist = isGeneralistInvestorText(focusText || text, hasSpecificFocus)

  const facets = {
    sectorFit: sectorScore(sectorEvidence, vertical, text),
    stageFit: stageScore(firm.Investment_Stages, stageEvidence, profile.company.stage),
    geographyFit: geographyScore(region, profile),
    chequeFit: cheque.score,
    businessModelFit: businessModelScore(businessEvidence, profile),
    tractionFit: tractionScore(profile),
    evidenceQuality: evidenceQualityScore(firm, sectorEvidence),
  }

  const penalties: string[] = []
  if (isGeneralist && facets.sectorFit < 20) penalties.push("generic_broad_fund_without_vertical_evidence")
  if (facets.sectorFit === 0) penalties.push("unknown_sector_evidence")
  if (facets.geographyFit <= 5 && founderIsUkOrEurope(profile)) penalties.push("wrong_geography_without_local_mandate")
  if (cheque.fit === "Unknown") penalties.push("unknown_cheque_size")
  if (facets.evidenceQuality <= 1) penalties.push("weak_investor_evidence")

  const penaltyScore = penalties.reduce((sum, penalty) => {
    if (penalty === "generic_broad_fund_without_vertical_evidence") return sum + 15
    if (penalty === "unknown_sector_evidence") return sum + 20
    if (penalty === "wrong_geography_without_local_mandate") return sum + 10
    if (penalty === "unknown_cheque_size") return sum + 5
    if (penalty === "weak_investor_evidence") return sum + 10
    return sum
  }, 0)

  const rawScore =
    facets.sectorFit +
    facets.stageFit +
    facets.geographyFit +
    facets.chequeFit +
    facets.businessModelFit +
    facets.tractionFit +
    facets.evidenceQuality -
    penaltyScore

  return {
    score: clamp(Math.round(rawScore), 0, 100),
    region,
    vertical,
    isGeneralist,
    isSectorSpecialist: sectorEvidence.length >= 2 || facets.sectorFit >= 28,
    chequeFit: cheque.fit,
    chequeSize: cheque.size,
    facets,
    penalties,
    evidence: {
      sector: sectorEvidence,
      stage: stageEvidence,
      geography: region === "Other" ? [] : [region],
      businessModel: businessEvidence,
    },
  }
}

export function assessMatchForProfile(
  match: RankedMatch,
  profile: FounderProfile
): InvestorFitAssessment {
  return scoreFirmForProfile(
    {
      Firm_Name: match.firm.name,
      Firm_Type: match.firm.type,
      Country: match.firm.country,
      Focus_Areas: match.firm.focusAreas,
      Investment_Stages: match.firm.investmentStages,
      Description: [
        ...match.firm.focusAreas,
        match.recentLinkedInSignals.map((signal) => signal.postText).join(" "),
      ].join(" "),
      recentDealCount: match.firm.recentInvestments.length,
      recentDealCompanies: match.firm.recentInvestments.map((deal) => ({
        name: deal.company,
        stage: deal.stage,
        date: deal.announcedDate,
      })),
    },
    profile
  )
}

export function applyFitAssessmentToMatch(match: RankedMatch, profile: FounderProfile): RankedMatch {
  const assessment = assessMatchForProfile(match, profile)
  const modelScore = Number.isFinite(match.fitScore) ? match.fitScore : assessment.score
  const fitScore = clamp(
    Math.round(assessment.score * 0.75 + Math.min(modelScore, assessment.score + 10) * 0.25),
    0,
    100
  )
  const rationale = validateMatchRationale(match.matchRationale, profile, match).valid
    ? match.matchRationale
    : composeEvidenceBasedRationale(profile, match, assessment)

  return {
    ...match,
    fitScore,
    matchRationale: rationale,
    chequeFit: assessment.chequeFit,
    chequeSize: assessment.chequeSize,
    fitBreakdown: assessment.facets,
    rationaleComponents: buildRationaleComponents(profile, match, assessment),
  }
}

export function selectDiverseInvestorMatches({
  matches,
  profile,
  targetMatchCount,
}: {
  matches: RankedMatch[]
  profile: FounderProfile
  targetMatchCount: number
}): RankedMatch[] {
  const assessed = matches
    .map((match) => {
      const updated = applyFitAssessmentToMatch(match, profile)
      return { match: updated, assessment: assessMatchForProfile(updated, profile) }
    })
    .sort((a, b) => b.match.fitScore - a.match.fitScore)

  const target = Math.min(targetMatchCount, assessed.length)
  const topWindow = Math.min(10, target)
  const localCandidates = assessed.filter(
    (item) =>
      (item.assessment.region === "UK" || item.assessment.region === "Europe") &&
      item.assessment.score >= 45 &&
      item.assessment.facets.sectorFit >= 12
  )
  const regionalCandidates = (region: InvestorRegion) =>
    assessed.filter(
      (item) =>
        item.assessment.region === region &&
        item.assessment.score >= 45 &&
        item.assessment.facets.sectorFit >= 12
    )
  const specialistCandidates = assessed.filter((item) => item.assessment.isSectorSpecialist)
  const minLocal = founderIsUkOrEurope(profile)
    ? Math.min(Math.ceil(topWindow * 0.3), localCandidates.length)
    : 0
  const minSpecialist = Math.min(Math.ceil(topWindow * 0.3), specialistCandidates.length)
  const minRegional =
    founderWantsWorldwide(profile) && topWindow >= 3
      ? {
          UK: Math.min(1, regionalCandidates("UK").length),
          Europe: Math.min(1, regionalCandidates("Europe").length),
          US: Math.min(1, regionalCandidates("US").length),
        }
      : { UK: 0, Europe: 0, US: 0 }
  const genericCap = Math.max(1, Math.floor(topWindow * 0.4))
  const weakEvidenceCap = 2

  const selected: typeof assessed = []
  const used = new Set<string>()

  const keyFor = (match: RankedMatch) =>
    match.firm.name.trim().toLowerCase() ||
    match.partner.linkedin.trim().toLowerCase() ||
    match.partner.email?.trim().toLowerCase() ||
    match.partner.name.trim().toLowerCase()
  const currentGenericCount = () => selected.filter((item) => item.assessment.isGeneralist).length
  const currentWeakCount = () =>
    selected.filter((item) => item.assessment.facets.evidenceQuality <= 1).length

  const canAdd = (item: (typeof assessed)[number], enforceCaps: boolean) => {
    const key = keyFor(item.match)
    if (used.has(key)) return false
    if (!enforceCaps) return true
    if (item.assessment.isGeneralist && currentGenericCount() >= genericCap) return false
    if (item.assessment.facets.evidenceQuality <= 1 && currentWeakCount() >= weakEvidenceCap) return false
    return true
  }

  const addUntil = (
    pool: typeof assessed,
    shouldContinue: () => boolean,
    enforceCaps: boolean
  ) => {
    for (const item of pool) {
      if (selected.length >= target || !shouldContinue()) break
      if (!canAdd(item, enforceCaps)) continue
      selected.push(item)
      used.add(keyFor(item.match))
    }
  }

  addUntil(
    specialistCandidates,
    () => selected.filter((item) => item.assessment.isSectorSpecialist).length < minSpecialist,
    false
  )
  for (const region of ["UK", "Europe", "US"] as const) {
    addUntil(
      regionalCandidates(region),
      () => selected.filter((item) => item.assessment.region === region).length < minRegional[region],
      false
    )
  }
  addUntil(
    localCandidates,
    () =>
      selected.filter(
        (item) => item.assessment.region === "UK" || item.assessment.region === "Europe"
      ).length < minLocal,
    false
  )

  for (const item of assessed) {
    if (selected.length >= target) break
    if (!canAdd(item, selected.length < topWindow)) continue
    selected.push(item)
    used.add(keyFor(item.match))
  }

  for (const item of assessed) {
    if (selected.length >= target) break
    if (used.has(keyFor(item.match))) continue
    selected.push(item)
    used.add(keyFor(item.match))
  }

  return selected.map((item) => item.match).slice(0, target)
}

export function validateMatchRationale(
  rationale: string,
  profile: FounderProfile,
  match: Pick<RankedMatch, "firm" | "partner">
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = []
  const lower = rationale.toLowerCase()
  const startupTerms = startupEvidenceTerms(profile)
  const investorTerms = [
    match.firm.name,
    match.partner.name,
    match.firm.country,
    ...match.firm.focusAreas,
    ...match.firm.investmentStages,
  ]
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 3)

  if (!rationale.trim()) reasons.push("empty")
  if (GENERIC_RATIONALE_PATTERNS.some((pattern) => pattern.test(rationale))) {
    reasons.push("generic_language")
  }
  if (!startupTerms.some((term) => lower.includes(term))) {
    reasons.push("missing_startup_fact")
  }
  if (!investorTerms.some((term) => lower.includes(term))) {
    reasons.push("missing_investor_evidence")
  }

  return { valid: reasons.length === 0, reasons }
}

export function composeEvidenceBasedRationale(
  profile: FounderProfile,
  match: RankedMatch,
  assessment = assessMatchForProfile(match, profile)
): string {
  const components = buildRationaleComponents(profile, match, assessment)
  return [
    `${components.startupFact} ${components.investorEvidence}.`,
    components.fitReason,
    components.caveat,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 600)
}

export function buildRationaleComponents(
  profile: FounderProfile,
  match: Pick<RankedMatch, "firm" | "partner">,
  assessment: InvestorFitAssessment
) {
  const startupFact = buildStartupFact(profile)
  const sectorEvidence = assessment.evidence.sector.slice(0, 3).join(", ")
  const stageEvidence = match.firm.investmentStages.slice(0, 2).join(", ") || "stage focus is not explicit"
  const regionLabel = assessment.region === "Other" ? match.firm.country || "unknown geography" : assessment.region
  const investorEvidence = sectorEvidence
    ? `${match.firm.name} shows investor evidence in ${sectorEvidence}, with ${stageEvidence} coverage from ${regionLabel}`
    : `${match.firm.name} has ${stageEvidence} coverage from ${regionLabel}, but supplied sector evidence is limited`
  const fitReason = assessment.isSectorSpecialist
    ? `Fit is strongest where their thesis evidence overlaps ${profile.company.name}'s ${readableStage(profile.company.stage)} ${VERTICAL_QUERY_PHRASES[assessment.vertical].toLowerCase()} raise.`
    : `Fit is mostly stage or geography-led, so they should rank below investors with clearer vertical evidence.`
  const caveats = []
  if (assessment.chequeFit === "Unknown") caveats.push("Cheque size is unknown")
  if (assessment.isGeneralist) caveats.push("broad/generalist fund")
  if (founderIsUkOrEurope(profile) && assessment.region === "US") caveats.push("US-based, less local than UK/EU funds")
  const caveat = caveats.length ? `Caveat: ${caveats.join("; ")}.` : ""

  return {
    startupFact,
    investorEvidence,
    fitReason,
    caveat,
    confidence: assessment.score >= 75 ? "high" : assessment.score >= 55 ? "medium" : "low",
  }
}

export function assessChequeFit(
  text: string,
  raiseAmount: number,
  stageMatches = false
): { fit: ChequeFit; score: number; size?: string } {
  const range = extractChequeRange(text)
  if (!range) {
    return { fit: "Unknown", score: stageMatches ? 2 : 0 }
  }

  const { min, max, label } = range
  if (raiseAmount > 0 && raiseAmount >= min * 0.6 && raiseAmount <= max * 1.4) {
    return { fit: "Strong", score: 10, size: label }
  }
  if (raiseAmount > 0 && raiseAmount >= min * 0.25 && raiseAmount <= max * 2) {
    return { fit: "Partial", score: 6, size: label }
  }
  return { fit: "Weak", score: 1, size: label }
}

function extractChequeRange(text: string): { min: number; max: number; label: string } | null {
  const lower = text.toLowerCase()
  const rangePattern =
    /(?:cheques?|checks?|tickets?|write|writing|sizes?|ranging)?[^$£€0-9]{0,30}(?:[$£€]|gbp|usd|eur)?\s*([\d.]+)\s*(k|m|mm|million|thousand)?\s*(?:-|to|through|and)\s*(?:[$£€]|gbp|usd|eur)?\s*([\d.]+)\s*(k|m|mm|million|thousand)/i
  const singlePattern =
    /(?:cheques?|checks?|tickets?|write|writing|sizes?)[^$£€0-9]{0,30}(?:[$£€]|gbp|usd|eur)?\s*([\d.]+)\s*(k|m|mm|million|thousand)/i
  const range = lower.match(rangePattern)
  if (range) {
    const first = compactAmount(range[1], range[2] || range[4])
    const second = compactAmount(range[3], range[4])
    if (first && second) {
      return {
        min: Math.min(first, second),
        max: Math.max(first, second),
        label: range[0].trim(),
      }
    }
  }

  const single = lower.match(singlePattern)
  if (single) {
    const amount = compactAmount(single[1], single[2])
    if (amount) return { min: amount * 0.75, max: amount * 1.25, label: single[0].trim() }
  }

  return null
}

function compactAmount(raw: string, unit: string | undefined) {
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const lower = unit?.toLowerCase() ?? ""
  if (lower === "k" || lower === "thousand") return value * 1_000
  if (lower === "m" || lower === "mm" || lower === "million") return value * 1_000_000
  return value
}

function matchedSectorEvidence(text: string, vertical: InvestorVertical) {
  const terms = VERTICAL_TERMS[vertical]
  const raw = matchedTerms(text, terms)

  if (vertical === "ai_workflow") {
    const hasWorkflowContext = hasAny(text, [
      "workflow",
      "automation",
      "productivity",
      "operations",
      "operational efficiency",
    ])
    const hasSoftwareContext = hasAny(text, ["b2b saas", "enterprise software", "software as a service"])
    return raw.filter((term) => {
      if (["workflow", "workflow automation", "automation", "productivity", "operations"].includes(term)) {
        return true
      }
      if (["b2b saas", "enterprise software"].includes(term)) return hasWorkflowContext || hasAny(text, ["ai", "artificial intelligence"])
      if (["ai", "artificial intelligence"].includes(term)) return hasWorkflowContext || hasSoftwareContext
      return true
    })
  }

  if (vertical === "fintech") {
    const core = raw.filter((term) =>
      [
        "fintech",
        "fin tech",
        "lending",
        "lending api",
        "banking",
        "open banking",
        "embedded finance",
        "payments",
        "credit",
        "financial infrastructure",
        "fintech infrastructure",
        "lending infrastructure",
      ].includes(term)
    )
    const hasCore = core.length > 0
    return raw.filter((term) => {
      if (core.includes(term)) return true
      if (term === "api") return hasAny(text, ["lending api", "banking api", "open banking", "fintech api"])
      if (term === "infrastructure") {
        return hasAny(text, ["financial infrastructure", "fintech infrastructure", "lending infrastructure"])
      }
      if (["financial services", "financial technology", "finance technology"].includes(term)) {
        return hasCore
      }
      return true
    })
  }

  return raw.filter((term) => {
    if (vertical === "climate") return !["saas", "b2b saas"].includes(term)
    if (vertical === "healthtech") return term !== "saas"
    return true
  })
}

function sectorScore(evidence: string[], vertical: InvestorVertical, text: string) {
  if (evidence.length >= 3) return 35
  if (evidence.length === 2) return 30
  if (evidence.length === 1) return vertical === "b2b_saas" || vertical === "other" ? 18 : 24
  if ((vertical === "ai_workflow" || vertical === "b2b_saas") && hasAny(text, ["saas", "software"])) {
    return 12
  }
  return 0
}

function stageScore(
  stages: string[],
  stageEvidence: string[],
  founderStage: FounderProfile["company"]["stage"]
) {
  const text = stages.join(" ").toLowerCase()
  if (stageEvidence.length > 0) return 20
  if (!text.trim()) return 6
  if (founderStage === "pre-seed" && text.includes("seed")) return 14
  if (founderStage === "seed" && text.includes("series a")) return 12
  return 0
}

function geographyScore(region: InvestorRegion, profile: FounderProfile) {
  const localFounder = founderIsUkOrEurope(profile)
  if (localFounder) {
    if (region === "UK") return 15
    if (region === "Europe") return 13
    if (region === "Global") return 9
    if (region === "US") return 7
    return 4
  }
  const preferred = founderDiscoveryRegions(profile)[0]
  if (region === preferred) return 15
  if (region === "Global") return 10
  if (region === "US") return 8
  return 5
}

function businessModelScore(evidence: string[], profile: FounderProfile) {
  if (evidence.length >= 2) return 10
  if (evidence.length === 1) return profile.company.businessModel === "b2b-saas" ? 7 : 6
  return 0
}

function tractionScore(profile: FounderProfile) {
  if (profile.traction.mrr || profile.traction.customers || profile.traction.users) return 5
  if (profile.raise.amount > 0) return 3
  return 0
}

function evidenceQualityScore(
  firm: Pick<MergedFirm, "Description" | "Focus_Areas" | "recentDealCompanies" | "recentDealCount">,
  sectorEvidence: string[]
) {
  let score = 0
  if (sectorEvidence.length) score += 2
  if (firm.Description && firm.Description.length > 80) score += 1
  if (firm.Focus_Areas.some((area) => !GENERIC_INVESTOR_TERMS.includes(area.toLowerCase()))) score += 1
  if ((firm.recentDealCount ?? 0) > 0 || (firm.recentDealCompanies ?? []).length > 0) score += 1
  return Math.min(score, 5)
}

function matchedTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  const matches: string[] = []
  for (const term of terms) {
    const cleaned = term.toLowerCase()
    if (cleaned.length >= 2 && lower.includes(cleaned) && !matches.includes(cleaned)) {
      matches.push(cleaned)
    }
  }
  return matches
}

function isGeneralistInvestorText(text: string, hasSpecificFocus: boolean) {
  if (hasSpecificFocus) return false
  const genericHits = GENERIC_INVESTOR_TERMS.filter((term) => text.includes(term)).length
  return genericHits >= 2 || !text.trim()
}

function investorTextFromFirm(
  firm: Pick<MergedFirm, "Description" | "Firm_Name" | "Firm_Type" | "Focus_Areas" | "Investment_Stages" | "Country" | "recentDealCompanies">
) {
  return [
    firm.Firm_Name,
    firm.Firm_Type,
    firm.Country,
    firm.Description,
    ...firm.Focus_Areas,
    ...firm.Investment_Stages,
    ...(firm.recentDealCompanies ?? []).map((deal) => `${deal.name} ${deal.stage ?? ""}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function founderText(profile: FounderProfile) {
  return [
    profile.company.name,
    profile.company.oneLiner,
    profile.company.sector,
    profile.company.sectorRaw,
    profile.company.subSector,
    profile.company.businessModel,
    profile.company.businessModelRaw,
    profile.company.geography,
    profile.deckSignals?.summary,
    ...(profile.deckSignals?.keywords ?? []),
    ...(profile.deckSignals?.strengths ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function startupEvidenceTerms(profile: FounderProfile) {
  return [
    profile.company.name,
    profile.company.sectorRaw,
    profile.company.subSector,
    readableStage(profile.company.stage),
    ...buildCompanySpecificThesisKeywords(profile, 6),
    profile.traction.mrr ? String(profile.traction.mrr) : "",
    profile.traction.customers ? String(profile.traction.customers) : "",
    profile.traction.users ? String(profile.traction.users) : "",
    profile.raise.amount ? String(profile.raise.amount) : "",
  ]
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 2)
}

function buildStartupFact(profile: FounderProfile) {
  const facts = []
  if (profile.traction.mrr) facts.push(`${formatMoney(profile.traction.mrr)} MRR`)
  if (profile.traction.customers) facts.push(`${profile.traction.customers} customers`)
  if (profile.traction.users) facts.push(`${profile.traction.users.toLocaleString("en-GB")} users`)
  if (profile.raise.amount) facts.push(`${formatMoney(profile.raise.amount)} ${readableStage(profile.company.stage)} raise`)
  const traction = facts.length ? ` with ${facts.slice(0, 2).join(" and ")}` : ""
  return `${profile.company.name} is a ${readableStage(profile.company.stage)} ${profile.company.sectorRaw || profile.company.sector} company${traction}.`
}

function founderIsUkOrEurope(profile: FounderProfile) {
  const geo = profile.company.geography.toLowerCase()
  return hasAny(geo, ["united kingdom", " uk", "europe", "london", "britain"])
}

export function founderWantsWorldwide(profile: FounderProfile) {
  const geo = profile.company.geography.toLowerCase()
  return founderIsUkOrEurope(profile) && hasAny(geo, ["worldwide", "global", "international"])
}

function readableStage(stage: FounderProfile["company"]["stage"]) {
  return stage === "series-a" ? "Series A" : stage
}

function formatMoney(amount: number) {
  if (amount >= 1_000_000) return `GBP ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}m`
  if (amount >= 1_000) return `GBP ${Math.round(amount / 1_000)}k`
  return `GBP ${amount}`
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
