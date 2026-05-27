import type { JohnVCFirm, LeadsFinderContact } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"

export function groupLeadsIntoFirms(
  leads: LeadsFinderContact[],
  profile: FounderProfile
): JohnVCFirm[] {
  const stages = inferInvestmentStages(profile.company.stage)
  const byFirm = new Map<string, JohnVCFirm>()

  for (const lead of leads) {
    const firmName = lead.company_name?.trim()
    const email = lead.email?.trim()
    if (!firmName || !email) continue

    const key = normaliseFirmName(firmName)
    if (!key) continue

    const contact = {
      Name: lead.full_name?.trim() || [lead.first_name, lead.last_name].filter(Boolean).join(" ") || firmName,
      Title: lead.job_title?.trim() || "Investor",
      Email: email,
      LinkedIn: lead.linkedin?.trim() || undefined,
    }

    const existing = byFirm.get(key)
    if (existing) {
      if (!hasContact(existing.Contacts, contact)) {
        existing.Contacts.push(contact)
      }
      continue
    }

    const focusAreas = [
      lead.industry,
      ...(Array.isArray(lead.keywords) ? lead.keywords : lead.keywords ? [lead.keywords] : []),
    ]
      .map((value) => String(value).trim())
      .filter(Boolean)

    byFirm.set(key, {
      Firm_Name: firmName,
      Firm_Type: "Venture Capital Investor",
      Country: lead.company_country?.trim() || lead.country?.trim() || "",
      Website: lead.company_website?.trim() || undefined,
      LinkedIn: lead.company_linkedin?.trim() || undefined,
      Focus_Areas: [...new Set(focusAreas)],
      Investment_Stages: stages,
      Description: lead.company_description?.trim() || undefined,
      Contacts: [contact],
    })
  }

  return [...byFirm.values()]
}

function hasContact(
  contacts: JohnVCFirm["Contacts"],
  next: JohnVCFirm["Contacts"][number]
) {
  return contacts.some((contact) => {
    if (next.Email && contact.Email === next.Email) return true
    if (next.LinkedIn && contact.LinkedIn === next.LinkedIn) return true
    return contact.Name === next.Name
  })
}

function inferInvestmentStages(stage: FounderProfile["company"]["stage"]): string[] {
  if (stage === "pre-seed") return ["Pre-Seed", "Seed"]
  if (stage === "seed") return ["Seed", "Series A"]
  return ["Series A", "Series B"]
}

function normaliseFirmName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(ltd|llp|llc|inc|capital|ventures?|partners?|fund|management)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}
