import Link from "next/link"

import { AdminKpi } from "@/components/admin/admin-kpi"
import { AdminUserLink } from "@/components/admin/admin-user-link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchProfilesByIds } from "@/lib/admin/queries"
import { fetchLifetimeInventoryAdmin } from "@/lib/stripe/lifetime-inventory"
import { plans } from "@/lib/stripe/plans"
import { createAdminClient } from "@/lib/supabase/admin"

const STARTER_GBP = plans.find((p) => p.id === "starter")?.prices.gbp ?? 29
const PRO_GBP = plans.find((p) => p.id === "pro")?.prices.gbp ?? 79
const LIFETIME_GBP = plans.find((p) => p.id === "lifetime")?.prices.gbp ?? 349

function isoDaysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

function formatEventType(type: string) {
  return type.replace(/\./g, " · ").replace(/_/g, " ")
}

export default async function AdminRevenuePage() {
  const supabase = createAdminClient()
  const since = isoDaysAgo(30)

  const [
    { count: starters },
    { count: pros },
    { count: lifetimes },
    { count: freeUsers },
    { count: pastDue },
    { count: failedPayments },
    { data: events },
    { data: recentLifetime },
    inventory,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("plan", "starter")
      .eq("subscription_status", "active"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("plan", "pro")
      .eq("subscription_status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "lifetime"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "free"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "past_due"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("failed_payment_count", 0),
    supabase
      .from("billing_events")
      .select("event_type, created_at, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, full_name, lifetime_purchased_at")
      .eq("plan", "lifetime")
      .gte("lifetime_purchased_at", since)
      .order("lifetime_purchased_at", { ascending: false }),
    fetchLifetimeInventoryAdmin(),
  ])

  const starterCount = starters ?? 0
  const proCount = pros ?? 0
  const lifetimeCount = lifetimes ?? 0
  const mrrGbp = starterCount * STARTER_GBP + proCount * PRO_GBP
  const arrGbp = mrrGbp * 12
  const lifetimeRevenueGbp = lifetimeCount * LIFETIME_GBP
  const paidUsers = starterCount + proCount + lifetimeCount

  const cancellations = (events ?? []).filter((e) =>
    String(e.event_type).includes("subscription.deleted")
  ).length
  const newCheckouts = (events ?? []).filter((e) =>
    String(e.event_type).includes("checkout.session.completed")
  ).length
  const invoicePaid = (events ?? []).filter((e) =>
    String(e.event_type).includes("invoice.paid")
  ).length

  const recentEvents = (events ?? []).slice(0, 15)
  const profileMap = await fetchProfilesByIds(
    supabase,
    recentEvents.map((e) => (e.user_id ? String(e.user_id) : null))
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Revenue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MRR, lifetime sales, and billing activity
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpi label="MRR (GBP)" value={`£${mrrGbp.toLocaleString()}`} hint="Active subscriptions" />
        <AdminKpi label="ARR (GBP)" value={`£${arrGbp.toLocaleString()}`} hint="MRR × 12" />
        <AdminKpi
          label="Lifetime revenue"
          value={`£${lifetimeRevenueGbp.toLocaleString()}`}
          hint={`${lifetimeCount} lifetime seats`}
        />
        <AdminKpi
          label="Paid users"
          value={String(paidUsers)}
          hint={`${freeUsers ?? 0} still on free`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpi label="Churn (30d)" value={String(cancellations)} hint="Subscription deleted events" />
        <AdminKpi label="New checkouts (30d)" value={String(newCheckouts)} />
        <AdminKpi label="Invoices paid (30d)" value={String(invoicePaid)} />
        <AdminKpi
          label="Past due"
          value={String(pastDue ?? 0)}
          hint={`${failedPayments ?? 0} with failed payments`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active subscribers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <AdminKpi
              label="Starter"
              value={String(starterCount)}
              hint={`£${STARTER_GBP}/mo each`}
            />
            <AdminKpi label="Pro" value={String(proCount)} hint={`£${PRO_GBP}/mo each`} />
            <AdminKpi
              label="Lifetime"
              value={String(lifetimeCount)}
              hint={`£${LIFETIME_GBP} one-time`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifetime inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AdminKpi
              label="Sold"
              value={`${inventory.currentCount} / ${inventory.maxCount}`}
              hint={
                inventory.soldOut
                  ? "Sold out"
                  : `${inventory.remaining} remaining · ${recentLifetime?.length ?? 0} sold in last 30d`
              }
            />
            <ButtonRow>
              <Link
                href="/admin/lifetime"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View lifetime customers →
              </Link>
            </ButtonRow>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent billing events (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEvents.length ? (
                recentEvents.map((event, index) => {
                  const userId = event.user_id ? String(event.user_id) : null
                  const profile = userId ? profileMap.get(userId) : null

                  return (
                    <TableRow key={`${event.created_at}-${index}`}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(String(event.created_at)).toLocaleString("en-GB")}
                      </TableCell>
                      <TableCell>
                        <AdminUserLink profile={profile} userId={userId} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatEventType(String(event.event_type))}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No billing events in the last 30 days.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ButtonRow({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
