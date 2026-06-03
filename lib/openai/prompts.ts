export const deckAnalysisSystemPrompt =
  "You are an expert startup investor and pitch deck analyst. You review startup decks with strict investor-readiness criteria. Return structured JSON only. Be direct, specific, and evidence-led. Never invent facts not present in the deck text."

export function deckAnalysisUserPrompt(deckText: string) {
  return `Analyse this extracted pitch deck text.

Score each of these eight investor-critical dimensions from 0 to 100 (use these exact category names):
- Problem clarity
- Solution strength
- Market size
- Business model
- Traction
- Team
- Financial ask
- Narrative

Do NOT return an overall score — we compute that from weighted dimensions in code.

Extract financialSignals from the deck only. Use null for any number not clearly stated in the deck text. Never invent revenue, burn, runway, or raise figures.

Identify missing investor-critical information.
Give specific, practical feedback per category.
Do not flatter.
Do not invent details missing from the deck.
If a section is missing, mark it clearly in feedback and missingSections.
Keep every array concise: 3-6 items max unless the schema requires category scores.
Return data matching the schema.

Pitch deck text:
${deckText}`
}

export const financialModelSystemPrompt =
  "You are a startup CFO. You build simple investor-facing financial projections. Return structured JSON only."

export function financialModelUserPrompt(
  inputs: unknown,
  context?: { deckFinancialSignals?: unknown; deckSummary?: string | null }
) {
  const contextBlock =
    context?.deckFinancialSignals || context?.deckSummary
      ? `

Deck analysis context (use as hints only; founder form inputs override when provided):
${JSON.stringify(
  {
    deckSummary: context.deckSummary ?? null,
    financialSignalsFromDeck: context.deckFinancialSignals ?? null,
  },
  null,
  2
)}`
      : ""

  return `Using these founder inputs, create a 36-month financial projection.
Use the inputs as the source of truth.
Where data is missing, state assumptions clearly in the assumptions array.
If deck financial signals are provided, reconcile them with founder inputs and note discrepancies in assumptions.
Generate revenue, burn, cash balance, runway, break-even estimate, risks, assumptions, and investor narrative.
The projection array is the source of truth for all numeric series; do not duplicate chart arrays.
Do not invent traction.
Do not make unrealistic claims.
Return data matching the schema.

Founder inputs:
${JSON.stringify(inputs, null, 2)}${contextBlock}`
}

export const investorScoringSystemPrompt =
  "You are an expert venture analyst. You score investor fit based on company profile, fundraising stage, sector, geography, deck quality, and scraped investor data. Return structured JSON only."

export function investorScoringUserPrompt(input: unknown) {
  return `Given this company profile, deck analysis, Apify investor candidate list, and LinkedIn activity signals, rank the best 25 investors.
Score each investor from 0 to 100.
Give match rationale.
Explain why this investor fits.
Explain the best outreach angle using recent activity signals when available.
Write a concise personalised outreach email for each match. Personalise from real company, sector, stage, investor metadata, and recent posts only.
Do not invent unavailable contact details.
Do not invent firm details.
Do not claim the investor recently posted, invested, or raised unless the input contains that signal.
If email is unavailable, return null.
If LinkedIn URL is unavailable, return null.
Return data matching the schema.

Input:
${JSON.stringify(input, null, 2)}`
}
