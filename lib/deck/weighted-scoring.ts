/**
 * Investor-readiness dimensions and weights (RaiseWise product spec).
 * Overall score is always computed in code — never taken directly from the model.
 */

export const DECK_SCORE_DIMENSIONS = [
  { key: "problem", label: "Problem clarity", weight: 0.1 },
  { key: "solution", label: "Solution strength", weight: 0.1 },
  { key: "market", label: "Market size", weight: 0.15 },
  { key: "business_model", label: "Business model", weight: 0.1 },
  { key: "traction", label: "Traction", weight: 0.2 },
  { key: "team", label: "Team", weight: 0.2 },
  { key: "financials", label: "Financial ask", weight: 0.1 },
  { key: "narrative", label: "Narrative", weight: 0.05 },
] as const

const ALIASES: Record<string, string> = {
  problem: "problem",
  "problem clarity": "problem",
  solution: "solution",
  "solution strength": "solution",
  product: "solution",
  market: "market",
  "market size": "market",
  "business model": "business_model",
  "business-model": "business_model",
  traction: "traction",
  team: "team",
  financials: "financials",
  "financial ask": "financials",
  fundraising: "financials",
  "fundraising ask": "financials",
  narrative: "narrative",
  competition: "narrative",
  "go-to-market": "market",
  gtm: "market",
}

function normaliseCategoryKey(category: string): string | null {
  const lower = category.trim().toLowerCase()
  if (ALIASES[lower]) return ALIASES[lower]
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (lower.includes(alias)) return key
  }
  return null
}

export function computeWeightedOverallScore(
  categoryScores: Array<{ category: string; score: number }>
): number {
  if (!categoryScores.length) return 0

  const byKey = new Map<string, number[]>()
  for (const row of categoryScores) {
    const key = normaliseCategoryKey(row.category)
    if (!key) continue
    const list = byKey.get(key) ?? []
    list.push(Math.max(0, Math.min(100, row.score)))
    byKey.set(key, list)
  }

  let total = 0
  let weightUsed = 0
  for (const dim of DECK_SCORE_DIMENSIONS) {
    const scores = byKey.get(dim.key)
    if (!scores?.length) continue
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    total += avg * dim.weight
    weightUsed += dim.weight
  }

  if (weightUsed === 0) {
    const fallback =
      categoryScores.reduce((sum, row) => sum + row.score, 0) / categoryScores.length
    return Math.round(Math.max(0, Math.min(100, fallback)))
  }

  const normalised = total / weightUsed
  return Math.round(Math.max(0, Math.min(100, normalised)))
}

export function enrichCategoryScoresWithWeights(
  categoryScores: Array<{ category: string; score: number; feedback: string }>
) {
  return categoryScores.map((row) => {
    const key = normaliseCategoryKey(row.category)
    const dim = DECK_SCORE_DIMENSIONS.find((d) => d.key === key)
    return {
      ...row,
      weight: dim ? Math.round(dim.weight * 100) : null,
      dimensionKey: key,
    }
  })
}
