import { ArrowDown, TrendingDown } from "lucide-react"

import { AdminKpi } from "@/components/admin/admin-kpi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type FunnelStep = {
  label: string
  value: number
  description?: string
}

export function FunnelVisual({
  steps,
  signupCount,
}: {
  steps: FunnelStep[]
  signupCount: number
}) {
  const max = Math.max(...steps.map((s) => s.value), 1)
  const upgraded = steps[steps.length - 1]?.value ?? 0
  const onboarded = steps[1]?.value ?? 0
  const upgradeRate = signupCount > 0 ? Math.round((upgraded / signupCount) * 100) : 0
  const onboardRate = signupCount > 0 ? Math.round((onboarded / signupCount) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpi label="Signups" value={String(signupCount)} hint="Last 30 days" />
        <AdminKpi label="Onboarded" value={`${onboardRate}%`} hint={`${onboarded} completed profile`} />
        <AdminKpi
          label="Deck → score"
          value={
            steps[2]?.value && steps[3]?.value
              ? `${Math.round((steps[3].value / Math.max(steps[2].value, 1)) * 100)}%`
              : "0%"
          }
          hint="Of users who uploaded"
        />
        <AdminKpi label="Upgrade rate" value={`${upgradeRate}%`} hint={`${upgraded} paid plans`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion funnel</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each step shows count and % of signups. Drop-off is the gap to the previous step.
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          {steps.map((step, index) => {
            const pct = signupCount > 0 ? Math.round((step.value / signupCount) * 100) : 0
            const width = Math.max(8, Math.round((step.value / max) * 100))
            const prev = index > 0 ? steps[index - 1].value : null
            const dropOff =
              prev !== null && prev > 0 ? Math.round(((prev - step.value) / prev) * 100) : null

            return (
              <div key={step.label}>
                <div
                  className="relative mx-auto w-full max-w-full py-3 sm:max-w-none"
                  style={{ width: `min(100%, max(${Math.max(width, 28)}%, 12rem))` }}
                >
                  <div
                    className={cn(
                      "rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm",
                      index === steps.length - 1 && step.value > 0 && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Step {index + 1}
                        </p>
                        <p className="font-heading text-base font-medium">{step.label}</p>
                        {step.description ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-heading text-2xl font-medium tabular-nums">{step.value}</p>
                        <p className="text-xs text-muted-foreground">{pct}% of signups</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                </div>

                {index < steps.length - 1 ? (
                  <div className="flex flex-col items-center py-1 text-muted-foreground">
                    <ArrowDown className="size-4" aria-hidden />
                    {dropOff !== null && dropOff > 0 ? (
                      <span className="mt-0.5 flex items-center gap-1 text-xs">
                        <TrendingDown className="size-3" aria-hidden />
                        {dropOff}% drop-off
                      </span>
                    ) : (
                      <span className="mt-0.5 text-xs">Next step</span>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
