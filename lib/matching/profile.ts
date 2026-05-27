import type { FounderProfile } from "@/types/profile"

type SourceRecord = Record<string, unknown>

export function buildFounderProfile({
  userId,
  deckAnalysisId,
  profile,
  deckAnalysis,
}: {
  userId: string
  deckAnalysisId: string
  profile: SourceRecord
  deckAnalysis: SourceRecord
}): FounderProfile {
  const companyName = pickString(profile, ["company_name"]) ?? "Unknown company"
  const summary = pickString(deckAnalysis, ["summary"]) ?? pickString(profile, ["description"]) ?? ""
  const industry = pickString(profile, ["sector", "industry"]) ?? summary
  const stage = pickString(profile, ["stage", "funding_stage"])

  return {
    userId,
    deckId: deckAnalysisId,
    company: {
      name: companyName,
      oneLiner: summary || companyName,
      sector: normaliseSector(industry),
      subSector: pickString(profile, ["sector", "industry"]) ?? "Software",
      stage: normaliseStage(stage),
      geography: pickString(profile, ["geography", "location"]) ?? "United Kingdom",
      businessModel: normaliseBusinessModel(`${industry} ${summary}`),
    },
    traction: {},
    team: {
      founders: [
        {
          name: pickString(profile, ["full_name"]) ?? "Founder",
          role: pickString(profile, ["role"]) ?? "Founder",
          background: pickString(profile, ["description"]) ?? "",
        },
      ],
    },
    raise: {
      amount: pickNumber(profile, ["target_raise"]) ?? 0,
      use_of_funds: pickUseOfFunds(deckAnalysis),
    },
  }
}

function normaliseSector(value: string): FounderProfile["company"]["sector"] {
  const lower = value.toLowerCase()
  if (lower.includes("education") || lower.includes("edtech") || lower.includes("learning")) return "EdTech"
  if (lower.includes("fintech") || lower.includes("financial")) return "FinTech"
  if (lower.includes("health") || lower.includes("biotech")) return "HealthTech"
  if (lower.includes("ai") || lower.includes("artificial intelligence")) return "AI"
  if (lower.includes("saas") || lower.includes("software")) return "SaaS"
  if (lower.includes("marketplace")) return "SaaS"
  if (lower.includes("climate")) return "Other"
  if (lower.includes("deeptech") || lower.includes("deep tech")) return "AI"
  return "Other"
}

function normaliseStage(value: string | null): FounderProfile["company"]["stage"] {
  const lower = value?.toLowerCase().replace(/_/g, "-") ?? ""
  if (lower.includes("series-a") || lower.includes("series a")) return "series-a"
  if (lower.includes("pre-seed") || lower.includes("preseed")) return "pre-seed"
  return "seed"
}

function normaliseBusinessModel(value: string): FounderProfile["company"]["businessModel"] {
  const lower = value.toLowerCase()
  if (lower.includes("marketplace")) return "marketplace"
  if (lower.includes("b2b2c")) return "b2b2c"
  if (lower.includes("consumer") || lower.includes("b2c")) return "b2c"
  return "b2b-saas"
}

function pickUseOfFunds(deckAnalysis: SourceRecord) {
  const actions = deckAnalysis.priority_actions
  if (!Array.isArray(actions)) return []

  return actions
    .map((action) => {
      if (!action || typeof action !== "object") return null
      return pickString(action as SourceRecord, ["action", "reason"])
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 5)
}

function pickString(item: SourceRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function pickNumber(item: SourceRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}
