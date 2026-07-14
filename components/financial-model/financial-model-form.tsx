"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, LoaderCircleIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/financial/format"
import { FinancialModelInputSchema } from "@/lib/openai/schemas"
import { cn } from "@/lib/utils"

type GrowthPreset = "conservative" | "expected" | "aggressive"

const GROWTH_PRESETS: Record<
  GrowthPreset,
  {
    label: string
    monthlyRevenueGrowth: string
    monthlyCostGrowth: string
    churn: string
    grossMargin: string
  }
> = {
  conservative: {
    label: "Conservative",
    monthlyRevenueGrowth: "5",
    monthlyCostGrowth: "3",
    churn: "3",
    grossMargin: "65",
  },
  expected: {
    label: "Expected",
    monthlyRevenueGrowth: "8",
    monthlyCostGrowth: "5",
    churn: "2",
    grossMargin: "70",
  },
  aggressive: {
    label: "Aggressive",
    monthlyRevenueGrowth: "12",
    monthlyCostGrowth: "7",
    churn: "1",
    grossMargin: "75",
  },
}

const BUILD_STEPS = [
  "Validating assumptions",
  "Forecasting revenue",
  "Calculating runway",
  "Modelling hiring",
  "Stress-testing growth assumptions",
  "Preparing investor-ready outputs",
]

type FieldDef = {
  name: FieldName
  label: string
  type: "text" | "number"
  placeholder?: string
  helper?: string
  optional?: boolean
}

type StepConfig = {
  navLabel: string
  title: string
  description: string
  why: string
  continueLabel: string
  fields: FieldDef[]
}

type FieldName =
  | "companyName"
  | "businessModel"
  | "industry"
  | "targetMarket"
  | "fundingGoal"
  | "currentMonthlyRevenue"
  | "currentMonthlyBurn"
  | "currentCashBalance"
  | "currentRunway"
  | "currentCustomers"
  | "raiseAmount"
  | "monthlyRevenueGrowth"
  | "monthlyCostGrowth"
  | "grossMargin"
  | "churn"
  | "targetCustomers"
  | "averageRevenuePerCustomer"
  | "teamSize"
  | "plannedHires"
  | "notes"

const steps: StepConfig[] = [
  {
    navLabel: "Company",
    title: "Company",
    description: "Start with the basics investors use to understand context.",
    why: "Investors use this information to understand your business before evaluating your financial assumptions.",
    continueLabel: "Continue to Current Performance",
    fields: [
      {
        name: "companyName",
        label: "Company name",
        type: "text",
        placeholder: "Example: Northline Systems",
      },
      {
        name: "businessModel",
        label: "Business model",
        type: "text",
        placeholder: "Example: B2B SaaS subscription",
      },
      {
        name: "industry",
        label: "Industry",
        type: "text",
        placeholder: "Example: FinTech",
      },
      {
        name: "targetMarket",
        label: "Target market",
        type: "text",
        placeholder: "Example: UK and EU SMEs",
      },
      {
        name: "fundingGoal",
        label: "Current fundraising target",
        type: "text",
        placeholder: "Example: £750,000 Pre-Seed",
      },
    ],
  },
  {
    navLabel: "Current Performance",
    title: "Current business performance",
    description:
      "These numbers form the baseline of your financial model and help investors understand your starting point.",
    why: "Revenue, costs and runway are usually the first numbers investors challenge.",
    continueLabel: "Continue to Growth Assumptions",
    fields: [
      {
        name: "currentMonthlyRevenue",
        label: "Monthly recurring revenue (MRR)",
        type: "number",
        placeholder: "Example: 18500",
      },
      {
        name: "currentMonthlyBurn",
        label: "Monthly operating costs",
        type: "number",
        placeholder: "Example: 12000",
      },
      {
        name: "currentCashBalance",
        label: "Cash in the bank",
        type: "number",
        placeholder: "Example: 145000",
      },
      {
        name: "currentRunway",
        label: "Remaining runway (months)",
        type: "number",
        placeholder: "Example: 14",
      },
      {
        name: "currentCustomers",
        label: "Paying customers",
        type: "number",
        placeholder: "Example: 320",
      },
    ],
  },
  {
    navLabel: "Growth Assumptions",
    title: "Future growth assumptions",
    description:
      "These assumptions help RaiseWise project revenue, runway and capital requirements over the next 36 months.",
    why: "Growth assumptions determine whether your fundraising ask appears realistic.",
    continueLabel: "Continue to Team & Fundraise",
    fields: [
      {
        name: "raiseAmount",
        label: "Target investment",
        type: "number",
        placeholder: "Example: 750000",
      },
      {
        name: "monthlyRevenueGrowth",
        label: "Expected monthly revenue growth",
        type: "number",
        placeholder: "Example: 8",
        helper: "Typical early-stage startups grow between 5-15% per month.",
      },
      {
        name: "monthlyCostGrowth",
        label: "Expected monthly operating cost growth",
        type: "number",
        placeholder: "Example: 5",
        helper: "Hiring and expansion usually increase operating costs over time.",
      },
      {
        name: "grossMargin",
        label: "Expected gross margin",
        type: "number",
        placeholder: "Example: 70",
        helper: "Revenue remaining after direct delivery costs.",
      },
      {
        name: "churn",
        label: "Monthly customer churn",
        type: "number",
        placeholder: "Example: 2",
        helper: "Percentage of customers expected to leave each month.",
      },
    ],
  },
  {
    navLabel: "Team & Fundraise",
    title: "Team & Growth Plan",
    description:
      "Complete the final assumptions we'll use to generate your financial model and fundraising forecast.",
    why: "Team and hiring plans help investors understand how capital will be deployed.",
    continueLabel: "Generate Financial Model",
    fields: [
      {
        name: "targetCustomers",
        label: "Target paying customers (36 months)",
        type: "number",
        placeholder: "Example: 2500",
      },
      {
        name: "averageRevenuePerCustomer",
        label: "Average annual revenue per customer",
        type: "number",
        placeholder: "Example: 2400",
      },
      {
        name: "teamSize",
        label: "Current team size",
        type: "number",
        placeholder: "Example: 6",
      },
      {
        name: "plannedHires",
        label: "Planned new hires",
        type: "number",
        placeholder: "Example: 8",
      },
      {
        name: "notes",
        label: "Optional assumptions or context",
        type: "text",
        placeholder: 'Example: "Revenue expected to accelerate after enterprise launch."',
        optional: true,
      },
    ],
  },
]

