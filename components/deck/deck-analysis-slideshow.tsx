"use client"

import { type WheelEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { DeckExportButton } from "@/components/deck/deck-export-button"
import { DeckTeaserExportButton } from "@/components/deck/deck-teaser-export-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { dashboardSlideshowMainClass } from "@/lib/dashboard/page-classes"

type CategoryScore = { category: string; score: number; feedback: string }
type SuggestedFix = { title?: string; explanation?: string; priority?: string }
type PriorityAction = { action?: string; reason?: string; priority?: string }

type DeckAnalysisSlideshowProps = {
  analysisId: string
  canGenerateTeaser?: boolean
  score: number | null
  summary: string | null
  investorReadiness: string | null
  categories: CategoryScore[]
  strengths: string[]
  weaknesses: string[]
  missingSections: string[]
  fundraisingRisks: string[]
  suggestedFixes: SuggestedFix[]
  priorityActions: PriorityAction[]
}

function priorityClass(priority: unknown) {
  const value = String(priority ?? "").toLowerCase()
  if (value === "high") return "bg-primary text-primary-foreground"
  if (value === "medium") return "bg-secondary text-secondary-foreground"
  return "bg-muted text-muted-foreground"
}

function AnimatedGradientBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const [width, setWidth] = useState(0)
  const clamped = Math.max(0, Math.min(100, value))

  useEffect(() => {
    let fillFrame = 0
    const resetFrame = requestAnimationFrame(() => {
      setWidth(0)
      fillFrame = requestAnimationFrame(() => setWidth(clamped))
    })
    return () => {
      cancelAnimationFrame(resetFrame)
      cancelAnimationFrame(fillFrame)
    }
  }, [clamped])

  return (
    <div
      className={cn(
        "h-1.5 overflow-hidden rounded-sm bg-secondary",
        className
      )}
    >
      <div
        className="h-full bg-gradient-to-r from-[#070605] to-[#DF9C4E] transition-[width] duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
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
    <div className="relative flex min-h-[6.25rem] shrink-0 items-center overflow-hidden rounded-xl bg-[#070605] p-5 text-[#F7F0E6] ring-1 ring-black/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.95) 0%, rgba(0,0,0,.74) 38%, rgba(0,0,0,.2) 100%), radial-gradient(42% 95% at 74% 24%, rgba(223,156,78,.96), transparent 60%), radial-gradient(34% 82% at 92% 68%, rgba(122,52,27,.86), transparent 68%), radial-gradient(30% 72% at 62% 18%, rgba(26,92,106,.72), transparent 64%), linear-gradient(90deg, #030303 0%, #0b0807 42%, #22140d 100%)",
          backgroundBlendMode: "normal, screen, multiply, screen, normal",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,.38) 0 1px, transparent 1px), radial-gradient(circle at 70% 40%, rgba(0,0,0,.18) 0 1px, transparent 1px)",
          backgroundSize: "10px 10px, 16px 16px",
        }}
      />
      <div className="relative z-10 max-w-3xl">
        <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[#F7F0E6]/70">
          {eyebrow}
        </p>
        <h2 className="font-heading text-xl font-normal leading-tight tracking-tight md:text-[1.65rem]">
          {title}
        </h2>
        <p className="mt-1 line-clamp-3 max-w-2xl text-sm leading-relaxed text-[#F7F0E6]/75 md:line-clamp-none">
          {description}
        </p>
      </div>
    </div>
  )
}

