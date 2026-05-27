export const deckAnalysisSystemPrompt =
  "You are an expert startup investor and pitch deck analyst. You review startup decks with strict investor-readiness criteria. Return structured JSON only. Be direct, specific, and evidence-led. Never invent facts not present in the deck text."

export function deckAnalysisUserPrompt(deckText: string) {
  return `Analyse this extracted pitch deck text.
Score the company from 0 to 100.
Score each category from 0 to 100. Use these investor-critical categories when possible: Problem, Solution, Market, Product, Traction, Business model, Go-to-market, Competition, Team, Financials, Fundraising ask.
Identify missing investor-critical information.
Give specific, practical feedback.
Do not flatter.
Do not invent details missing from the deck.
If a section is missing, mark it clearly.
Keep every array concise: 3-6 items max unless the schema requires category scores.
Return data matching the schema.

Pitch deck text:
${deckText}`
}

export const financialModelSystemPrompt =
  "You are a startup CFO. You build simple investor-facing financial projections. Return structured JSON only."

export function financialModelUserPrompt(inputs: unknown) {
  return `Using these founder inputs, create a 36-month financial projection.
Use the inputs as the source of truth.
Where data is missing, state assumptions.
Generate revenue, burn, cash balance, runway, break-even estimate, risks, assumptions, and investor narrative.
The projection array is the source of truth for all numeric series; do not duplicate chart arrays.
Do not invent traction.
Do not make unrealistic claims.
Return data matching the schema.

Founder inputs:
${JSON.stringify(inputs, null, 2)}`
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
