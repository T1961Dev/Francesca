import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/financial/format"

type Kpi = {
  label: string
  value: string
  hint?: string
}

export function FinancialOverviewPanel({ items }: { items: Kpi[] }) {
  const [hero, ...supporting] = items

  return (
    <div className="grid h-full min-h-0 items-start gap-4 lg:grid-cols-[0.4fr_0.6fr]">
      <Card className="h-auto self-start bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle>{hero?.label ?? "Headline metric"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center">
          <div className="rounded-xl bg-card p-5 ring-1 ring-border/55">
            <p className="bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text font-heading text-5xl leading-none text-transparent md:text-6xl">
              {hero?.value ?? "—"}
            </p>
            {hero?.hint ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{hero.hint}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 auto-rows-min grid-cols-1 gap-3 sm:grid-cols-2">
        {supporting.map((item) => (
          <Card key={item.label} className="h-auto self-start bg-muted/20">
            <CardContent className="py-4">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text font-heading text-3xl leading-none text-transparent">
                {item.value}
              </p>
              {item.hint ? (
                <p className="mt-2 line-clamp-2 text-xs leading-snug text-muted-foreground">
                  {item.hint}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function FinancialKpiCards({
  items,
  compact = false,
}: {
  items: Kpi[]
  compact?: boolean
}) {
  if (compact) {
    return <FinancialOverviewPanel items={items} />
  }

  return (
    <div className="grid auto-rows-min items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="h-auto self-start bg-muted/20">
          <CardContent className="pt-5">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1.5 bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text font-heading text-3xl leading-none text-transparent">
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                {item.hint}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function buildFinancialKpis({
  projection,
  inputs,
  breakEvenMonth,
}: {
  projection: { month: number; revenue: number; cashBalance: number; runwayMonths: number }[]
  inputs: Record<string, unknown>
  breakEvenMonth: number | null
}) {
  const final = projection[projection.length - 1]
  const raiseAmount = Number(inputs.raiseAmount ?? 0)
  const currentRunway = Number(inputs.currentRunway ?? 0)

  return [
    {
      label: "Month 36 revenue",
      value: final ? formatCurrency(final.revenue) : "—",
      hint: final ? "Projected monthly revenue at end of plan" : undefined,
    },
    {
      label: "Cash at month 36",
      value: final ? formatCurrency(final.cashBalance) : "—",
      hint: final ? `${Math.round(final.runwayMonths * 10) / 10} months runway remaining` : undefined,
    },
    {
      label: "Break-even",
      value: breakEvenMonth ? `Month ${breakEvenMonth}` : "Not in plan",
      hint: breakEvenMonth ? "First month revenue covers burn" : "Revenue stays below burn across 36 months",
    },
    {
      label: "Raise target",
      value: raiseAmount ? formatCurrency(raiseAmount) : "—",
      hint: currentRunway ? `Current runway: ${currentRunway} months` : undefined,
    },
  ]
}
