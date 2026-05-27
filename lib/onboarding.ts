import type { Database } from "@/types/database"

export const SECTORS = [
  "SaaS",
  "FinTech",
  "EdTech",
  "HealthTech",
  "AI",
  "Marketplace",
  "Consumer",
  "DeepTech",
  "Climate",
  "Other",
] as const

export type Sector = (typeof SECTORS)[number]

export const STAGES = ["pre_seed", "seed", "series_a"] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  pre_seed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
}

export const CURRENCIES = ["gbp", "eur", "usd"] as const
export type OnboardingCurrency = (typeof CURRENCIES)[number]

export const CURRENCY_LABEL: Record<OnboardingCurrency, string> = {
  gbp: "GBP £",
  eur: "EUR €",
  usd: "USD $",
}

export const COUNTRIES: { value: string; label: string }[] = [
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Ireland", label: "Ireland" },
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Spain", label: "Spain" },
  { value: "Italy", label: "Italy" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Sweden", label: "Sweden" },
  { value: "Singapore", label: "Singapore" },
  { value: "Australia", label: "Australia" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "Worldwide", label: "Worldwide" },
]

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

/**
 * A user is "onboarded" only when all 5 fields are populated. We treat
 * legacy users (signed up before onboarding shipped) the same way: if all
 * fields are present from Settings, treat as complete; otherwise force them
 * through onboarding once.
 */
export function isOnboardingComplete(profile: Pick<
  Profile,
  "company_name" | "sector" | "stage" | "target_raise" | "target_raise_currency" | "geography" | "industry" | "funding_stage" | "location"
> | null | undefined): boolean {
  if (!profile) return false

  const company = profile.company_name?.toString().trim()
  const sector = (profile.sector ?? profile.industry)?.toString().trim()
  const stage = (profile.stage ?? profile.funding_stage)?.toString().trim()
  const raise = profile.target_raise
  const currency = profile.target_raise_currency?.toString().trim()
  const geography = (profile.geography ?? profile.location)?.toString().trim()

  return Boolean(
    company &&
      sector &&
      stage &&
      typeof raise === "number" &&
      raise > 0 &&
      currency &&
      geography
  )
}
