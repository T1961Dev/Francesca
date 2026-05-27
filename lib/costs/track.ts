import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export type RunType = "deck_analysis" | "financial_model" | "investor_match"
export type CostProvider = "apify" | "openai"

/** Conservative per-token costs (USD). Adjust as the actual contracts move. */
export const OPENAI_RATES: Record<string, { input: number; output: number }> = {
  // Per 1K tokens; numbers based on public pricing as of 2026-05.
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4.1": { input: 0.003, output: 0.012 },
  "gpt-4.1-mini": { input: 0.00015, output: 0.0006 },
}

/** Per-run estimated cost for each Apify actor (USD). Update as contracts change. */
export const APIFY_RATES: Record<string, number> = {
  "davidsharadbhatt/crunchbase-company-scraper---no-api-limits": 0.6,
  "code_crafter/leads-finder": 0.0015,
  "harvestapi/linkedin-profile-posts": 0.002,
  "harvestapi/linkedin-profile-scraper": 0.004,
  "fatihtahta/email-verifier-validator-pro": 0.00089,
}

export async function logOpenAiCost({
  userId,
  runId,
  runType,
  model,
  usage,
}: {
  userId: string | null
  runId?: string | null
  runType: RunType
  model: string
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null | undefined
}) {
  const rates = OPENAI_RATES[model] ?? OPENAI_RATES["gpt-4o-mini"]
  const promptTokens = usage?.prompt_tokens ?? 0
  const completionTokens = usage?.completion_tokens ?? 0
  const cost =
    (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output

  await insertCost({
    userId,
    runId: runId ?? null,
    runType,
    provider: "openai",
    actorOrModel: model,
    costUsd: cost,
    metadata: usage ? { prompt_tokens: promptTokens, completion_tokens: completionTokens } : null,
  })
  return cost
}

export async function logApifyCost({
  userId,
  runId,
  runType,
  actorId,
  units = 1,
}: {
  userId: string | null
  runId?: string | null
  runType: RunType
  actorId: string
  units?: number
}) {
  const rate = APIFY_RATES[actorId] ?? 0.3
  const cost = rate * units
  await insertCost({
    userId,
    runId: runId ?? null,
    runType,
    provider: "apify",
    actorOrModel: actorId,
    costUsd: cost,
    metadata: { units },
  })
  return cost
}

async function insertCost({
  userId,
  runId,
  runType,
  provider,
  actorOrModel,
  costUsd,
  metadata,
}: {
  userId: string | null
  runId: string | null
  runType: RunType
  provider: CostProvider
  actorOrModel: string
  costUsd: number
  metadata: Record<string, unknown> | null
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from("api_costs").insert({
      user_id: userId,
      run_id: runId,
      run_type: runType,
      provider,
      actor_or_model: actorOrModel,
      cost_usd: costUsd,
      metadata,
    })
  } catch (error) {
    console.warn("[costs] failed to log cost", error instanceof Error ? error.message : error)
  }
}

/** Sum api_costs for a run_id and persist into investor_matching_jobs.total_cost_usd. */
export async function rollupInvestorJobCost(jobId: string) {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("api_costs")
      .select("cost_usd")
      .eq("run_id", jobId)

    const total = (data ?? []).reduce(
      (acc, row) => acc + Number(row.cost_usd ?? 0),
      0
    )
    await supabase
      .from("investor_matching_jobs")
      .update({ total_cost_usd: total })
      .eq("id", jobId)
  } catch (error) {
    console.warn("[costs] rollupInvestorJobCost failed", error instanceof Error ? error.message : error)
  }
}
