import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { plans } from "@/lib/stripe/plans"
import { createAdminClient } from "@/lib/supabase/admin"

const STARTER_GBP = plans.find((p) => p.id === "starter")?.prices.gbp ?? 29
const PRO_GBP = plans.find((p) => p.id === "pro")?.prices.gbp ?? 79
const LIFETIME_GBP = plans.find((p) => p.id === "lifetime")?.prices.gbp ?? 349

export default async function AdminRevenuePage() {
  const supabase = createAdminClient()

  const [{ data: starters }, { data: pros }, { data: lifetimes }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "starter").eq("subscription_status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "pro").eq("subscription_status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "lifetime"),
    supabase.from("billing_events").select("event_type, created_at").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const starterCount = starters?.length ?? 0
  const proCount = pros?.length ?? 0
  const lifetimeCount = lifetimes?.length ?? 0
  const mrrGbp = starterCount * STARTER_GBP + proCount * PRO_GBP
  const lifetimeRevenueGbp = lifetimeCount * LIFETIME_GBP

  const cancellations = (events ?? []).filter((e) =>
    String(e.event_type).includes("subscription.deleted")
  ).length

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Revenue</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <KPI label="MRR (GBP)" value={`£${mrrGbp.toLocaleString()}`} />
        <KPI label="Lifetime revenue (GBP)" value={`£${lifetimeRevenueGbp.toLocaleString()}`} />
        <KPI label="Churn last 30d" value={String(cancellations)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active subscribers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <KPI label="Starter" value={String(starterCount)} />
          <KPI label="Pro" value={String(proCount)} />
          <KPI label="Lifetime" value={String(lifetimeCount)} />
        </CardContent>
      </Card>
    </div>
  )
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-3xl">{value}</p>
      </CardContent>
    </Card>
  )
}
