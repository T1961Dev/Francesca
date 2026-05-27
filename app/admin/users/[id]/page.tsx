import { notFound } from "next/navigation"

import { grantPlan, resetUsage, rerunFailedJob, softDeleteUser } from "@/lib/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!profile) notFound()

  const { data: usage } = await supabase
    .from("user_usage")
    .select("*")
    .eq("user_id", id)
    .maybeSingle()

  const { data: failedJobs } = await supabase
    .from("investor_matching_jobs")
    .select("id, status, error, created_at")
    .eq("user_id", id)
    .eq("status", "failed")
    .order("created_at", { ascending: false })

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
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        {String(profile.email ?? "User")}
      </h1>
      <p className="text-sm text-muted-foreground">
        Plan <Badge>{String(profile.plan)}</Badge> · Subscription {String(profile.subscription_status)} ·
        Customer {profile.stripe_customer_id ? "yes" : "no"}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Decks (month)</p>
            <p>{usage?.deck_uploads_this_month ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Financial (month)</p>
            <p>{usage?.financial_model_runs_this_month ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Matches (month)</p>
            <p>{usage?.investor_match_runs_this_month ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total decks ever</p>
            <p>{usage?.total_deck_uploads_ever ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <form action={grantFree}><Button type="submit" variant="outline" size="sm">Grant Free</Button></form>
          <form action={grantStarter}><Button type="submit" variant="outline" size="sm">Grant Starter</Button></form>
          <form action={grantPro}><Button type="submit" variant="outline" size="sm">Grant Pro</Button></form>
          <form action={grantLifetime}><Button type="submit" variant="outline" size="sm">Grant Lifetime</Button></form>
          <form action={reset}><Button type="submit" variant="outline" size="sm">Reset usage</Button></form>
          <form action={softDelete}><Button type="submit" variant="destructive" size="sm">Soft delete</Button></form>
          <a
            href={`/api/admin/users/${id}/export`}
            className="inline-flex items-center rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-muted"
          >
            Export user data
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failed jobs ({failedJobs?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {failedJobs?.length ? (
            failedJobs.map((job) => (
              <div key={String(job.id)} className="rounded-md border border-border/55 p-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(String(job.created_at)).toLocaleString("en-GB")} · job{" "}
                  {String(job.id).slice(0, 8)}
                </p>
                <p className="mt-1 line-clamp-3">{String(job.error ?? "Unknown error")}</p>
                <form action={rerunFailedJob.bind(null, String(job.id))} className="mt-2">
                  <Button type="submit" size="sm" variant="outline">
                    Re-run pipeline
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No failed jobs.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
