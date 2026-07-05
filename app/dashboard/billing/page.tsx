import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import { BillingActions } from "@/components/billing/billing-actions"
import { PlanCard } from "@/components/billing/plan-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProfile } from "@/lib/auth"
import { detectCurrencyFromRequest } from "@/lib/billing/currency.server"
import { fetchLifetimeInventory } from "@/lib/stripe/lifetime-inventory"
import { getPlan, plans } from "@/lib/stripe/plans"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"
import type { Plan } from "@/types/app"

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  lifetime: 3,
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const params = await searchParams
  const [profile, currency, lifetime] = await Promise.all([
    getProfile(),
    detectCurrencyFromRequest(),
    fetchLifetimeInventory(),
  ])
  const plan = (profile?.plan as Plan | undefined) ?? "free"
  const planMeta = getPlan(plan)
  const checkoutState = params.checkout

  const upgradeOptions = plans.filter((option) => {
    if (option.id === "lifetime" && lifetime.soldOut) return false
    return PLAN_RANK[option.id] > PLAN_RANK[plan]
  })

  return (
    <main className={dashboardPageMainClass}>
      <div className="shrink-0 space-y-4">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
            Billing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage plans and subscriptions.
          </p>
        </div>

        {checkoutState === "success" ? (
          <Alert className="border-[#1A3C2A]/25 bg-[#E8F0EB] text-[#1A3C2A]">
            <AlertDescription>
              Welcome to {planMeta?.name ?? "RaiseWise"}! Your subscription is active.
            </AlertDescription>
          </Alert>
        ) : null}

        {checkoutState === "pending" ? (
          <Alert className="border-amber-300/60 bg-amber-50 text-amber-900">
            <AlertDescription>
              Your payment is still processing. We&apos;ll update your plan as soon
              as Stripe confirms the charge. Refresh this page in a minute.
            </AlertDescription>
          </Alert>
        ) : null}

        {checkoutState === "error" ? (
          <Alert className="border-destructive/40 bg-destructive/5 text-destructive">
            <AlertDescription>
              We couldn&apos;t verify your checkout. If you were charged, contact
              support and we&apos;ll fix it right away.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <FeaturePhotoCard
            eyebrow="Billing"
            title={
              <>
                Upgrade when the raise needs more <FeatureEm>signal.</FeatureEm>
              </>
            }
            description="Unlock full exports, investor matching, and deeper analysis when your process moves from draft to outreach."
          />
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle>Plan summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-card p-3 ring-1 ring-border/55">
                <p className="text-xs text-muted-foreground">Current plan</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-heading text-3xl leading-none capitalize">
                    {planMeta?.name ?? "Free"}
                  </p>
                  <Badge variant={plan === "free" ? "accent" : "default"}>
                    {plan === "free" ? "Trial" : "Active"}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-2 text-sm">
                {[
                  ["Deck reports", plan === "free" ? "Preview" : "Full"],
                  ["PDF exports", plan === "free" ? "Locked" : "Included"],
                  [
                    "Investor matching",
                    plan === "pro" || plan === "lifetime" ? "Included" : "Locked",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg bg-card/70 px-3 py-2"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <BillingActions hasCustomer={Boolean(profile?.stripe_customer_id)} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="pb-1">
        {upgradeOptions.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upgradeOptions.map((option) => (
              <PlanCard
                key={option.id}
                plan={option}
                currency={currency}
                current={plan === option.id}
                highlighted={option.id === "pro"}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              You&apos;re on the top tier. Nothing more to upgrade — well done.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
