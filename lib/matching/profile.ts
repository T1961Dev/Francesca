import { inferStageFromDeck } from "@/lib/matching/deck-discovery"
import type { DeckSignals, FounderProfile } from "@/types/profile"

type SourceRecord = Record<string, unknown>

export function buildFounderProfile({
  userId,
  deckAnalysisId,
  profile,
  deckAnalysis,
}: {
  userId: string
  deckAnalysisId: string
  profile: SourceRecord
  deckAnalysis: SourceRecord
}): FounderProfile {
  const companyName = pickString(profile, ["company_name"]) ?? "Unknown company"
  const summary = pickString(deckAnalysis, ["summary"]) ?? pickString(profile, ["description"]) ?? ""
  const profileSector = pickString(profile, ["sector", "industry"]) ?? ""
  const profileSubSector = pickString(profile, ["sector", "industry"]) ?? profileSector
  const stage = pickString(profile, ["stage", "funding_stage"])
  // Sector bucketing reads the FULL deck summary alongside the user's stated
  // sector. The user often picks a generic option (e.g. "SaaS") while the
  // deck describes a specific vertical (e.g. exam prep / EdTech), so we
  // need both signals — and a phrase-aware classifier that doesn't latch
  // onto incidental words like "financial" in a fundraising paragraph.
  const sectorBasis = `${profileSector} ${summary}`.trim() || profileSector || summary

  const deckSignals = buildDeckSignals(deckAnalysis)

  // Extract traction numerics from deck strengths / category feedback so the
  // ranker can see real progress, not an empty {}. We never invent numbers;
  // we only surface ones that already appear in the deck-analysis text.
  const traction = extractTractionFromSignals(deckSignals)

  const raiseAmount = pickNumber(profile, ["target_raise"]) ?? 0
  const inferredSector = normaliseSector(sectorBasis)
  const businessModelRaw = deriveBusinessModelRaw(summary, profileSector, deckAnalysis)

  const company = {
    name: companyName,
    oneLiner: summary || companyName,
    sector: inferredSector,
    businessModel: normaliseBusinessModel(`${profileSector} ${summary}`),
    sectorRaw: profileSector || inferredSector,
    subSector: profileSubSector || inferredSector,
    businessModelRaw,
    stage: normaliseStage(stage),
    geography: pickString(profile, ["geography", "location"]) ?? "United Kingdom",
  }

  const founderProfile: FounderProfile = {
    userId,
    deckId: deckAnalysisId,
    company,
    traction,
    team: {
      founders: [
        {
          name: pickString(profile, ["full_name"]) ?? "Founder",
          role: pickString(profile, ["role"]) ?? "Founder",
          background: pickString(profile, ["description"]) ?? "",
        },
      ],
    },
    raise: {
      amount: raiseAmount,
      use_of_funds: pickUseOfFunds(deckAnalysis),
    },
    deckSignals,
  }

  founderProfile.company.stage = inferStageFromDeck(founderProfile)
  return founderProfile
}

/**
 * Phrase-weighted sector classifier. Counts hits against curated vocabulary
 * for each bucket, then returns the highest-scoring bucket. Strong signals
 * (e.g. "edtech", "fintech") count 3; mid signals (e.g. "exam", "lending")
 * count 2; weak signals (e.g. "financial") count 1.
 *
 * This avoids the previous bug where a stray "financial" in a fundraising
 * paragraph mis-bucketed an EdTech deck as FinTech.
 */
