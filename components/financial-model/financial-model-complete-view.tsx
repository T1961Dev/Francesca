import Link from "next/link"

import { FeatureEm, FeaturePhotoCard } from "@/components/feature-photo-card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/financial/format"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"

export function FinancialModelCompleteView({
  modelId,
  confidence,
  runwayMonths,
  recommendedRaise,
  projectedArr,
  seriesTiming,
}: {
  modelId: string
  confidence: number
  runwayMonths: number | null
  recommendedRaise: number
  projectedArr: number
  seriesTiming: string
}) {
  return (
    <main className={dashboardPageMainClass}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <FeaturePhotoCard
          eyebrow="Financial Model Complete"
          title={
            <>
              Your model is investor-ready. Next: find investors who fit your{" "}
              <FeatureEm>stage.</FeatureEm>
            </>
          }
          description="Explore the forecast, then move into Investor Matching with a clearer raise story."
          className="min-h-0"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Overall Confidence" value={`${Math.round(confidence)}%`} />
          <StatCard
            label="Estimated Runway"
            value={runwayMonths != null ? `${Math.round(runwayMonths)} months` : "—"}
          />
          <StatCard
            label="Recommended Raise"
            value={recommendedRaise > 0 ? formatCurrency(recommendedRaise) : "—"}
          />
          <StatCard
            label="Projected ARR"
            value={projectedArr > 0 ? formatCurrency(projectedArr) : "—"}
          />
          <StatCard label="Potential Series A" value={seriesTiming} className="sm:col-span-2" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/dashboard/financial-model/${modelId}?view=full`}>
              Explore your financial model
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/investor-matching">Find matching investors</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border/70 bg-card p-4 ${className ?? ""}`}>
      <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text font-heading text-3xl leading-none text-transparent">
        {value}
      </p>
    </div>
  )
}

export function buildFinancialModelCompletionSummary({
  projection,
  inputs,
}: {
  projection: {
    month: number
    revenue: number
    burn: number
    cashBalance: number
    runwayMonths: number
  }[]
  inputs: Record<string, unknown>
}) {
  const first = projection[0]
  const final = projection[projection.length - 1]
  const raiseAmount = Number(inputs.raiseAmount ?? 0)
  const revenueGrowth = Number(inputs.monthlyRevenueGrowth ?? 0)
  const churn = Number(inputs.churn ?? 0)
  const grossMargin = Number(inputs.grossMargin ?? 0)

  let confidence = 72
  if (raiseAmount > 0) confidence += 4
  if (grossMargin >= 50 && grossMargin <= 90) confidence += 4
  if (revenueGrowth >= 5 && revenueGrowth <= 15) confidence += 6
  else if (revenueGrowth > 20) confidence -= 8
  if (churn > 0 && churn <= 5) confidence += 4
  else if (churn === 0 && revenueGrowth >= 10) confidence -= 6
  if (first?.runwayMonths > 0) confidence += 3
  confidence = Math.max(55, Math.min(94, confidence))

  const projectedMonthly = final?.revenue ?? 0
  const projectedArr = projectedMonthly * 12

  const runwayMonths =
    first?.runwayMonths != null && Number.isFinite(first.runwayMonths)
      ? first.runwayMonths
      : Number(inputs.currentRunway ?? 0) || null

  const now = new Date()
  const monthsToSeries = projectedArr >= 2_000_000 ? 18 : projectedArr >= 800_000 ? 24 : 30
  const seriesDate = new Date(now)
  seriesDate.setMonth(seriesDate.getMonth() + monthsToSeries)
  const seriesTiming = seriesDate.toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
  })

  const recommendedRaise =
    raiseAmount > 0
      ? raiseAmount
      : Math.max(250_000, Math.round((projectedArr || 500_000) * 0.35))

  return {
    confidence,
    runwayMonths,
    recommendedRaise,
    projectedArr,
    seriesTiming,
  }
}
