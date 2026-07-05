"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

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
import { cn } from "@/lib/utils"
import { FinancialModelInputSchema } from "@/lib/openai/schemas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const steps = [
  {
    title: "Company",
    description: "Start with the basics investors use to understand context.",
    fields: [
      ["companyName", "Company name", "text"],
      ["businessModel", "Business model", "text"],
      ["industry", "Industry", "text"],
      ["targetMarket", "Target market", "text"],
      ["fundingGoal", "Funding goal", "text"],
    ],
  },
  {
    title: "Current numbers",
    description: "Capture today’s revenue, burn, runway, and cash position.",
    fields: [
      ["currentMonthlyRevenue", "Current monthly revenue", "number"],
      ["currentMonthlyBurn", "Current monthly burn", "number"],
      ["currentCashBalance", "Current cash balance", "number"],
      ["currentRunway", "Current runway", "number"],
      ["currentCustomers", "Current customers", "number"],
    ],
  },
  {
    title: "Growth assumptions",
    description: "Add the assumptions that drive the 36-month projection.",
    fields: [
      ["raiseAmount", "Raise amount", "number"],
      ["monthlyRevenueGrowth", "Monthly revenue growth %", "number"],
      ["monthlyCostGrowth", "Monthly cost growth %", "number"],
      ["grossMargin", "Gross margin %", "number"],
      ["churn", "Churn %", "number"],
    ],
  },
  {
    title: "Team and notes",
    description: "Finish with hiring, customer targets, and any nuance.",
    fields: [
      ["targetCustomers", "Target customers", "number"],
      ["averageRevenuePerCustomer", "Average revenue per customer", "number"],
      ["teamSize", "Team size", "number"],
      ["plannedHires", "Planned hires", "number"],
    ],
  },
] as const

type FieldName = (typeof steps)[number]["fields"][number][0] | "notes"

export function FinancialModelForm({
  className,
  initialValues = {},
  deckPrefillHint,
}: {
  className?: string
  /** Prefilled from onboarding / settings profile; user can edit. */
  initialValues?: Record<string, string>
  deckPrefillHint?: string | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [values, setValues] = useState<Record<string, string>>(() => initialValues)

  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / steps.length) * 100),
    [stepIndex]
  )

  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  function validateCurrentStep(): string | null {
    for (const [name, label] of step.fields) {
      if (!String(values[name] ?? "").trim()) {
        return `${label} is required`
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
      const label = steps
        .flatMap((s) => [...s.fields])
        .find((row) => row[0] === path)?.[1]
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

  return (
    <Card className={cn("flex min-h-0 flex-col bg-muted/20 md:h-full", className)}>
      <CardHeader className="shrink-0">
        <div className="flex items-start justify-between gap-4 max-sm:flex-col">
          <div>
            <CardTitle>Financial model inputs</CardTitle>
            <CardDescription>
              Step {stepIndex + 1} of {steps.length}: {step.description}
            </CardDescription>
          </div>
          <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
            {progress}%
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-sm bg-secondary">
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {deckPrefillHint ? (
            <Alert>
              <AlertTitle>Prefilled from your deck</AlertTitle>
              <AlertDescription>{deckPrefillHint}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not generate model</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[0.58fr_1.42fr]">
            <aside className="space-y-2">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  disabled={loading}
                  onClick={() => setStepIndex(index)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-50 data-[active=true]:bg-sidebar-accent"
                  data-active={index === stepIndex}
                >
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                </button>
              ))}
            </aside>

            <section className="rounded-xl bg-card p-3.5 ring-1 ring-border/55">
              <div className="mb-3">
                <h3 className="font-heading text-2xl leading-none">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {step.fields.map(([name, label, type]) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name}>{label}</Label>
                    <Input
                      id={name}
                      name={name}
                      type={type}
                      value={values[name] ?? ""}
                      onChange={(event) => updateField(name, event.target.value)}
                      required
                    />
                  </div>
                ))}
                {isLast ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={values.notes ?? ""}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                      className="min-h-10 resize-none py-1.5"
                      placeholder="Add anything investors should know about your model."
                    />
                  </div>
                ) : null}
              </div>
            </section>
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
            aria-label={loading ? "Generating model" : undefined}
          >
            {loading ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              "Generate model"
            )}
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
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
