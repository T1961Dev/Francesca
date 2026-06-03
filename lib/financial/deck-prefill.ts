import type { DeckFinancialSignals } from "@/lib/openai/schemas"

/** Map deck-extracted financial signals into financial model wizard fields. */
export function buildFinancialPrefillFromDeckSignals(
  signals: DeckFinancialSignals | null | undefined,
  profilePrefill: Record<string, string> = {}
): Record<string, string> {
  const merged = { ...profilePrefill }
  if (!signals) return merged

  const set = (key: string, value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value) || value < 0) return
    merged[key] = String(value)
  }

  set("currentMonthlyRevenue", signals.monthlyRevenue)
  set("currentMonthlyBurn", signals.monthlyBurn)
  set("currentCashBalance", signals.cashBalance)
  set("currentRunway", signals.runwayMonths)
  set("raiseAmount", signals.raiseAmount)
  set("currentCustomers", signals.customerCount)
  set("teamSize", signals.teamSize)
  set("grossMargin", signals.grossMarginPercent)
  set("monthlyRevenueGrowth", signals.revenueGrowthPercentMonthly)

  if (signals.notes?.trim()) {
    const existing = merged.notes?.trim()
    merged.notes = existing
      ? `${existing}\n\nFrom deck: ${signals.notes.trim()}`
      : `From deck: ${signals.notes.trim()}`
  }

  return merged
}
