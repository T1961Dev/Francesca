import "server-only"

import { STAGE_LABEL, type Stage } from "@/lib/onboarding"
import { createClient } from "@/lib/supabase/server"

export type WorkspaceMetric = {
  key: string
  label: string
  value: string
  numericValue: number | null
  source: "profile" | "deck" | "financial_model" | "calculated"
}

export type WorkspaceConflict = {
  key: string
  label: string
  values: { source: string; value: string }[]
  message: string
}

export type SelectedInvestor = {
  key: string
  investorName: string
  firmName: string
  investmentStage: string | null
  sectorFocus: string[]
  location: string | null
  matchScore: number | null
  matchRationale: string
  whyThisInvestor: string
  suggestedAngle: string
} | null

export type RaiseBriefWorkspacePack = {
  company: {
    name: string
    sector: string | null
    stage: string | null
    stageLabel: string | null
    geography: string | null
    targetRaise: number | null
    targetRaiseCurrency: string | null
    founderName: string | null
    description: string | null
  }
  deck: {
    id: string
    summary: string
    overallScore: number | null
    investorReadiness: string
    strengths: string[]
    weaknesses: string[]
    missingSections: string[]
    categoryScores: { category: string; score: number; feedback: string }[]
    financialSignals: Record<string, unknown> | null
  }
  financialModel: {
    id: string
    inputs: Record<string, unknown>
    projectionSummary: {
      month12Revenue: number | null
      month36Revenue: number | null
      month12Customers: number | null
      currentRunway: number | null
    }
    useOfFunds: { category: string; amount: number; rationale: string }[]
    investorSummary: string | null
    narrative: string | null
  } | null
  metrics: WorkspaceMetric[]
  knownNumbers: string[]
  conflicts: WorkspaceConflict[]
  investor: SelectedInvestor
  founderNotes: string | null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

function formatMoney(amount: number | null, currency?: string | null): string | null {
  if (amount == null) return null
  const code = (currency ?? "gbp").toUpperCase()
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${code} ${Math.round(amount).toLocaleString("en-GB")}`
  }
}

function stageLabel(stage: string | null): string | null {
  if (!stage) return null
  const key = stage as Stage
  return key in STAGE_LABEL ? STAGE_LABEL[key] : stage.replace(/_/g, " ")
}

function addMetric(
  metrics: WorkspaceMetric[],
  knownNumbers: string[],
  metric: WorkspaceMetric
) {
  metrics.push(metric)
  if (metric.value) knownNumbers.push(metric.value)
  if (metric.numericValue != null) {
    knownNumbers.push(String(metric.numericValue))
    knownNumbers.push(String(Math.round(metric.numericValue)))
  }
}

/** Pure helper — used by pack assembly and easy to unit-test. */
export function detectWorkspaceConflicts(pack: {
  profileRaise: number | null
  modelRaise: number | null
  deckRaise: number | null
  modelRevenue: number | null
  deckRevenue: number | null
  currency: string | null
}): WorkspaceConflict[] {
  const conflicts: WorkspaceConflict[] = []

  const raiseSources = [
    { source: "profile", value: pack.profileRaise },
    { source: "financial_model", value: pack.modelRaise },
    { source: "deck", value: pack.deckRaise },
  ].filter((row) => row.value != null && row.value > 0) as {
    source: string
    value: number
  }[]

  if (raiseSources.length >= 2) {
    const base = raiseSources[0].value
    const mismatched = raiseSources.filter(
      (row) => Math.abs(row.value - base) / Math.max(base, 1) > 0.15
    )
    if (mismatched.length) {
      conflicts.push({
        key: "raise_target",
        label: "Fundraising target",
        values: raiseSources.map((row) => ({
          source: row.source,
          value: formatMoney(row.value, pack.currency) ?? String(row.value),
        })),
        message:
          "Raise targets differ across profile, deck, and financial model by more than 15%. Confirm which figure to use.",
      })
    }
  }

  const revenueSources = [
    { source: "financial_model", value: pack.modelRevenue },
    { source: "deck", value: pack.deckRevenue },
  ].filter((row) => row.value != null) as { source: string; value: number }[]

  if (revenueSources.length === 2) {
    const [a, b] = revenueSources
    const max = Math.max(Math.abs(a.value), Math.abs(b.value), 1)
    if (Math.abs(a.value - b.value) / max > 0.2) {
      conflicts.push({
        key: "monthly_revenue",
        label: "Monthly revenue",
        values: revenueSources.map((row) => ({
          source: row.source,
          value: formatMoney(row.value, pack.currency) ?? String(row.value),
        })),
        message:
          "Monthly revenue differs between the deck signals and the financial model. Confirm the current figure.",
      })
    }
  }

  return conflicts
}

export async function buildRaiseBriefWorkspacePack(input: {
  userId: string
  deckAnalysisId?: string | null
  financialModelId?: string | null
  investorMatchJobId?: string | null
  investorKey?: string | null
  founderNotes?: string | null
}): Promise<RaiseBriefWorkspacePack> {
  const supabase = await createClient()

  const [{ data: profile }, deckList, { data: models }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "company_name, full_name, sector, industry, stage, funding_stage, geography, location, target_raise, target_raise_currency, description"
      )
      .eq("id", input.userId)
      .maybeSingle(),
    supabase.rpc("list_deck_analysis_rows", { p_limit: 10 }),
    supabase
      .from("financial_models")
      .select(
        "id, status, inputs, projection, use_of_funds, investor_summary, narrative, created_at"
      )
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const decks = Array.isArray(deckList.data) ? (deckList.data as Record<string, unknown>[]) : []
  const completedDecks = decks.filter((row) => String(row.status) === "completed")
  const selectedDeckMeta =
    (input.deckAnalysisId
      ? completedDecks.find((row) => String(row.id) === input.deckAnalysisId)
      : null) ??
    completedDecks[0] ??
    null

  if (!selectedDeckMeta?.id) {
    throw new Error("A completed pitch deck analysis is required to generate a Raise Brief.")
  }

  const { data: deckRow } = await supabase.rpc("fetch_deck_analysis_row", {
    p_analysis_id: String(selectedDeckMeta.id),
  })
  if (!deckRow || typeof deckRow !== "object") {
    throw new Error("Could not load the selected deck analysis.")
  }
  const deck = deckRow as Record<string, unknown>

  const completedModels = (models ?? []).filter((row) => String(row.status) === "completed")
  const modelRow =
    (input.financialModelId
      ? completedModels.find((row) => String(row.id) === input.financialModelId)
      : null) ??
    completedModels[0] ??
    null

  let investor: SelectedInvestor = null
  if (input.investorMatchJobId && input.investorKey) {
    const { data: matchRow } = await supabase
      .from("investor_matches")
      .select("matches, job_id")
      .eq("job_id", input.investorMatchJobId)
      .maybeSingle()

    const matches = Array.isArray(matchRow?.matches)
      ? (matchRow?.matches as Record<string, unknown>[])
      : []
    const found =
      matches.find((row, index) => {
        const key = String(row.id ?? row.email ?? `${row.investorName}-${index}`)
        return key === input.investorKey || String(index) === input.investorKey
      }) ?? null

    if (found) {
      investor = {
        key: input.investorKey,
        investorName: String(found.investorName ?? found.investor_name ?? "Investor"),
        firmName: String(found.firmName ?? found.firm_name ?? ""),
        investmentStage: found.investmentStage
          ? String(found.investmentStage)
          : found.investment_stage
            ? String(found.investment_stage)
            : null,
        sectorFocus: Array.isArray(found.sectorFocus)
          ? found.sectorFocus.map(String)
          : Array.isArray(found.sector_focus)
            ? found.sector_focus.map(String)
            : [],
        location: found.location ? String(found.location) : null,
        matchScore: asNumber(found.matchScore ?? found.match_score),
        matchRationale: String(found.matchRationale ?? found.match_rationale ?? ""),
        whyThisInvestor: String(found.whyThisInvestor ?? found.why_this_investor ?? ""),
        suggestedAngle: String(found.suggestedAngle ?? found.suggested_angle ?? ""),
      }
    }
  }

  const signals =
    deck.financial_signals && typeof deck.financial_signals === "object"
      ? (deck.financial_signals as Record<string, unknown>)
      : null
  const inputs =
    modelRow?.inputs && typeof modelRow.inputs === "object"
      ? (modelRow.inputs as Record<string, unknown>)
      : {}

  const currency = profile?.target_raise_currency
    ? String(profile.target_raise_currency)
    : "gbp"
  const profileRaise = asNumber(profile?.target_raise)
  const modelRaise = asNumber(inputs.raiseAmount)
  const deckRaise = asNumber(signals?.raiseAmount)
  const modelRevenue = asNumber(inputs.currentMonthlyRevenue)
  const deckRevenue = asNumber(signals?.monthlyRevenue)

  const metrics: WorkspaceMetric[] = []
  const knownNumbers: string[] = []

  const companyName = String(
    profile?.company_name ?? inputs.companyName ?? "Company"
  ).trim()
  const sector = String(profile?.sector ?? profile?.industry ?? inputs.industry ?? "").trim() || null
  const stage = String(profile?.stage ?? profile?.funding_stage ?? "").trim() || null
  const geography =
    String(profile?.geography ?? profile?.location ?? "").trim() || null

  if (profileRaise != null) {
    addMetric(metrics, knownNumbers, {
      key: "raise_target_profile",
      label: "Raise target (profile)",
      value: formatMoney(profileRaise, currency) ?? String(profileRaise),
      numericValue: profileRaise,
      source: "profile",
    })
  }
  if (modelRaise != null) {
    addMetric(metrics, knownNumbers, {
      key: "raise_target_model",
      label: "Raise target (model)",
      value: formatMoney(modelRaise, currency) ?? String(modelRaise),
      numericValue: modelRaise,
      source: "financial_model",
    })
  }
  if (modelRevenue != null) {
    addMetric(metrics, knownNumbers, {
      key: "monthly_revenue_model",
      label: "Monthly revenue (model)",
      value: formatMoney(modelRevenue, currency) ?? String(modelRevenue),
      numericValue: modelRevenue,
      source: "financial_model",
    })
  }
  if (deckRevenue != null) {
    addMetric(metrics, knownNumbers, {
      key: "monthly_revenue_deck",
      label: "Monthly revenue (deck)",
      value: formatMoney(deckRevenue, currency) ?? String(deckRevenue),
      numericValue: deckRevenue,
      source: "deck",
    })
  }

  const burn = asNumber(inputs.currentMonthlyBurn) ?? asNumber(signals?.monthlyBurn)
  if (burn != null) {
    addMetric(metrics, knownNumbers, {
      key: "monthly_burn",
      label: "Monthly burn",
      value: formatMoney(burn, currency) ?? String(burn),
      numericValue: burn,
      source: asNumber(inputs.currentMonthlyBurn) != null ? "financial_model" : "deck",
    })
  }

  const runway = asNumber(inputs.currentRunway) ?? asNumber(signals?.runwayMonths)
  if (runway != null) {
    addMetric(metrics, knownNumbers, {
      key: "runway_months",
      label: "Runway (months)",
      value: `${runway} months`,
      numericValue: runway,
      source: asNumber(inputs.currentRunway) != null ? "financial_model" : "deck",
    })
  }

  const customers = asNumber(inputs.currentCustomers) ?? asNumber(signals?.customerCount)
  if (customers != null) {
    addMetric(metrics, knownNumbers, {
      key: "customers",
      label: "Paying customers",
      value: String(customers),
      numericValue: customers,
      source: asNumber(inputs.currentCustomers) != null ? "financial_model" : "deck",
    })
  }

  const margin = asNumber(inputs.grossMargin) ?? asNumber(signals?.grossMarginPercent)
  if (margin != null) {
    addMetric(metrics, knownNumbers, {
      key: "gross_margin",
      label: "Gross margin",
      value: `${margin}%`,
      numericValue: margin,
      source: asNumber(inputs.grossMargin) != null ? "financial_model" : "deck",
    })
  }

  const projection = Array.isArray(modelRow?.projection)
    ? (modelRow!.projection as Record<string, unknown>[])
    : []
  const month12 = projection[11] ?? null
  const month36 = projection[35] ?? null
  const month12Revenue = asNumber(month12?.revenue)
  const month36Revenue = asNumber(month36?.revenue)
  if (month12Revenue != null) {
    addMetric(metrics, knownNumbers, {
      key: "projected_revenue_m12",
      label: "Projected revenue — month 12",
      value: formatMoney(month12Revenue, currency) ?? String(month12Revenue),
      numericValue: month12Revenue,
      source: "calculated",
    })
  }
  if (month36Revenue != null) {
    addMetric(metrics, knownNumbers, {
      key: "projected_revenue_m36",
      label: "Projected revenue — month 36",
      value: formatMoney(month36Revenue, currency) ?? String(month36Revenue),
      numericValue: month36Revenue,
      source: "calculated",
    })
  }

  const categoryScores = Array.isArray(deck.category_scores)
    ? (deck.category_scores as { category?: string; score?: number; feedback?: string }[]).map(
        (row) => ({
          category: String(row.category ?? ""),
          score: Number(row.score ?? 0),
          feedback: String(row.feedback ?? ""),
        })
      )
    : []

  const useOfFunds = Array.isArray(modelRow?.use_of_funds)
    ? (modelRow!.use_of_funds as { category?: string; amount?: number; rationale?: string }[]).map(
        (row) => ({
          category: String(row.category ?? ""),
          amount: Number(row.amount ?? 0),
          rationale: String(row.rationale ?? ""),
        })
      )
    : []

  const conflicts = detectWorkspaceConflicts({
    profileRaise,
    modelRaise,
    deckRaise,
    modelRevenue,
    deckRevenue,
    currency,
  })

  return {
    company: {
      name: companyName,
      sector,
      stage,
      stageLabel: stageLabel(stage),
      geography,
      targetRaise: profileRaise ?? modelRaise ?? deckRaise,
      targetRaiseCurrency: currency,
      founderName: profile?.full_name ? String(profile.full_name) : null,
      description: profile?.description ? String(profile.description) : null,
    },
    deck: {
      id: String(selectedDeckMeta.id),
      summary: String(deck.summary ?? ""),
      overallScore: asNumber(deck.overall_score),
      investorReadiness: String(deck.investor_readiness ?? ""),
      strengths: Array.isArray(deck.strengths) ? deck.strengths.map(String) : [],
      weaknesses: Array.isArray(deck.weaknesses) ? deck.weaknesses.map(String) : [],
      missingSections: Array.isArray(deck.missing_sections)
        ? deck.missing_sections.map(String)
        : [],
      categoryScores,
      financialSignals: signals,
    },
    financialModel: modelRow
      ? {
          id: String(modelRow.id),
          inputs,
          projectionSummary: {
            month12Revenue,
            month36Revenue,
            month12Customers: asNumber(month12?.customers),
            currentRunway: runway,
          },
          useOfFunds,
          investorSummary: modelRow.investor_summary
            ? String(modelRow.investor_summary)
            : null,
          narrative: modelRow.narrative ? String(modelRow.narrative) : null,
        }
      : null,
    metrics,
    knownNumbers: Array.from(new Set(knownNumbers.filter(Boolean))),
    conflicts,
    investor,
    founderNotes: input.founderNotes?.trim() || null,
  }
}

/** Compact JSON for LLM prompts — avoids dumping huge projections. */
export function serializeWorkspacePackForPrompt(pack: RaiseBriefWorkspacePack): string {
  return JSON.stringify(
    {
      company: pack.company,
      deck: {
        id: pack.deck.id,
        summary: pack.deck.summary,
        overallScore: pack.deck.overallScore,
        investorReadiness: pack.deck.investorReadiness,
        strengths: pack.deck.strengths,
        weaknesses: pack.deck.weaknesses,
        missingSections: pack.deck.missingSections,
        categoryScores: pack.deck.categoryScores,
        financialSignals: pack.deck.financialSignals,
      },
      financialModel: pack.financialModel
        ? {
            id: pack.financialModel.id,
            inputs: pack.financialModel.inputs,
            projectionSummary: pack.financialModel.projectionSummary,
            useOfFunds: pack.financialModel.useOfFunds,
            investorSummary: pack.financialModel.investorSummary,
            narrative: pack.financialModel.narrative,
          }
        : null,
      metrics: pack.metrics,
      knownNumbers: pack.knownNumbers,
      conflicts: pack.conflicts,
      investor: pack.investor,
      founderNotes: pack.founderNotes,
    },
    null,
    2
  )
}
