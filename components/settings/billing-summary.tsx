import Link from "next/link"

import { BillingActions } from "@/components/billing/billing-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPlan } from "@/lib/stripe/plans"
import type { Plan } from "@/types/app"

type Props = {
  plan: Plan
  hasCustomer: boolean
  subscriptionStatus?: string | null
  cancelsAt?: string | null
}

function statusLabel(plan: Plan, status?: string | null, cancelsAt?: string | null) {
  if (plan === "free") return "Trial"
  if (cancelsAt) {
    const date = new Date(cancelsAt)
    return `Cancels ${date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`
  }
  if (status === "past_due") return "Past due"
  return "Active"
}

export function BillingSummary({
  plan,
  hasCustomer,
  subscriptionStatus,
  cancelsAt,
}: Props) {
  const meta = getPlan(plan)
  const label = statusLabel(plan, subscriptionStatus, cancelsAt)
  const badgeVariant: "default" | "accent" | "destructive" =
    plan === "free"
      ? "accent"
      : subscriptionStatus === "past_due"
        ? "destructive"
        : "default"

  return (
    <Card className="bg-muted/20">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Billing &amp; subscription</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your plan, update payment details, and download invoices
            directly from Stripe&apos;s secure portal.
          </p>
        </div>
        <Badge variant={badgeVariant}>{label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-card p-3 ring-1 ring-border/55">
          <p className="text-xs text-muted-foreground">Current plan</p>
          <p className="mt-1 font-heading text-2xl leading-none capitalize">
            {meta?.name ?? "Free"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BillingActions hasCustomer={hasCustomer} />
          <Button variant="ghost" asChild>
            <Link href="/dashboard/billing">View plans &amp; upgrade</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