function ScoreOverview({
  score,
  summary,
  investorReadiness,
}: Pick<DeckAnalysisSlideshowProps, "score" | "summary" | "investorReadiness">) {
  const value = score ?? 0
  const label =
    value >= 80 ? "Strong" : value >= 60 ? "Needs refinement" : "Not ready yet"

  return (
    <div className="grid min-h-0 gap-4 lg:h-full lg:grid-cols-[0.42fr_0.58fr]">
      <Card className="bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle>Investor-readiness score</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[calc(100%-3rem)] flex-col justify-center">
          <div className="rounded-xl bg-card p-5 ring-1 ring-border/55">
            <p className="bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text font-heading text-5xl leading-none text-transparent md:text-6xl">
              {score ?? "-"}
              <span className="ml-1 font-sans text-sm text-muted-foreground [-webkit-text-fill-color:currentColor]">
                /100
              </span>
            </p>
            <p className="mt-2 bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text text-xs font-medium text-transparent">
              {label}
            </p>
            <AnimatedGradientBar value={value} className="mt-4" />
          </div>
        </CardContent>
      </Card>
      <div className="grid min-h-0 gap-4">
        <Card className="min-h-0">
          <CardHeader className="pb-2">
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 overflow-y-auto">
            <p className="rounded-lg bg-muted/35 p-4 text-sm leading-relaxed text-muted-foreground">
              {summary || "No summary returned."}
            </p>
          </CardContent>
        </Card>
        <Card className="min-h-0">
          <CardHeader className="pb-2">
            <CardTitle>Investor readiness</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 overflow-y-auto">
            <p className="rounded-lg bg-muted/35 p-4 text-sm leading-relaxed text-muted-foreground">
              {investorReadiness || "No readiness note returned."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CategoryBreakdown({ categories }: { categories: CategoryScore[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current
    if (!scroller) return

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY

    if (delta === 0) return
    event.preventDefault()
    scroller.scrollLeft += delta
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Category breakdown</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollerRef}
          onWheel={onWheel}
          className="grid h-full gap-3 overflow-y-auto overscroll-contain pb-2 sm:grid-cols-2 md:flex md:overflow-x-auto md:overflow-y-hidden"
        >
          {categories.map((item) => (
            <div
              key={item.category}
              className="flex min-w-0 flex-col rounded-lg bg-muted/35 p-4 ring-1 ring-border/55 md:min-w-[18rem] md:shrink-0"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{item.category}</p>
                <span className="shrink-0 font-heading text-2xl leading-none">
                  {item.score}
                </span>
              </div>
              <AnimatedGradientBar value={item.score} className="mt-3" />
              <p className="mt-3 min-h-0 text-sm leading-relaxed text-muted-foreground md:overflow-y-auto">
                {item.feedback}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ListSlide({
  groups,
}: {
  groups: { title: string; items: string[] }[]
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.title} className="flex min-h-0 flex-col">
          <CardHeader className="pb-2">
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            {group.items.length ? (
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg bg-muted/35 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No items returned.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ActionSlide({
  title,
  items,
  getTitle,
  getBody,
}: {
  title: string
  items: (SuggestedFix | PriorityAction)[]
  getTitle: (item: SuggestedFix | PriorityAction) => string
  getBody: (item: SuggestedFix | PriorityAction) => string
}) {
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 gap-3 overflow-y-auto md:grid-cols-2">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${getTitle(item)}-${index}`} className="rounded-lg bg-muted/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{getTitle(item)}</p>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] ${priorityClass(item.priority)}`}
                >
                  {String(item.priority ?? "low")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {getBody(item)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No items returned.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function DeckAnalysisSlideshow(props: DeckAnalysisSlideshowProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const slides = useMemo(
    () => [
      {
        eyebrow: "Score",
        title: "Start with the investor-readiness signal.",
        description:
          "A concise view of the numerical score, summary, and what the deck currently communicates to investors.",
        content: (
          <ScoreOverview
            score={props.score}
            summary={props.summary}
            investorReadiness={props.investorReadiness}
          />
        ),
      },
      {
        eyebrow: "Breakdown",
        title: "Review the deck category by category.",
        description:
          "Side-scroll through each investor-critical area without cramming every category into the viewport.",
        content: <CategoryBreakdown categories={props.categories} />,
      },
      {
        eyebrow: "Signals",
        title: "See what is working and what weakens trust.",
        description:
          "Strengths and weaknesses are grouped together so the good signals and credibility gaps are easy to compare.",
        content: (
          <ListSlide
            groups={[
              { title: "Strengths", items: props.strengths },
              { title: "Weaknesses", items: props.weaknesses },
            ]}
          />
        ),
      },
      {
        eyebrow: "Gaps",
        title: "Find missing sections and fundraising risks.",
        description:
          "These are the omissions and investor objections most likely to slow the round down.",
        content: (
          <ListSlide
            groups={[
              { title: "Missing sections", items: props.missingSections },
              { title: "Fundraising risks", items: props.fundraisingRisks },
            ]}
          />
        ),
      },
      {
        eyebrow: "Fixes",
        title: "Prioritise the deck edits that matter.",
        description:
          "Suggested fixes are written as practical deck improvements, ordered by the urgency returned from the analysis.",
        content: (
          <ActionSlide
            title="Suggested fixes"
            items={props.suggestedFixes}
            getTitle={(item) => ("title" in item ? item.title ?? "Fix" : "Fix")}
            getBody={(item) =>
              "explanation" in item
                ? item.explanation ?? "No explanation returned."
                : "No explanation returned."
            }
          />
        ),
      },
      {
        eyebrow: "Actions",
        title: "Leave with a focused next-step list.",
        description:
          "Priority actions turn the analysis into a founder-ready checklist for improving the next version of the deck.",
        content: (
          <ActionSlide
            title="Priority actions"
            items={props.priorityActions}
            getTitle={(item) => ("action" in item ? item.action ?? "Action" : "Action")}
            getBody={(item) =>
              "reason" in item
                ? item.reason ?? "No reason returned."
                : "No reason returned."
            }
          />
        ),
      },
    ],
    [props]
  )

  const step = slides[stepIndex]
  const progress = Math.round(((stepIndex + 1) / slides.length) * 100)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === slides.length - 1

  return (
    <main className={dashboardSlideshowMainClass}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 sm:items-center sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-medium leading-none tracking-tight sm:text-3xl md:text-[2rem]">
            Pitch Deck Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Investor-readiness report and priority improvements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {props.canGenerateTeaser ? (
            <DeckTeaserExportButton analysisId={props.analysisId} />
          ) : null}
          <DeckExportButton analysisId={props.analysisId} />
        </div>
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
          "min-h-0 flex-1 overflow-y-auto p-1 md:overflow-hidden",
          "animate-in fade-in slide-in-from-right-4 duration-300"
        )}
      >
        {step.content}
      </section>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 pb-[env(safe-area-inset-bottom)]">
        <Button
          type="button"
          variant="outline"
          disabled={isFirst}
          className="min-h-11 shrink-0 touch-manipulation sm:min-h-8"
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <p className="order-first w-full text-center text-xs text-muted-foreground sm:order-none sm:w-auto sm:flex-1">
          Step {stepIndex + 1} of {slides.length}
        </p>
        <div className="hidden gap-1.5 sm:flex">
          {slides.map((slide, index) => (
            <button
              key={slide.eyebrow}
              type="button"
              aria-label={`Go to ${slide.eyebrow}`}
              onClick={() => setStepIndex(index)}
              className="h-2.5 min-w-8 touch-manipulation rounded-full bg-secondary transition-colors data-[active=true]:bg-foreground"
              data-active={index === stepIndex}
            />
          ))}
        </div>
        <Button
          type="button"
          disabled={isLast}
          className="min-h-11 shrink-0 touch-manipulation sm:min-h-8"
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