function num(value: string | undefined) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—"
  return formatCurrency(value)
}

export function FinancialModelForm({
  className,
  initialValues = {},
  deckPrefillHint,
}: {
  className?: string
  initialValues?: Record<string, string>
  deckPrefillHint?: string | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [values, setValues] = useState<Record<string, string>>(() => initialValues)
  const [preset, setPreset] = useState<GrowthPreset | null>(null)
  const [buildTick, setBuildTick] = useState(0)

  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  useEffect(() => {
    if (!loading) {
      setBuildTick(0)
      return
    }
    const interval = window.setInterval(() => {
      setBuildTick((value) => Math.min(value + 1, BUILD_STEPS.length))
    }, 900)
    return () => window.clearInterval(interval)
  }, [loading])

  const prefilledChecks = useMemo(() => {
    const checks = [
      {
        label: "Company name imported",
        done: Boolean(String(initialValues.companyName ?? "").trim()),
      },
      {
        label: "Industry identified",
        done: Boolean(String(initialValues.industry ?? "").trim()),
      },
      {
        label: "Funding target detected",
        done: Boolean(
          String(initialValues.fundingGoal ?? "").trim() ||
            String(initialValues.raiseAmount ?? "").trim()
        ),
      },
    ]
    return checks
  }, [initialValues])

  const snapshotReady =
    num(values.currentMonthlyRevenue) > 0 ||
    num(values.currentMonthlyBurn) > 0 ||
    num(values.currentCashBalance) > 0 ||
    num(values.currentRunway) > 0

  const optimisticWarning = useMemo(() => {
    const growth = num(values.monthlyRevenueGrowth)
    const churn = num(values.churn)
    const raise = num(values.raiseAmount)
    if (growth >= 25 || (churn === 0 && growth >= 10) || (growth >= 20 && raise > 0 && raise < 400000)) {
      return "These assumptions are unusually optimistic. You can continue, but investors are likely to challenge this forecast."
    }
    return null
  }, [values.monthlyRevenueGrowth, values.churn, values.raiseAmount])

  const projectedOutcome = useMemo(() => {
    const revenue = num(values.currentMonthlyRevenue)
    const growth = num(values.monthlyRevenueGrowth) / 100
    const burn = num(values.currentMonthlyBurn)
    const cash = num(values.currentCashBalance)
    const team = num(values.teamSize)
    const hires = num(values.plannedHires)
    const costGrowth = num(values.monthlyCostGrowth) / 100

    const month36Revenue =
      revenue > 0 ? revenue * (1 + Math.max(growth, 0)) ** 36 : 0

    let runway = num(values.currentRunway)
    if (cash > 0 && burn > 0) {
      let balance = cash
      let monthlyBurn = burn
      runway = 0
      while (balance > 0 && runway < 60) {
        balance -= monthlyBurn
        monthlyBurn *= 1 + Math.max(costGrowth, 0)
        if (balance <= 0) break
        runway += 1
      }
    }

    const seriesHint =
      month36Revenue >= 200000
        ? "Next funding likely Series A"
        : month36Revenue >= 50000
          ? "Likely Seed extension"
          : "Next round depends on traction"

    return {
      month36Revenue,
      runway,
      teamSize: team + hires,
      seriesHint,
    }
  }, [values])

  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    if (
      name === "monthlyRevenueGrowth" ||
      name === "monthlyCostGrowth" ||
      name === "churn" ||
      name === "grossMargin"
    ) {
      setPreset(null)
    }
  }

  function applyPreset(next: GrowthPreset) {
    const selected = GROWTH_PRESETS[next]
    setPreset(next)
    setValues((current) => ({
      ...current,
      monthlyRevenueGrowth: selected.monthlyRevenueGrowth,
      monthlyCostGrowth: selected.monthlyCostGrowth,
      churn: selected.churn,
      grossMargin: selected.grossMargin,
    }))
  }

  function validateCurrentStep(): string | null {
    for (const field of step.fields) {
      if (field.optional) continue
      if (!String(values[field.name] ?? "").trim()) {
        return `${field.label} is required`
      }
    }
    return null
  }

  function validateAllSteps(): string | null {
    const parsed = FinancialModelInputSchema.safeParse({
      companyName: values.companyName ?? "",
      businessModel: values.businessModel ?? "",
      industry: values.industry ?? "",
      targetMarket: values.targetMarket ?? "",
      fundingGoal: values.fundingGoal ?? "",
      currentMonthlyRevenue: values.currentMonthlyRevenue ?? "0",
      currentMonthlyBurn: values.currentMonthlyBurn ?? "0",
      currentCashBalance: values.currentCashBalance ?? "0",
      currentRunway: values.currentRunway ?? "0",
      raiseAmount: values.raiseAmount ?? "0",
      monthlyRevenueGrowth: values.monthlyRevenueGrowth ?? "0",
      monthlyCostGrowth: values.monthlyCostGrowth ?? "0",
      grossMargin: values.grossMargin ?? "0",
      churn: values.churn ?? "0",
      currentCustomers: values.currentCustomers ?? "0",
      targetCustomers: values.targetCustomers ?? "0",
      averageRevenuePerCustomer: values.averageRevenuePerCustomer ?? "0",
      teamSize: values.teamSize ?? "0",
      plannedHires: values.plannedHires ?? "0",
      notes: values.notes ?? "",
    })
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      const path = String(first?.path?.[0] ?? "")
      const label =
        steps.flatMap((item) => item.fields).find((field) => field.name === path)?.label ?? path
      return label ? `Check "${label}": ${first.message}` : first?.message ?? "Invalid input"
    }
    return null
  }

  async function submit() {
    if (loading) return

    const stepError = validateAllSteps()
    if (stepError) {
      setError(stepError)
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch("/api/financial-model/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const json = await response.json()
    setLoading(false)

    if (!json.success) {
      setError(json.error)
      return
    }

    router.push(`/dashboard/financial-model/${json.data.id}`)
  }

  const stepBlocks = Array.from({ length: 6 }, (_, index) => {
    const filledCount = Math.ceil(((stepIndex + 1) / steps.length) * 6)
    return index < filledCount
  })

  if (loading) {
    return (
      <Card className={cn("flex min-h-0 flex-col bg-muted/20 md:h-full", className)}>
        <CardHeader>
          <CardTitle>Building your financial model…</CardTitle>
          <CardDescription>
            RaiseWise is turning your assumptions into an investor-ready forecast.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2.5">
            {BUILD_STEPS.map((item, index) => {
              const done = index < buildTick
              const active = index === buildTick
              return (
                <li
                  key={item}
                  className={cn(
                    "flex items-center gap-2.5 text-sm",
                    done || active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {done ? (
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                  ) : active ? (
                    <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border border-border" />
                  )}
                  <span>
                    {done ? "✓ " : ""}
                    {item}
                  </span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("flex min-h-0 flex-col bg-muted/20 md:h-full", className)}>
      <CardHeader className="shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-4 max-sm:flex-col">
          <div>
            <CardTitle>Financial model inputs</CardTitle>
            <CardDescription>
              Step {stepIndex + 1} of {steps.length}:{" "}
              {stepIndex === 0
                ? "Company"
                : stepIndex === 1
                  ? "Current Performance"
                  : stepIndex === 2
                    ? "Growth Assumptions"
                    : "Final Assumptions"}
              {stepIndex === 1
                ? " — Help us understand where your business stands today."
                : stepIndex === 2
                  ? " — Tell us how you expect your business to grow over the next three years."
                  : stepIndex === 3
                    ? " — Add the final details before generating your investor-ready financial model."
                    : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Step {stepIndex + 1} of {steps.length}
            </span>
            <span aria-hidden className="tracking-[0.18em]">
              {stepBlocks.map((filled, index) => (
                <span key={index} className={filled ? "text-foreground" : "text-border"}>
                  ■
                </span>
              ))}
            </span>
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-sm bg-secondary">
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {(deckPrefillHint || prefilledChecks.some((item) => item.done)) && (
            <Alert>
              <AlertTitle>We&apos;ve already completed part of the work</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Information from your latest pitch deck has been used to prefill this model.
                  Review and edit anything before continuing.
                </p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {deckPrefillHint ? (
                    <li className="inline-flex items-center gap-1">
                      <CheckIcon className="size-3 text-primary" />
                      Pitch deck analysed
                    </li>
                  ) : null}
                  {prefilledChecks
                    .filter((item) => item.done)
                    .map((item) => (
                      <li key={item.label} className="inline-flex items-center gap-1">
                        <CheckIcon className="size-3 text-primary" />
                        {item.label}
                      </li>
                    ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not generate model</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[0.5fr_1.1fr_0.7fr]">
            <aside className="hidden space-y-2 lg:block">
              {steps.map((item, index) => {
                const done = index < stepIndex
                const active = index === stepIndex
                return (
                  <button
                    key={item.navLabel}
                    type="button"
                    disabled={loading}
                    onClick={() => setStepIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active && "bg-sidebar-accent",
                      !active && "hover:bg-sidebar-accent/60"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 shrink-0 text-center text-sm",
                        done && "text-primary",
                        active && !done && "text-foreground",
                        !done && !active && "text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      {done ? "✓" : active ? "●" : "○"}
                    </span>
                    <span className={cn(done || active ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {item.navLabel}
                    </span>
                  </button>
                )
              })}
            </aside>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {steps.map((item, index) => (
                <button
                  key={item.navLabel}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className="min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm data-[active=true]:bg-sidebar-accent data-[active=false]:bg-muted/50"
                  data-active={index === stepIndex}
                >
                  {index < stepIndex ? "✓ " : ""}
                  {item.navLabel}
                </button>
              ))}
            </div>

            <section className="rounded-xl bg-card p-3.5 ring-1 ring-border/55 sm:p-4">
              <div className="mb-4 rounded-lg bg-muted/40 px-3 py-3">
                <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Step {stepIndex + 1} · Why this matters
                </p>
                <p className="mt-1 text-sm text-foreground">{step.why}</p>
              </div>

              <div className="mb-3">
                <h3 className="font-heading text-2xl leading-none">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>

              {stepIndex === 2 ? (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-medium">How would you describe your growth?</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(GROWTH_PRESETS) as GrowthPreset[]).map((key) => (
                      <Button
                        key={key}
                        type="button"
                        size="sm"
                        variant={preset === key ? "default" : "outline"}
                        onClick={() => applyPreset(key)}
                      >
                        {GROWTH_PRESETS[key].label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecting one pre-fills growth fields. You can still edit every number.
                  </p>
                </div>
              ) : null}

              {stepIndex === 1 ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  We&apos;ll use the information below to calculate your financial model and
                  projected runway.
                </p>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {step.fields.map((field) => (
                  <div
                    key={field.name}
                    className={cn("space-y-2", field.name === "notes" && "md:col-span-2")}
                  >
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {field.name === "notes" ? (
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={values[field.name] ?? ""}
                        onChange={(event) => updateField(field.name, event.target.value)}
                        className="min-h-20 resize-none"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={values[field.name] ?? ""}
                        onChange={(event) => updateField(field.name, event.target.value)}
                        placeholder={field.placeholder}
                        required={!field.optional}
                      />
                    )}
                    {field.helper ? (
                      <p className="text-xs text-muted-foreground">{field.helper}</p>
                    ) : null}
                  </div>
                ))}
              </div>

              {stepIndex === 1 && snapshotReady ? (
                <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Current Snapshot
                  </p>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Monthly revenue</dt>
                      <dd className="text-sm font-medium">
                        {formatMoney(num(values.currentMonthlyRevenue))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Monthly burn</dt>
                      <dd className="text-sm font-medium">
                        {formatMoney(num(values.currentMonthlyBurn))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Estimated runway</dt>
                      <dd className="text-sm font-medium">
                        {num(values.currentRunway)
                          ? `${num(values.currentRunway)} months`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Cash</dt>
                      <dd className="text-sm font-medium">
                        {formatMoney(num(values.currentCashBalance))}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {stepIndex === 2 && optimisticWarning ? (
                <Alert className="mt-4">
                  <AlertTitle>Check your assumptions</AlertTitle>
                  <AlertDescription>{optimisticWarning}</AlertDescription>
                </Alert>
              ) : null}

              {stepIndex === 2 ? (
                <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Projected Outcome
                  </p>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Revenue after 36 months</dt>
                      <dd className="text-sm font-medium">
                        {formatMoney(projectedOutcome.month36Revenue)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Runway</dt>
                      <dd className="text-sm font-medium">
                        {projectedOutcome.runway
                          ? `${projectedOutcome.runway} months`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Estimated team size</dt>
                      <dd className="text-sm font-medium">
                        {projectedOutcome.teamSize || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Next funding</dt>
                      <dd className="text-sm font-medium">{projectedOutcome.seriesHint}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {isLast ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="text-sm font-medium">Ready to generate</p>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <li>✓ Company details</li>
                      <li>✓ Current performance</li>
                      <li>✓ Growth assumptions</li>
                      <li>✓ Team & hiring</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Your financial model is ready to generate.
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-sm font-medium">You&apos;re almost there.</p>
                    <p className="mt-1 text-xs text-muted-foreground">After this step you&apos;ll receive:</p>
                    <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                      <li>✓ 36-month forecast</li>
                      <li>✓ Revenue projections</li>
                      <li>✓ Burn & runway</li>
                      <li>✓ Hiring plan</li>
                      <li>✓ Capital requirements</li>
                      <li>✓ Downloadable investor model</li>
                    </ul>
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="hidden space-y-3 lg:block">
              {stepIndex === 0 ? (
                <InsightCard
                  title="Progress"
                  body="Complete the remaining information to generate your financial model."
                  items={[
                    ...(deckPrefillHint ? ["Pitch deck analysed"] : []),
                    ...prefilledChecks.filter((item) => item.done).map((item) => item.label),
                  ]}
                />
              ) : null}
              {stepIndex === 1 ? (
                <InsightCard
                  title="Investor Insight"
                  body="Early-stage investors immediately look for:"
                  items={["Revenue trajectory", "Burn rate", "Cash runway"]}
                  footer="Accurate numbers produce a more credible forecast."
                />
              ) : null}
              {stepIndex === 2 ? (
                <InsightCard
                  title="RaiseWise Insight"
                  body="Small changes in growth assumptions can have a significant impact on your fundraising requirements."
                  footer="Use realistic assumptions; investors will challenge optimistic projections."
                />
              ) : null}
              {stepIndex === 3 ? (
                <InsightCard
                  title="Next step"
                  body="Once your model is ready, RaiseWise will guide you to investors who fit your stage and raise."
                />
              ) : null}
            </aside>
          </div>
        </div>
      </CardContent>

      <CardFooter className="shrink-0 justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isFirst || loading}
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
        >
          Back
        </Button>
        {isLast ? (
          <Button
            type="button"
            disabled={loading}
            onClick={submit}
            className="max-sm:h-auto max-sm:min-h-11 max-sm:whitespace-normal max-sm:px-3 max-sm:py-2"
          >
            <span className="sm:hidden">Generate model</span>
            <span className="hidden sm:inline">Generate Financial Model</span>
          </Button>
        ) : (
          <Button
            type="button"
            disabled={loading}
            onClick={() => {
              const stepError = validateCurrentStep()
              if (stepError) {
                setError(stepError)
                return
              }
              setError(null)
              setStepIndex((index) => Math.min(steps.length - 1, index + 1))
            }}
          >
            {step.continueLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function InsightCard({
  title,
  body,
  items,
  footer,
}: {
  title: string
  body: string
  items?: string[]
  footer?: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{body}</p>
      {items?.length ? (
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {footer ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{footer}</p> : null}
    </div>
  )
}
