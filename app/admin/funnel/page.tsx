import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { isOnboardingComplete } from "@/lib/onboarding"

function isoDaysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

export default async function AdminFunnelPage() {
  const supabase = createAdminClient()
  const since = isoDaysAgo(30)

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, plan, paywall_dismissed_at, created_at, company_name, sector, stage, target_raise, target_raise_currency, geography, industry, funding_stage, location")
    .gte("created_at", since)

  const { data: analyses } = await supabase
    .from("deck_analyses")
    .select("user_id, status")
    .gte("created_at", since)

  const signupCount = profiles?.length ?? 0
  const onboardedCount = (profiles ?? []).filter((p) => isOnboardingComplete(p)).length
  const usersWithDeck = new Set((analyses ?? []).map((a) => String(a.user_id))).size
  const usersWithScore = new Set(
    (analyses ?? []).filter((a) => a.status === "completed").map((a) => String(a.user_id))
  ).size
  const dismissed = (profiles ?? []).filter((p) => Boolean(p.paywall_dismissed_at)).length
  const upgraded = (profiles ?? []).filter((p) => p.plan !== "free").length

  const steps = [
    { label: "Signed up", value: signupCount },
    { label: "Completed onboarding", value: onboardedCount },
    { label: "Uploaded deck", value: usersWithDeck },
    { label: "Saw score", value: usersWithScore },
    { label: "Saw paywall", value: dismissed },
    { label: "Upgraded", value: upgraded },
  ]
  const max = Math.max(...steps.map((s) => s.value), 1)

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Funnel (last 30 days)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Conversion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {steps.map((step, index) => {
            const pct = signupCount > 0 ? Math.round((step.value / signupCount) * 100) : 0
            const width = Math.max(2, Math.round((step.value / max) * 100))
            return (
              <div key={step.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>
                    {index + 1}. {step.label}
                  </span>
                  <span className="text-muted-foreground">
                    {step.value} · {pct}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-sm bg-secondary">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