function normaliseSector(value: string): FounderProfile["company"]["sector"] {
  const lower = value.toLowerCase()

  const scores: Record<FounderProfile["company"]["sector"], number> = {
    EdTech: 0,
    FinTech: 0,
    SaaS: 0,
    HealthTech: 0,
    AI: 0,
    Other: 0,
  }

  const add = (bucket: keyof typeof scores, terms: Array<[string, number]>) => {
    for (const [term, weight] of terms) {
      if (lower.includes(term)) scores[bucket] += weight
    }
  }

  add("EdTech", [
    ["edtech", 3], ["ed-tech", 3], ["education technology", 3],
    ["e-learning", 3], ["online learning", 3], ["edu-tech", 3],
    ["exam technique", 3], ["exam preparation", 2], ["exam prep", 2], ["tutoring", 2],
    ["learning platform", 2], ["learning management", 2],
    ["student", 2], ["curriculum", 2], ["pedagog", 2],
    ["education", 1], ["learning", 1], ["teaching", 1], ["school", 1],
    ["course", 1],
  ])

  add("FinTech", [
    ["fintech", 3], ["fin-tech", 3], ["financial services", 3],
    ["payments", 2], ["banking", 2], ["lending", 2], ["insurtech", 3],
    ["wealth management", 2], ["embedded finance", 3], ["neobank", 3],
    ["payroll", 2], ["financial product", 2], ["money transfer", 2],
    // Note: bare "financial" / "finance" are not counted — they appear
    // in any deck that mentions financial projections or financials.
  ])

  add("HealthTech", [
    ["healthtech", 3], ["digital health", 3], ["medtech", 3],
    ["telemedicine", 3], ["telehealth", 3], ["biotech", 3],
    ["clinical", 2], ["diagnostics", 2], ["wearable", 2],
    ["patient", 2], ["pharma", 2], ["medical", 1], ["health", 1],
  ])

  add("AI", [
    ["artificial intelligence", 3], ["machine learning", 3], ["llm", 3],
    ["large language model", 3], ["deep learning", 3], ["generative ai", 3],
    ["computer vision", 2], ["natural language processing", 3], ["nlp", 2],
    ["foundation model", 3], ["ai-powered", 2], ["ai-driven", 2],
    ["deeptech", 2], ["deep tech", 2],
    [" ai ", 1], ["ai exam", 2], ["ai assistant", 2],
  ])

  add("SaaS", [
    ["saas", 3], ["b2b software", 3], ["software-as-a-service", 3],
    ["enterprise software", 3], ["workflow software", 2],
    ["productivity tool", 2], ["business software", 2],
    ["subscription software", 2], ["software platform", 2],
  ])

  add("Other", [
    ["search fund", 4], ["roll-up", 4], ["rollup", 4], ["buy and build", 3],
    ["holdco", 3], ["holding company", 3], ["lower middle market", 3],
    ["acquisition platform", 3], ["micro pe", 3],
  ])

  const ranked = (Object.entries(scores) as Array<[FounderProfile["company"]["sector"], number]>)
    .sort((a, b) => b[1] - a[1])

  // If multiple buckets tie at the top, prefer specialised verticals over
  // the broad "SaaS" bucket — a fintech SaaS company should be FinTech.
  const [topBucket, topScore] = ranked[0]
  if (topScore <= 0) return "Other"

  const verticalPriority: Array<FounderProfile["company"]["sector"]> = [
    "EdTech", "FinTech", "HealthTech", "AI", "SaaS",
  ]
  for (const bucket of verticalPriority) {
    if (scores[bucket] === topScore && bucket !== "Other") return bucket
  }
  return topBucket
}

function normaliseStage(value: string | null): FounderProfile["company"]["stage"] {
  const lower = value?.toLowerCase().replace(/_/g, "-") ?? ""
  if (lower.includes("series-a") || lower.includes("series a")) return "series-a"
  if (lower.includes("pre-seed") || lower.includes("preseed")) return "pre-seed"
  return "seed"
}

function normaliseBusinessModel(value: string): FounderProfile["company"]["businessModel"] {
  const lower = value.toLowerCase()
  if (lower.includes("marketplace")) return "marketplace"
  if (lower.includes("b2b2c")) return "b2b2c"
  if (lower.includes("consumer") || lower.includes("b2c")) return "b2c"
  return "b2b-saas"
}

function deriveBusinessModelRaw(summary: string, sector: string, deckAnalysis?: SourceRecord) {
  const extra = deckAnalysis
    ? [
        pickStringArray(deckAnalysis.strengths),
        pickStringArray(deckAnalysis.fundraising_risks ?? deckAnalysis.fundraisingRisks),
      ].flat().join(" ")
    : ""
  const haystack = `${summary} ${sector} ${extra}`.toLowerCase()
  const isRollUpThesis =
    /\bsearch fund\b/.test(haystack) ||
    /\broll[- ]?up\b/.test(haystack) ||
    /\bbuy[- ]and[- ]build\b/.test(haystack) ||
    /\bholdco\b/.test(haystack) ||
    /\bholding company\b/.test(haystack) ||
    (/\bacquisition\b/.test(haystack) &&
      !/\b(customer|user|go-to-market|gtm) acquisition\b/.test(haystack) &&
      /\b(portfolio|platform|target companies|lower middle market|lmm)\b/.test(haystack))
  if (isRollUpThesis) {
    return "holdco / acquisitions"
  }
  if (haystack.includes("marketplace")) return "marketplace"
  if (haystack.includes("b2b2c")) return "b2b2c"
  if (haystack.includes("consumer") || haystack.includes("b2c") || haystack.includes("direct to consumer")) return "b2c"
  if (haystack.includes("hardware") || haystack.includes("device")) return "hardware"
  if (haystack.includes("services") && !haystack.includes("saas")) return "services"
  if (haystack.includes("agency")) return "agency"
  if (haystack.includes("saas") || haystack.includes("software")) return "b2b-saas"
  return "b2b-saas"
}

