import { STAGE_LABEL, type Stage } from "@/lib/onboarding"

export type TeaserContent = {
  companyName: string
  metaLine: string
  raiseLabel: string
  overview: string
  problem: string
  solution: string
  whyNow: string
  highlights: string[]
}

type CategoryRow = { label: string; score: number; feedback: string }

export function buildTeaserContent(input: {
  companyName: string
  sector?: string | null
  stage?: string | null
  geography?: string | null
  targetRaise?: number | null
  targetRaiseCurrency?: string | null
  summary: string
  investorReadiness: string
  strengths: string[]
  categoryScores: unknown[]
}): TeaserContent {
  const companyName = input.companyName.trim() || "Company"
  const categories = normaliseCategories(input.categoryScores)
  const metaLine = buildMetaLine(input.sector, input.stage, input.geography)
  const raiseLabel = formatRaise(input.targetRaise, input.targetRaiseCurrency)

  const problem =
    pickCategoryCopy(categories, ["problem", "market"]) ||
    firstUsefulSentence(input.strengths, /problem|market|pain|need/i) ||
    "A clear market pain that creates room for a focused, capital-efficient operator."

  const solution =
    pickCategoryCopy(categories, ["solution", "product", "business model"]) ||
    firstUsefulSentence(input.strengths, /solution|product|platform|model|approach/i) ||
    rewriteCompanySentence(stripDeckLanguage(input.summary), companyName)

  const whyNow =
    sanitiseBullet(input.investorReadiness) ||
    pickCategoryCopy(categories, ["traction", "team", "go-to-market", "gtm"]) ||
    "Timing, market structure, and execution focus make this the right moment to engage."

  const overview = buildOverview(companyName, input.summary, input.investorReadiness, solution)

  const highlights = sanitiseHighlights(input.strengths, categories).slice(0, 3)

  return {
    companyName,
    metaLine,
    raiseLabel,
    overview,
    problem: clampSentences(problem, 2),
    solution: clampSentences(solution, 2),
    whyNow: clampSentences(whyNow, 2),
    highlights,
  }
}

function buildMetaLine(
  sector?: string | null,
  stage?: string | null,
  geography?: string | null
) {
  const stageKey = stage?.trim() as Stage | undefined
  const stageLabel =
    stageKey && stageKey in STAGE_LABEL ? STAGE_LABEL[stageKey] : formatLabel(stage)

  return [formatLabel(sector), stageLabel, formatLabel(geography)].filter(Boolean).join(" · ")
}

function buildOverview(
  companyName: string,
  summary: string,
  investorReadiness: string,
  solution: string
) {
  let text = stripDeckLanguage(summary)
  text = text.replace(/^this\s+(company|startup)\s+/i, "")
  text = removeNegativeTail(text)

  if (!text || text.length < 40) {
    text = solution
  }

  if (text.toLowerCase().startsWith("is building") || text.toLowerCase().startsWith("are building")) {
    text = `${companyName} ${text}`
  } else if (!new RegExp(`^${escapeRegExp(companyName)}`, "i").test(text)) {
    text = `${companyName} ${text.charAt(0).toLowerCase()}${text.slice(1)}`
  }

  const readiness = sanitiseBullet(investorReadiness)
  if (readiness && readiness.length > 30 && !/deck/i.test(readiness)) {
    text = `${clampSentences(text, 3)} ${readiness}`
  }

  return clampSentences(text, 4)
}

function sanitiseHighlights(strengths: string[], categories: CategoryRow[]) {
  const fromStrengths = strengths
    .map(sanitiseBullet)
    .filter(Boolean)
    .map((item) => item.replace(/^clear articulation of the /i, "Clear "))

  if (fromStrengths.length >= 2) return fromStrengths

  return categories
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => clampSentences(sanitiseBullet(row.feedback) || row.label, 1))
    .filter(Boolean)
}

function pickCategoryCopy(categories: CategoryRow[], keys: string[]) {
  const match = categories.find((row) =>
    keys.some((key) => row.label.toLowerCase().includes(key))
  )
  if (!match) return ""
  return sanitiseBullet(match.feedback) || ""
}

function firstUsefulSentence(items: string[], pattern: RegExp) {
  const hit = items.map(sanitiseBullet).find((item) => item && pattern.test(item))
  return hit ? clampSentences(hit, 1) : ""
}

function stripDeckLanguage(text: string) {
  return text
    .replace(/\bthis pitch deck\b/gi, "This company")
    .replace(/\bthe pitch deck\b/gi, "the company")
    .replace(/\bthis deck\b/gi, "this company")
    .replace(/\bthe deck\b/gi, "the company")
    .replace(/\bdeck analysis\b/gi, "company")
    .replace(/\bdeck is\b/gi, "company is")
    .replace(/\bdeck\b/gi, "company")
    .replace(/\s+/g, " ")
    .trim()
}

function removeNegativeTail(text: string) {
  const splitters = [
    / however[,. ]/i,
    / but it lacks/i,
    / but lacks/i,
    / however, it/i,
    / missing sections/i,
  ]

  let result = text
  for (const pattern of splitters) {
    const index = result.search(pattern)
    if (index > 40) {
      result = result.slice(0, index).trim()
    }
  }

  return result.replace(/[.,;:\s]+$/, "").trim()
}

function sanitiseBullet(text: string) {
  const cleaned = stripDeckLanguage(text)
    .replace(/^the company is (moderately |somewhat )?investor-ready[^.]*\.?\s*/i, "")
    .replace(/needs critical improvements[^.]*\.?\s*/i, "")
    .replace(/before investor outreach[^.]*\.?\s*/i, "")
    .trim()

  if (!cleaned || /investor-ready/i.test(cleaned)) return ""
  return cleaned
}

function clampSentences(text: string, maxSentences: number) {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.slice(0, maxSentences).join(" ")
}

function formatLabel(value?: string | null) {
  const raw = value?.trim()
  if (!raw) return ""

  if (raw in STAGE_LABEL) return STAGE_LABEL[raw as Stage]

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase()
      if (lower === "saas") return "SaaS"
      if (lower === "ai") return "AI"
      if (lower === "uk") return "UK"
      if (lower === "usa") return "USA"
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
    })
    .join(" ")
    .replace("Pre Seed", "Pre-seed")
}

function formatRaise(amount?: number | null, currency?: string | null) {
  if (!amount) return "Open"
  const code = (currency ?? "gbp").toLowerCase()
  const symbol = code === "gbp" ? "£" : code === "eur" ? "€" : code === "usd" ? "$" : `${code.toUpperCase()} `
  return `${symbol}${Number(amount).toLocaleString()}`
}

function rewriteCompanySentence(text: string, companyName: string) {
  if (!text) return `${companyName} is building a focused solution in its target market.`
  if (/^(is|are)\s/i.test(text)) return `${companyName} ${text}`
  return text
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normaliseCategories(items: unknown[]): CategoryRow[] {
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const label = String(row.category ?? row.name ?? "").trim()
      if (!label) return null
      const score = Number(row.score ?? 0)
      const feedback = String(row.feedback ?? "").trim()
      return {
        label,
        score: Math.max(0, Math.min(100, Number.isFinite(score) ? Math.round(score) : 0)),
        feedback,
      }
    })
    .filter((row): row is CategoryRow => Boolean(row))
}
