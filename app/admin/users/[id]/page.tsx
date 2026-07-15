import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Globe,
  Mail,
  Target,
  User,
} from "lucide-react"

import { grantPlan, resetUsage, rerunFailedJob, softDeleteUser } from "@/lib/admin/actions"
import { AdminKpi } from "@/components/admin/admin-kpi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CURRENCY_LABEL, STAGE_LABEL, isOnboardingComplete } from "@/lib/onboarding"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

function isoDaysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm">{value}</p>
      </div>
    </div>
  )
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()
  const since = isoDaysAgo(30)

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle()
  if (!profile) notFound()

  const [
    { data: usage },
    { data: failedJobs },
    { count: deckCount },
    { count: completedDecks },
    { count: financialCount },
    { count: matchJobCount },
    { data: latestDeck },
    { data: costs },
    { data: billingEvents },
  ] = await Promise.all([
    supabase.from("user_usage").select("*").eq("user_id", id).maybeSingle(),
    supabase
      .from("investor_matching_jobs")
      .select("id, status, error, created_at")
      .eq("user_id", id)
      .eq("status", "failed")
      .order("created_at", { ascending: false }),
    supabase.from("deck_analyses").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase
      .from("deck_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("status", "completed"),
    supabase.from("financial_models").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase
      .from("investor_matching_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id),
    supabase
      .from("deck_analyses")
      .select("id, status, created_at, summary")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("api_costs")
      .select("cost_usd, provider")
      .eq("user_id", id)
      .gte("created_at", since),
    supabase
      .from("billing_events")
      .select("event_type, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const p = profile as Profile
  const apiCost30d = (costs ?? []).reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0)
  const onboarded = isOnboardingComplete(p)
  const stage = (p.stage ?? p.funding_stage) as keyof typeof STAGE_LABEL | null
  const currency = p.target_raise_currency as keyof typeof CURRENCY_LABEL | null
  const raiseLabel =
    p.target_raise && currency
      ? `${CURRENCY_LABEL[currency]?.split(" ")[1] ?? ""}${p.target_raise.toLocaleString()}`
      : "—"

  async function grantStarter() {
    "use server"
    await grantPlan(id, "starter")
  }
  async function grantPro() {
    "use server"
    await grantPlan(id, "pro")
  }
  async function grantLifetime() {
    "use server"
    await grantPlan(id, "lifetime")
  }
  async function grantFree() {
    "use server"
    await grantPlan(id, "free")
  }
  async function reset() {
    "use server"
    await resetUsage(id)
  }
  async function softDelete() {
    "use server"
    await softDeleteUser(id)
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to users
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-medium text-primary">
            {initials(p.full_name, p.email)}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {p.full_name || p.email || "User"}
            </h1>
            {p.full_name && p.email ? (
              <p className="text-sm text-muted-foreground">{p.email}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={p.plan === "free" ? "neutral" : "default"}>{p.plan}</Badge>
              <Badge variant="outline">{p.subscription_status}</Badge>
              {onboarded ? (
                <Badge variant="outline">Onboarded</Badge>
              ) : (
                <Badge variant="destructive">Onboarding incomplete</Badge>
              )}
              {p.deleted_at ? <Badge variant="destructive">Deleted</Badge> : null}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Joined {new Date(p.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailItem icon={Mail} label="Email" value={p.email ?? "—"} />
              <DetailItem icon={User} label="Name" value={p.full_name ?? "—"} />
              <DetailItem icon={Building2} label="Company" value={p.company_name ?? "—"} />
              <DetailItem icon={Globe} label="Website" value={p.website ?? "—"} />
              <DetailItem
                icon={Target}
                label="Sector / stage"
                value={`${p.sector ?? p.industry ?? "—"} · ${stage ? STAGE_LABEL[stage] ?? stage : "—"}`}
              />
              <DetailItem icon={Target} label="Target raise" value={raiseLabel} />
              <DetailItem
                icon={Globe}
                label="Geography"
                value={p.geography ?? p.location ?? "—"}
              />
              <DetailItem icon={Calendar} label="Paywall seen" value={
                p.paywall_dismissed_at
                  ? new Date(p.paywall_dismissed_at).toLocaleDateString("en-GB")
                  : "No"
              } />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminKpi label="Deck analyses" value={String(deckCount ?? 0)} hint={`${completedDecks ?? 0} completed`} />
              <AdminKpi label="Financial models" value={String(financialCount ?? 0)} />
              <AdminKpi label="Match runs" value={String(matchJobCount ?? 0)} />
              <AdminKpi label="API cost (30d)" value={`$${apiCost30d.toFixed(2)}`} />
            </CardContent>
            {latestDeck ? (
              <CardContent className="border-t pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Latest deck
                </p>
                <p className="mt-1 text-sm">
                  {String(latestDeck.status)} ·{" "}
                  {new Date(String(latestDeck.created_at)).toLocaleDateString("en-GB")}
                </p>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {billingEvents?.length ? (
                billingEvents.map((event, index) => (
                  <div
                    key={`${event.created_at}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/55 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {new Date(String(event.created_at)).toLocaleString("en-GB")}
                    </span>
                    <Badge variant="outline">{String(event.event_type)}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No billing events recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage this month</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <UsageStat label="Decks" value={usage?.deck_uploads_this_month ?? 0} />
              <UsageStat label="Financial" value={usage?.financial_model_runs_this_month ?? 0} />
              <UsageStat label="Matches" value={usage?.investor_match_runs_this_month ?? 0} />
              <UsageStat label="Decks ever" value={usage?.total_deck_uploads_ever ?? 0} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" aria-hidden />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Stripe customer" value={p.stripe_customer_id ? "Yes" : "No"} />
              <Row label="Subscription ID" value={p.stripe_subscription_id ? "Set" : "—"} />
              <Row label="Failed payments" value={String(p.failed_payment_count)} />
              {p.lifetime_purchased_at ? (
                <Row
                  label="Lifetime purchased"
                  value={new Date(p.lifetime_purchased_at).toLocaleDateString("en-GB")}
                />
              ) : null}
              {p.plan_cancels_at ? (
                <Row
                  label="Cancels at"
                  value={new Date(p.plan_cancels_at).toLocaleDateString("en-GB")}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <form action={grantFree}>
                  <SubmitButton idleText="Grant Free" pendingText="Granting…" variant="outline" size="sm" />
                </form>
                <form action={grantStarter}>
                  <SubmitButton idleText="Grant Starter" pendingText="Granting…" variant="outline" size="sm" />
                </form>
                <form action={grantPro}>
                  <SubmitButton idleText="Grant Pro" pendingText="Granting…" variant="outline" size="sm" />
                </form>
                <form action={grantLifetime}>
                  <SubmitButton idleText="Grant Lifetime" pendingText="Granting…" variant="outline" size="sm" />
                </form>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <form action={reset}>
                  <SubmitButton idleText="Reset usage" pendingText="Resetting…" variant="outline" size="sm" />
                </form>
                <a
                  href={`/api/admin/users/${id}/export`}
                  className="inline-flex items-center rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Export data
                </a>
                <form action={softDelete}>
                  <SubmitButton idleText="Soft delete" pendingText="Deleting…" variant="destructive" size="sm" />
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Failed jobs ({failedJobs?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {failedJobs?.length ? (
                failedJobs.map((job) => (
                  <div key={String(job.id)} className="rounded-lg border border-border/55 p-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(String(job.created_at)).toLocaleString("en-GB")}
                    </p>
                    <p className="mt-1 line-clamp-4 text-sm">{String(job.error ?? "Unknown error")}</p>
                    <form action={rerunFailedJob.bind(null, String(job.id))} className="mt-2">
                      <SubmitButton idleText="Re-run pipeline" pendingText="Re-running…" size="sm" variant="outline" />
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No failed jobs.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/55 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl font-medium">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
