"use client"

import { type ReactNode, useMemo, useState } from "react"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { FinancialChartsGrid } from "@/components/financial-model/financial-chart-card"
import { FinancialExportButton } from "@/components/financial-model/financial-export-button"
import {
  buildFinancialKpis,
  FinancialKpiCards,
} from "@/components/financial-model/financial-kpi-cards"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatCurrency,
  parseUseOfFunds,
  stringArray,
  type UseOfFundsItem,
} from "@/lib/financial/format"
import { cn } from "@/lib/utils"

type FinancialModelSlideshowProps = {
  modelId: string
  companyName: string
  breakEvenMonth: number | null
  charts: Record<string, Record<string, string | number>[]>
  narrative: string | null
  summary: string | null
  risks: unknown
  assumptions: unknown
  useOfFunds: unknown
  kpis: ReturnType<typeof buildFinancialKpis>
}

function FeatureStepCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="relative flex min-h-[5.5rem] shrink-0 items-center overflow-hidden rounded-xl bg-[#070605] p-4 text-[#F7F0E6] ring-1 ring-black/5 md:p-5">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.95) 0%, rgba(0,0,0,.74) 38%, rgba(0,0,0,.2) 100%), radial-gradient(42% 95% at 74% 24%, rgba(223,156,78,.96), transparent 60%), radial-gradient(34% 82% at 92% 68%, rgba(122,52,27,.86), transparent 68%), radial-gradient(30% 72% at 62% 18%, rgba(26,92,106,.72), transparent 64%), linear-gradient(90deg, #030303 0%, #0b0807 42%, #22140d 100%)",
          backgroundBlendMode: "normal, screen, multiply, screen, normal",
        }}
      />
      <div className="relative z-10 max-w-3xl">
        <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[#F7F0E6]/70">
          {eyebrow}
        </p>
        <h2 className="font-heading text-xl font-normal leading-tight tracking-tight md:text-[1.65rem]">
          {title}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#F7F0E6]/75">
          {description}
        </p>
      </div>
    </div>
  )
}

function ProsePanel({ children }: { children: ReactNode }) {
  return (
    <p className="line-clamp-[10] rounded-lg bg-muted/35 p-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

function CompactList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-1.5">
      {items.slice(0, 5).map((item) => (
        <li
          key={item}
          className="line-clamp-2 rounded-lg bg-muted/35 px-3 py-2 text-sm leading-snug text-muted-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function UseOfFundsStrip({ items }: { items: UseOfFundsItem[] }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No allocation returned.</p>
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((item) => {
        const share = total > 0 ? Math.round((item.amount / total) * 100) : 0
        return (
          <div
            key={item.category}
            className="flex min-w-[14rem] max-w-[16rem] flex-col rounded-lg bg-muted/35 p-3 ring-1 ring-border/55"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{item.category}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{share}%</span>
            </div>
            <p className="mt-1 font-heading text-lg leading-none">{formatCurrency(item.amount)}</p>
            <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              {item.rationale || "No rationale provided."}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-sm bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-[#070605] to-[#DF9C4E]"
                style={{ width: `${share}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FinancialModelSlideshow(props: FinancialModelSlideshowProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const riskItems = stringArray(props.risks)
  const assumptionItems = stringArray(props.assumptions)
  const fundItems = parseUseOfFunds(props.useOfFunds)

  const slides = useMemo(
    () => [
      {
        eyebrow: "Overview",
        title: "Headline numbers at a glance.",
        description: `Key outcomes for ${props.companyName} across the 36-month plan.`,
        content: <FinancialKpiCards items={props.kpis} compact />,
      },
      {
        eyebrow: "Charts",
        title: "Revenue, burn, cash, and runway.",
        description: "Four projection series shaped from your model inputs.",
        content: <FinancialChartsGrid charts={props.charts} compact />,
      },
      {
        eyebrow: "Story",
        title: "Funding narrative and investor summary.",
        description: "The written case investors will read alongside the numbers.",
        content: (
          <div className="grid h-full min-h-0 gap-3 md:grid-cols-2 md:items-start">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Funding narrative</CardTitle>
              </CardHeader>
              <CardContent>
                <ProsePanel>{props.narrative || "No narrative returned."}</ProsePanel>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Investor summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ProsePanel>{props.summary || "No summary returned."}</ProsePanel>
              </CardContent>
            </Card>
          </div>
        ),
      },
      {
        eyebrow: "Signals",
        title: "Risks and assumptions.",
        description: "What the model depends on and what could break the plan.",
        content: (
          <div className="grid h-full min-h-0 gap-3 md:grid-cols-2 md:items-start">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Risks</CardTitle>
              </CardHeader>
              <CardContent>
                <CompactList items={riskItems} emptyLabel="No risks returned." />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <CompactList items={assumptionItems} emptyLabel="No assumptions returned." />
              </CardContent>
            </Card>
          </div>
        ),
      },
      {
        eyebrow: "Allocation",
        title: "Use of funds.",
        description: "How the raise is allocated across spending categories.",
        content: (
          <Card className="h-auto self-start">
            <CardHeader className="pb-2">
              <CardTitle>Use of funds</CardTitle>
            </CardHeader>
            <CardContent>
              <UseOfFundsStrip items={fundItems} />
            </CardContent>
          </Card>
        ),
      },
    ],
    [props, riskItems, assumptionItems, fundItems]
  )

  const step = slides[stepIndex]
  const progress = Math.round(((stepIndex + 1) / slides.length) * 100)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === slides.length - 1

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-medium leading-none tracking-tight md:text-[2rem]">
            Financial model
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {props.companyName} · 36-month projection
            {props.breakEvenMonth ? ` · break-even M${props.breakEvenMonth}` : ""}
          </p>
        </div>
        <FinancialExportButton modelId={props.modelId} />
      </div>

      <FeatureStepCard
        key={`feature-${stepIndex}`}
        eyebrow={`${step.eyebrow} · ${stepIndex + 1} of ${slides.length}`}
        title={step.title}
        description={step.description}
      />

      <div className="h-1 shrink-0 overflow-hidden rounded-sm bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-[#070605] to-[#DF9C4E] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section
        key={stepIndex}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden p-1",
          "animate-in fade-in slide-in-from-right-4 duration-300"
        )}
      >
        <div className="min-h-0 flex-1 overflow-hidden">{step.content}</div>
      </section>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 pt-3">
        <Button
          type="button"
          variant="outline"
          disabled={isFirst}
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <div className="hidden gap-1 sm:flex">
          {slides.map((slide, index) => (
            <button
              key={slide.eyebrow}
              type="button"
              aria-label={`Go to ${slide.eyebrow}`}
              onClick={() => setStepIndex(index)}
              className="h-1.5 w-6 rounded-full bg-secondary transition-colors data-[active=true]:bg-foreground"
              data-active={index === stepIndex}
            />
          ))}
        </div>
        <Button
          type="button"
          disabled={isLast}
          onClick={() =>
            setStepIndex((index) => Math.min(slides.length - 1, index + 1))
          }
        >
          Next
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </main>
  )
}