function pickUseOfFunds(deckAnalysis: SourceRecord) {
  const actions = deckAnalysis.priority_actions ?? deckAnalysis.priorityActions
  if (!Array.isArray(actions)) return []

  return actions
    .map((action) => {
      if (!action || typeof action !== "object") return null
      return pickString(action as SourceRecord, ["action", "reason"])
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 5)
}

/** Build a structured DeckSignals payload from a deck_analyses row. */
function buildDeckSignals(deckAnalysis: SourceRecord): DeckSignals {
  const categoryScores = normaliseCategoryScores(
    deckAnalysis.category_scores ?? deckAnalysis.categoryScores
  )
  const strengths = pickStringArray(deckAnalysis.strengths)
  const weaknesses = pickStringArray(deckAnalysis.weaknesses)
  const missingSections = pickStringArray(deckAnalysis.missing_sections ?? deckAnalysis.missingSections)
  const priorityActions = normalisePriorityActions(
    deckAnalysis.priority_actions ?? deckAnalysis.priorityActions
  )
  const fundraisingRisks = pickStringArray(
    deckAnalysis.fundraising_risks ?? deckAnalysis.fundraisingRisks
  )
  const summary = pickString(deckAnalysis, ["summary"]) ?? ""
  const investorReadiness = pickString(deckAnalysis, ["investor_readiness", "investorReadiness"])
  const overallScore = pickNumber(deckAnalysis, ["overall_score", "overallScore"])
  const financialSignals =
    deckAnalysis.financial_signals ?? deckAnalysis.financialSignals ?? null

  const keywords = extractDeckKeywords({ summary, strengths, categoryScores })

  return {
    overallScore: overallScore ?? null,
    summary,
    categoryScores,
    financialSignals:
      financialSignals && typeof financialSignals === "object"
        ? (financialSignals as Record<string, unknown>)
        : null,
    strengths,
    weaknesses,
    missingSections,
    priorityActions,
    fundraisingRisks,
    investorReadiness: investorReadiness ?? null,
    keywords,
  }
}

function normaliseCategoryScores(value: unknown): DeckSignals["categoryScores"] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const row = entry as SourceRecord
      const category = pickString(row, ["category"])
      const score = pickNumber(row, ["score"])
      if (!category || score === null) return null
      const feedback = pickString(row, ["feedback"]) ?? undefined
      return { category, score, ...(feedback ? { feedback } : {}) }
    })
    .filter((entry): entry is DeckSignals["categoryScores"][number] => Boolean(entry))
}

function normalisePriorityActions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim()
      if (!entry || typeof entry !== "object") return ""
      return pickString(entry as SourceRecord, ["action", "reason"]) ?? ""
    })
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6)
}

/**
 * Words that are capitalised in deck summaries but carry no sector signal,
 * so they pollute the Apify Leads Finder query if left in.
 */
const KEYWORD_STOPWORDS = new Set([
  // discourse markers
  "however", "while", "overall", "therefore", "moreover", "additionally",
  "furthermore", "specifically", "although", "despite", "indeed", "hence",
  "thus", "meanwhile", "nevertheless", "nonetheless", "given", "whilst",
  "regarding", "instead",
  // generic business nouns
  "problem", "solution", "market", "team", "financial", "financials",
  "business", "strategy", "company", "companies", "deck", "pitch",
  "investor", "investors", "investment", "investments", "founder", "founders",
  "platform", "platforms", "service", "services", "product", "products",
  "industry", "industries", "section", "sections", "model", "models",
  "approach", "approaches", "plan", "plans", "strategy", "strategies",
  "value", "values", "growth", "operations", "operating", "execution",
  "stage", "stages", "round", "rounds", "metrics", "milestone", "milestones",
  // generic adjectives that often capitalise after periods
  "strong", "clear", "limited", "small", "large", "early", "recent",
  "innovative", "disciplined", "specific", "detailed", "comprehensive",
  "conservative", "effective", "successful", "key", "core", "scalable",
  // pronouns / starters
  "the", "their", "they", "this", "that", "these", "those", "our", "your",
  "with", "from", "into", "such", "based",
])

