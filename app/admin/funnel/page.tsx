import { FunnelVisual } from "@/components/admin/funnel-visual"
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
    { label: "Signed up", value: signupCount, description: "New accounts created" },
    { label: "Completed onboarding", value: onboardedCount, description: "Profile and company details filled" },
    { label: "Uploaded deck", value: usersWithDeck, description: "At least one deck analysis started" },
    { label: "Saw score", value: usersWithScore, description: "Deck analysis completed" },
    { label: "Saw paywall", value: dismissed, description: "Dismissed upgrade prompt" },
    { label: "Upgraded", value: upgraded, description: "Starter, Pro, or Lifetime plan" },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Funnel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Signup to upgrade journey · last 30 days</p>
      </div>
      <FunnelVisual steps={steps} signupCount={signupCount} />
    </div>
  )
}
