import { notFound } from "next/navigation"

import { FinancialModelSlideshow } from "@/components/financial-model/financial-model-slideshow"
import {
  FinancialModelCompleteView,
  buildFinancialModelCompletionSummary,
} from "@/components/financial-model/financial-model-complete-view"
import { buildFinancialKpis } from "@/components/financial-model/financial-kpi-cards"
import {
  findBreakEvenMonth,
  formatMonthLabel,
  parseProjection,
} from "@/lib/financial/format"
import { canUseFinancialModel, getUserPlan } from "@/lib/access"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

function buildChartsFromProjection(projection: ReturnType<typeof parseProjection>) {
  const labelAt = (index: number, month: (typeof projection)[number]) =>
    index % 6 === 0 || index === projection.length - 1
      ? formatMonthLabel(month.label, month.month)
      : ""

  return {
    revenue: projection.map((month, index) => ({
      label: labelAt(index, month),
      value: Math.round(month.revenue),
    })),
    burn: projection.map((month, index) => ({
      label: labelAt(index, month),
      value: Math.round(month.burn),
    })),
    cashBalance: projection.map((month, index) => ({
      label: labelAt(index, month),
      value: Math.round(month.cashBalance),
    })),
    runway: projection.map((month, index) => ({
      label: labelAt(index, month),
      value: Math.round(month.runwayMonths * 10) / 10,
    })),
  }
}

export default async function FinancialModelResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { id } = await params
  const { view } = await searchParams
  const plan = await getUserPlan()
  if (!canUseFinancialModel(plan)) {
    redirect("/pricing")
  }

  const supabase = await createClient()
  const { data: model } = await supabase
    .from("financial_models")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!model) notFound()

  const inputs = (model.inputs as Record<string, unknown>) ?? {}
  const projection = parseProjection(model.projection)
  const storedCharts = (model.charts_data as Record<string, Record<string, string | number>[]>) ?? {}
  const charts = Object.keys(storedCharts).length
    ? storedCharts
    : buildChartsFromProjection(projection)
  const breakEvenMonth = findBreakEvenMonth(projection)
  const companyName = String(inputs.companyName ?? "Your company")

  if (view !== "full") {
    const summary = buildFinancialModelCompletionSummary({ projection, inputs })
    return (
      <FinancialModelCompleteView
        modelId={id}
        confidence={summary.confidence}
        runwayMonths={summary.runwayMonths}
        recommendedRaise={summary.recommendedRaise}
        projectedArr={summary.projectedArr}
        seriesTiming={summary.seriesTiming}
      />
    )
  }

  return (
    <FinancialModelSlideshow
      modelId={id}
      companyName={companyName}
      breakEvenMonth={breakEvenMonth}
      charts={charts}
      narrative={model.narrative as string | null}
      summary={model.investor_summary as string | null}
      risks={model.risks}
      assumptions={model.assumptions}
      useOfFunds={model.use_of_funds}
      kpis={buildFinancialKpis({ projection, inputs, breakEvenMonth })}
    />
  )
}
