import { BillingSummary } from "@/components/settings/billing-summary"
import { DangerZone } from "@/components/settings/danger-zone"
import { ProfileForm } from "@/components/settings/profile-form"
import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import { ensureProfile, getProfile } from "@/lib/auth"
import type { Plan } from "@/types/app"

function queryParam(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) return undefined
  const s = Array.isArray(value) ? value[0] : value
  return s
}

function safeDecodeURIComponent(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  await ensureProfile()
  const profile = await getProfile()

  const savedRaw = queryParam(params.saved)
  const errorRaw = queryParam(params.error)

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 md:p-6">
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update profile, company, and funding details.
        </p>
      </div>
      <FeaturePhotoCard
        eyebrow="Profile"
        title={
          <>
            Keep the founder profile sounding like <FeatureEm>you.</FeatureEm>
          </>
        }
        description="Your saved profile powers deck analysis, models, and investor matching context across the app."
      />
      <ProfileForm
        profile={profile}
        saved={savedRaw === "1"}
        errorMessage={
          errorRaw ? safeDecodeURIComponent(errorRaw) : undefined
        }
      />
      <BillingSummary
        plan={(profile?.plan as Plan | undefined) ?? "free"}
        hasCustomer={Boolean(profile?.stripe_customer_id)}
        subscriptionStatus={profile?.subscription_status ?? null}
        cancelsAt={profile?.plan_cancels_at ?? null}
      />
      <DangerZone />
    </main>
  )
}
