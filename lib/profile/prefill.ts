import { CURRENCY_LABEL, STAGE_LABEL, type Stage } from "@/lib/onboarding"
import type { Database } from "@/types/database"

export type ProfileLike = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "full_name"
  | "company_name"
  | "website"
  | "role"
  | "industry"
  | "sector"
  | "stage"
  | "location"
  | "geography"
  | "funding_stage"
  | "target_raise"
  | "target_raise_currency"
  | "description"
>

/** Keep canonical onboarding columns and legacy settings aliases in sync. */
export function mirrorProfileFields<T extends Record<string, unknown>>(
  update: T
): T & Record<string, unknown> {
  const next: Record<string, unknown> = { ...update }

  const sector = pickString(next.sector) || pickString(next.industry)
  if (sector) {
    next.sector = sector
    next.industry = sector
  }

  const geography = pickString(next.geography) || pickString(next.location)
  if (geography) {
    next.geography = geography
    next.location = geography
  }

  const stage = pickString(next.stage) || pickString(next.funding_stage)
  if (stage) {
    next.stage = stage
    next.funding_stage = stage
  }

  return next as T & Record<string, unknown>
}

export function getProfileFieldValue(
  profile: ProfileLike | Record<string, unknown> | null | undefined,
  field: string
): string {
  const row = profile as ProfileLike | null | undefined
  if (!row) return ""

  switch (field) {
    case "full_name":
      return pickString(row.full_name)
    case "company_name":
      return pickString(row.company_name)
    case "website":
      return pickString(row.website)
    case "role":
      return pickString(row.role)
    case "industry":
    case "sector":
      return pickString(row.sector) || pickString(row.industry)
    case "stage":
    case "funding_stage":
      return pickString(row.stage) || pickString(row.funding_stage)
    case "location":
    case "geography":
      return pickString(row.geography) || pickString(row.location)
    case "target_raise":
      return typeof row.target_raise === "number" && row.target_raise > 0
        ? String(row.target_raise)
        : ""
    case "target_raise_currency":
      return pickString(row.target_raise_currency) || "gbp"
    case "description":
      return pickString(row.description)
    default:
      return pickString((row as Record<string, unknown>)[field])
  }
}

function formatStageLabel(raw: string): string {
  if (!raw) return ""
  if (raw in STAGE_LABEL) return STAGE_LABEL[raw as Stage]
  return raw.replace(/_/g, " ")
}

function pickString(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function formatFundingGoal(profile: ProfileLike): string {
  const amount = profile.target_raise
  if (typeof amount !== "number" || amount <= 0) return ""

  const currency = pickString(profile.target_raise_currency) || "gbp"
  const currencyKey = currency as keyof typeof CURRENCY_LABEL
  const prefix =
    currencyKey in CURRENCY_LABEL
      ? CURRENCY_LABEL[currencyKey].split(" ")[1] ?? "£"
      : "£"
  const stageRaw = pickString(profile.stage) || pickString(profile.funding_stage)
  const stageLabel = stageRaw ? formatStageLabel(stageRaw).toLowerCase() : ""
  const formattedAmount = amount.toLocaleString("en-GB", { maximumFractionDigits: 0 })

  if (stageLabel) return `${prefix}${formattedAmount} ${stageLabel} round`
  return `${prefix}${formattedAmount} raise`
}

/** Defaults for the multi-step financial model wizard (user can edit). */
export function buildFinancialModelPrefill(
  profile: ProfileLike | null | undefined
): Record<string, string> {
  if (!profile) return {}

  const values: Record<string, string> = {}
  const company = pickString(profile.company_name)
  if (company) values.companyName = company

  const industry = pickString(profile.sector) || pickString(profile.industry)
  if (industry) values.industry = industry

  const market = pickString(profile.geography) || pickString(profile.location)
  if (market) values.targetMarket = market

  const fundingGoal = formatFundingGoal(profile)
  if (fundingGoal) values.fundingGoal = fundingGoal

  if (typeof profile.target_raise === "number" && profile.target_raise > 0) {
    values.raiseAmount = String(profile.target_raise)
  }

  const description = pickString(profile.description)
  if (description) values.businessModel = description

  return values
}