const GENERIC_NOUN_SUFFIXES = ["ion", "ness", "ment", "ity", "ance", "ence"]

/**
 * Pull a small set of distinctive noun phrases from the deck's summary and
 * strengths, plus the top-scoring deck categories. These feed the Apify
 * Leads Finder query and the GPT ranker so two materially different decks
 * produce materially different inputs.
 */
function extractDeckKeywords({
  summary,
  strengths,
  categoryScores,
}: {
  summary: string
  strengths: string[]
  categoryScores: DeckSignals["categoryScores"]
}): string[] {
  const keywords: string[] = []
  const seen = new Set<string>()
  const text = [summary, ...strengths].join(" ")

  const push = (raw: string) => {
    const cleaned = raw.trim().replace(/[.,;:!?)("']/g, "")
    if (cleaned.length < 4 || cleaned.length > 40) return
    const lower = cleaned.toLowerCase()
    if (seen.has(lower)) return
    if (KEYWORD_STOPWORDS.has(lower)) return
    // Skip single common nouns ending in -ion, -ness etc. that aren't sector terms.
    if (!cleaned.includes(" ") && !cleaned.includes("-")) {
      if (lower.length < 5) return
      if (GENERIC_NOUN_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
        // Allow domain words like "Acquisition" but reject "Innovation" etc.
        if (KEYWORD_STOPWORDS.has(lower)) return
      }
    }
    seen.add(lower)
    keywords.push(cleaned)
  }

  // 1. Multi-word capitalised phrases (highest signal — usually domain terms).
  const multiWordRegex = /\b[A-Z][a-zA-Z0-9]+(?:[\s-][A-Z][a-zA-Z0-9]+){1,3}\b/g
  for (const phrase of text.match(multiWordRegex) ?? []) {
    push(phrase)
    if (keywords.length >= 4) break
  }

  // 2. Single capitalised words from strengths (often the domain noun).
  if (keywords.length < 5) {
    const singleRegex = /\b[A-Z][a-zA-Z]{5,}\b/g
    for (const phrase of strengths.join(" ").match(singleRegex) ?? []) {
      push(phrase)
      if (keywords.length >= 5) break
    }
  }

  // 3. Categories that scored >= 80 — what the deck actually does well.
  for (const cat of categoryScores) {
    if (cat.score >= 80) push(cat.category)
    if (keywords.length >= 6) break
  }

  return keywords.slice(0, 6)
}

function extractTractionFromSignals(signals: DeckSignals): FounderProfile["traction"] {
  const traction: FounderProfile["traction"] = {}
  const haystack = [signals.summary, ...signals.strengths, ...signals.weaknesses]
    .join(" ")
    .toLowerCase()

  const mrr = haystack.match(/\$?\s?([\d,.]+)\s?(k|m)?\s?(mrr|monthly recurring)/)
  if (mrr) traction.mrr = parseCompactNumber(mrr[1], mrr[2])

  const users = haystack.match(/([\d,.]+)\s?(k|m)?\s?(users|customers|signups|sign-ups)/)
  if (users) {
    const value = parseCompactNumber(users[1], users[2])
    if (/customer/.test(users[3])) traction.customers = value
    else traction.users = value
  }

  const growth = haystack.match(/([\d.]+)\s?%\s?(?:mom|month over month|monthly growth)/)
  if (growth) traction.growthRate = Number(growth[1])

  return traction
}

function parseCompactNumber(raw: string, unit: string | undefined) {
  const base = Number(raw.replace(/,/g, ""))
  if (!Number.isFinite(base)) return 0
  if (unit?.toLowerCase() === "k") return base * 1_000
  if (unit?.toLowerCase() === "m") return base * 1_000_000
  return base
}

function pickString(item: SourceRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function pickNumber(item: SourceRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
}
