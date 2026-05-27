import type { MergedFirm } from "@/lib/matching/merge"
import type { EnrichedInvestorCandidate } from "@/types/matching-v2"
import type { FounderProfile } from "@/types/profile"

function inferStages(stage: FounderProfile["company"]["stage"]): string[] {
  if (stage === "pre-seed") return ["Pre-Seed", "Seed"]
  if (stage === "seed") return ["Seed", "Series A"]
  return ["Series A", "Series B"]
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return undefined
}

/**
 * Convert v2 enriched people into MergedFirm[] for the existing ranker.
 */
export function enrichedCandidatesToFirms(
  candidates: EnrichedInvestorCandidate[],
  profile: FounderProfile
): MergedFirm[] {
  const stages = inferStages(profile.company.stage)
  const byFirm = new Map<string, MergedFirm>()

  for (const { lead, linkedInProfile } of candidates) {
    const firmName = lead.company_name?.trim()
    const email = lead.email?.trim()
    if (!firmName || !email) continue

    const key = firmName.toLowerCase().replace(/[^a-z0-9]/g, "")
    const profileRecord = linkedInProfile ?? {}
    const headline = pickString(profileRecord, ["headline", "Headline", "tagline"])
    const summary = pickString(profileRecord, ["summary", "about", "description"])

    const focusFromLead = [
      lead.industry,
      ...(Array.isArray(lead.keywords) ? lead.keywords : lead.keywords ? [lead.keywords] : []),
    ]
      .map(String)
      .filter(Boolean)

    const focusFromProfile = headline ? [headline] : summary ? [summary.slice(0, 120)] : []

    const contact = {
      Name:
        lead.full_name?.trim() ||
        [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
        firmName,
      Title: lead.job_title?.trim() || headline || "Investor",
      Email: email,
      LinkedIn: lead.linkedin?.trim() || undefined,
    }

    const existing = byFirm.get(key)
    if (existing) {
      const dup = existing.Contacts.some(
        (c) => c.Email === contact.Email || (c.LinkedIn && c.LinkedIn === contact.LinkedIn)
      )
      if (!dup) existing.Contacts.push(contact)
      continue
    }

    byFirm.set(key, {
      Firm_Name: firmName,
      Firm_Type: "Venture Capital Investor",
      Country: lead.company_country?.trim() || lead.country?.trim() || "",
      Website: lead.company_website?.trim() || undefined,
      LinkedIn: lead.company_linkedin?.trim() || undefined,
      Focus_Areas: [...new Set([...focusFromLead, ...focusFromProfile])].slice(0, 8),
      Investment_Stages: stages,
      Description: lead.company_description?.trim() || summary || undefined,
      Contacts: [contact],
      recentDealCount: 0,
      recentDealCompanies: [],
    })
  }

  return [...byFirm.values()]
}
