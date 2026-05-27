const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
})

const compact = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number) {
  return currency.format(value)
}

export function formatCompact(value: number) {
  return compact.format(value)
}

export function formatChartTitle(key: string) {
  const titles: Record<string, string> = {
    revenue: "Revenue",
    burn: "Burn",
    cashBalance: "Cash balance",
    runway: "Runway",
  }
  return titles[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
}

export function formatMonthLabel(label: string, month?: number) {
  if (label && !/^month\s/i.test(label)) return label
  return month ? `M${month}` : label
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export type UseOfFundsItem = {
  category: string
  amount: number
  rationale: string
}

export function parseUseOfFunds(value: unknown): UseOfFundsItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const category = String(record.category ?? record.name ?? "Category")
      const amount = Number(record.amount ?? 0)
      const rationale = String(record.rationale ?? record.description ?? "")
      if (!category && !amount) return null
      return { category, amount, rationale }
    })
    .filter((item): item is UseOfFundsItem => Boolean(item))
}

export type ProjectionMonth = {
  month: number
  label: string
  revenue: number
  burn: number
  cashBalance: number
  runwayMonths: number
  customers?: number | null
}

export function parseProjection(value: unknown): ProjectionMonth[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ProjectionMonth =>
    Boolean(item && typeof item === "object" && typeof (item as ProjectionMonth).month === "number")
  )
}

export function findBreakEvenMonth(projection: ProjectionMonth[]) {
  const month = projection.find((point) => point.revenue >= point.burn)
  return month?.month ?? null
}

export function downsampleChartLabels<T extends { label: string }>(data: T[], step = 6) {
  return data.map((point, index) => ({
    ...point,
    label: index % step === 0 || index === data.length - 1 ? point.label : "",
  }))
}
