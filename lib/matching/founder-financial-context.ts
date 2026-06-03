import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type FounderFinancialContext = {
  companyName: string | null
  investorSummary: string | null
  narrative: string | null
  breakEvenMonth: number | null
  risks: string[]
  assumptions: string[]
  latestProjectionSnippet: Array<{
    month: number
    revenue: number
    burn: number
    cashBalance: number
  }>
}

/** Latest saved financial model for CFO loop (ranking + outreach). */
export async function fetchFounderFinancialContext(
  supabase: SupabaseClient,
  userId: string
): Promise<FounderFinancialContext | null> {
  const { data: model } = await supabase
    .from("financial_models")
    .select("inputs, investor_summary, narrative, projection, risks, assumptions")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!model) return null

  const inputs = (model.inputs as Record<string, unknown>) ?? {}
  const projection = Array.isArray(model.projection)
    ? (model.projection as Array<Record<string, unknown>>)
    : []

  const latestProjectionSnippet = projection.slice(0, 6).map((row, index) => ({
    month: Number(row.month ?? index + 1),
    revenue: Number(row.revenue ?? 0),
    burn: Number(row.burn ?? 0),
    cashBalance: Number(row.cashBalance ?? 0),
  }))

  return {
    companyName: typeof inputs.companyName === "string" ? inputs.companyName : null,
    investorSummary:
      typeof model.investor_summary === "string" ? model.investor_summary : null,
    narrative: typeof model.narrative === "string" ? model.narrative : null,
    breakEvenMonth: findBreakEven(projection),
    risks: stringArray(model.risks),
    assumptions: stringArray(model.assumptions),
    latestProjectionSnippet,
  }
}

function findBreakEven(projection: Array<Record<string, unknown>>) {
  for (const row of projection) {
    const revenue = Number(row.revenue ?? 0)
    const burn = Number(row.burn ?? 0)
    if (revenue > 0 && revenue >= burn) {
      return Number(row.month ?? null)
    }
  }
  return null
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 6) : []
}
