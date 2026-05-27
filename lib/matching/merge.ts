import type { CrunchbaseCompany, JohnVCFirm } from "@/types/apify"

export type MergedFirm = JohnVCFirm & {
  recentDealCount: number
  recentDealCompanies: Array<{ name: string; stage?: string; date?: string }>
}

export function mergeInvestors(
  crunchbase: CrunchbaseCompany[],
  firms: JohnVCFirm[]
): MergedFirm[] {
  const dealMap = new Map<string, MergedFirm["recentDealCompanies"]>()

  for (const company of crunchbase) {
    for (const investor of company.investors ?? []) {
      const key = normaliseFirmName(investor.name)
      if (!key) continue
      const deals = dealMap.get(key) ?? []
      deals.push({
        name: company.name,
        stage: company.latest_funding_round,
        date: company.latest_funding_date,
      })
      dealMap.set(key, deals)
    }
  }

  return firms.map((rawFirm) => {
    const firm = normaliseJohnVCFirm(rawFirm as unknown as Record<string, unknown>)
    const deals = dealMap.get(normaliseFirmName(firm.Firm_Name)) ?? []
    return {
      ...firm,
      recentDealCount: deals.length,
      recentDealCompanies: deals.slice(0, 10),
    }
  })
}

function normaliseJohnVCFirm(item: Record<string, unknown>): JohnVCFirm {
  const firmName = pickString(item, [
    "Firm_Name",
    "firm_name",
    "Firm Name",
    "name",
    "Name",
    "company",
    "organization",
  ]) ?? "Unknown firm"
  const firmLinkedIn = pickString(item, ["LinkedIn", "linkedin", "linkedin_url", "linkedinUrl"])
  const website = pickString(item, ["Website", "website", "url", "firm_website"])
  const contacts = normaliseContacts(item, firmName, firmLinkedIn)

  return {
    Firm_Name: firmName,
    Firm_Type: pickString(item, ["Firm_Type", "firm_type", "Firm Type", "type"]) ?? "Venture Capital Investor",
    Country: pickString(item, ["Country", "country", "Location", "location"]) ?? "",
    Website: website ?? undefined,
    LinkedIn: firmLinkedIn ?? undefined,
    Focus_Areas: pickStringArray(item, ["Focus_Areas", "focus_areas", "Focus Areas", "focusAreas"]),
    Investment_Stages: pickStringArray(item, [
      "Investment_Stages",
      "investment_stages",
      "Investment Stages",
      "investmentStages",
      "stages",
    ]),
    Description: pickString(item, ["Description", "description", "Bio", "bio"]) ?? undefined,
    Contacts: contacts,
  }
}

function normaliseContacts(
  item: Record<string, unknown>,
  firmName: string,
  firmLinkedIn: string | null
): JohnVCFirm["Contacts"] {
  const rawContacts = [
    item.Contacts,
    item.contacts,
    item.Contact,
    item.contact,
    item.people,
    item.partners,
  ].find(Array.isArray) as Record<string, unknown>[] | undefined

  const contacts = (rawContacts ?? []).map((contact) => ({
    Name: pickString(contact, ["Name", "name", "Full_Name", "full_name", "Partner_Name", "partner_name"]) ?? firmName,
    Title: pickString(contact, ["Title", "title", "Role", "role", "Position", "position"]) ?? "Investor",
    Email: pickString(contact, ["Email", "email", "work_email"]) ?? undefined,
    LinkedIn: pickString(contact, ["LinkedIn", "linkedin", "linkedin_url", "linkedinUrl"]) ?? undefined,
  }))

  if (contacts.length) return contacts

  const directContactName = pickString(item, ["Contact_Name", "contact_name", "Partner_Name", "partner_name"])
  const directEmail = pickString(item, ["Email", "email", "Contact_Email", "contact_email"])
  const directLinkedIn = pickString(item, [
    "Contact_LinkedIn",
    "contact_linkedin",
    "Partner_LinkedIn",
    "partner_linkedin",
    "LinkedIn",
    "linkedin",
    "linkedin_url",
  ])

  if (directContactName || directEmail || directLinkedIn || firmLinkedIn) {
    return [{
      Name: directContactName ?? firmName,
      Title: pickString(item, ["Title", "title", "Contact_Title", "contact_title"]) ?? "Investor",
      Email: directEmail ?? undefined,
      LinkedIn: directLinkedIn ?? firmLinkedIn ?? undefined,
    }]
  }

  return []
}

function normaliseFirmName(name: string | null | undefined) {
  if (!name) return ""

  return name
    .toLowerCase()
    .replace(/\b(ltd|llp|llc|inc|capital|ventures?|partners?|fund|management)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

function pickString(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function pickStringArray(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]
    if (Array.isArray(value)) {
      return value.map(String).map((entry) => entry.trim()).filter(Boolean)
    }
    if (typeof value === "string" && value.trim()) {
      return value.split(/[,;|]/).map((entry) => entry.trim()).filter(Boolean)
    }
  }
  return []
}
