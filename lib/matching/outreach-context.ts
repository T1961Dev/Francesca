import type { CrunchbaseCompany, LeadsFinderContact, LinkedInPost } from "@/types/apify"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

export type OutreachApifyContext = {
  lead?: Record<string, unknown>
  crunchbaseFirm?: Record<string, unknown>
  linkedinPosts?: Array<{ text: string; date: string; url?: string }>
}

export function buildOutreachApifyContext({
  match,
  rawLeads = [],
  crunchbaseResults = [],
  linkedinPosts = [],
}: {
  match: Omit<InvestorMatch, "rank" | "outreachEmail">
  rawLeads?: LeadsFinderContact[]
  crunchbaseResults?: CrunchbaseCompany[]
  linkedinPosts?: LinkedInPost[]
}): OutreachApifyContext {
  const partnerEmail = match.partner.email?.toLowerCase().trim()
  const partnerLinkedIn = normaliseUrl(match.partner.linkedin)
  const firmName = match.firm.name.toLowerCase().trim()
  const firmWebsite = match.firm.website?.toLowerCase().trim()

  const lead = rawLeads.find((item) => {
    const email = item.email?.toLowerCase().trim()
    const linkedin = normaliseUrl(item.linkedin)
    if (partnerEmail && email === partnerEmail) return true
    if (partnerLinkedIn && linkedin && linkedin === partnerLinkedIn) return true
    const leadFirm = item.company_name?.toLowerCase().trim()
    const leadName = item.full_name?.toLowerCase().trim()
    const partnerName = match.partner.name.toLowerCase().trim()
    return leadFirm === firmName && leadName === partnerName
  })

  const crunchbaseFirm = crunchbaseResults.find((company) => {
    const investors = company.investors ?? []
    return investors.some((investor) => investor.name.toLowerCase().includes(firmName.split(" ")[0] ?? firmName))
  })

  const firmDomain = firmWebsite?.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  const crunchbaseByDomain = firmDomain
    ? crunchbaseResults.find((company) => company.website?.toLowerCase().includes(firmDomain))
    : undefined

  const posts = linkedinPosts
    .filter((post) => normaliseUrl(post.profileUrl) === partnerLinkedIn)
    .slice(0, 5)
    .map((post) => ({
      text: post.postText,
      date: post.postedAt,
      url: post.postUrl,
    }))

  return {
    lead: lead ? sanitiseLead(lead) : undefined,
    crunchbaseFirm: sanitiseCrunchbase(crunchbaseFirm ?? crunchbaseByDomain),
    linkedinPosts: posts.length ? posts : undefined,
  }
}

export function buildOutreachApifyContextFromStored(
  stored: Record<string, unknown>,
  rawApify: unknown
): OutreachApifyContext {
  const raw = asRecord(rawApify)
  const rawLeads = Array.isArray(raw.leadsFinderContacts)
    ? (raw.leadsFinderContacts as LeadsFinderContact[])
    : []
  const crunchbaseResults = Array.isArray(raw.crunchbaseCompanies)
    ? (raw.crunchbaseCompanies as CrunchbaseCompany[])
    : []
  const linkedinPosts = Array.isArray(raw.linkedinPosts)
    ? (raw.linkedinPosts as LinkedInPost[])
    : []

  return buildOutreachApifyContext({
    match: storedMatchToOutreachInput(stored),
    rawLeads,
    crunchbaseResults,
    linkedinPosts,
  })
}

export function storedMatchToOutreachInput(
  stored: Record<string, unknown>
): Omit<InvestorMatch, "rank" | "outreachEmail"> {
  const firm = asRecord(stored.firm)
  const partner = asRecord(stored.partner)

  return {
    fitScore: Number(stored.fitScore ?? stored.matchScore ?? 0),
    firm: {
      name: String(stored.firmName ?? firm.name ?? "Unknown firm"),
      website: pickOptionalString(stored.website ?? firm.website),
      linkedin: pickOptionalString(firm.linkedin),
      type: String(firm.type ?? "Venture Capital Investor"),
      country: String(stored.location ?? firm.country ?? ""),
      focusAreas: pickStringArray(stored.sectorFocus ?? firm.focusAreas),
      investmentStages: pickStringArray(stored.investmentStages ?? firm.investmentStages),
      recentInvestments: Array.isArray(firm.recentInvestments)
        ? (firm.recentInvestments as InvestorMatch["firm"]["recentInvestments"])
        : [],
    },
    partner: {
      name: String(stored.investorName ?? partner.name ?? "Unknown investor"),
      title: String(stored.role ?? partner.title ?? "Investor"),
      email: pickOptionalString(stored.email ?? partner.email),
      linkedin: String(stored.linkedinUrl ?? partner.linkedin ?? ""),
    },
    matchRationale: String(stored.matchRationale ?? stored.whyThisInvestor ?? ""),
    recentLinkedInSignals: Array.isArray(stored.recentLinkedInSignals)
      ? (stored.recentLinkedInSignals as InvestorMatch["recentLinkedInSignals"])
      : [],
    limitedData: Boolean(stored.limitedData),
  }
}

export function buildOutreachPromptPayload({
  profile,
  match,
  apifyContext,
  improvements,
  currentDraft,
}: {
  profile: FounderProfile
  match: Omit<InvestorMatch, "rank" | "outreachEmail">
  apifyContext?: OutreachApifyContext
  improvements?: string
  currentDraft?: { subject: string; body: string }
}) {
  const signals = profile.deckSignals
  return {
    founder: {
      company: {
        name: profile.company.name,
        oneLiner: profile.company.oneLiner,
        sector: profile.company.sectorRaw || profile.company.sector,
        subSector: profile.company.subSector,
        businessModel: profile.company.businessModelRaw,
        stage: profile.company.stage,
        geography: profile.company.geography,
      },
      traction: profile.traction,
      raise: profile.raise,
      team: profile.team,
      deck: signals
        ? {
            summary: signals.summary,
            topStrengths: signals.strengths.slice(0, 3),
            keywords: signals.keywords,
          }
        : null,
    },
    investor: {
      fitScore: match.fitScore,
      firm: match.firm,
      partner: match.partner,
      matchRationale: match.matchRationale,
      recentLinkedInSignals: match.recentLinkedInSignals,
      limitedData: match.limitedData ?? false,
    },
    apifySignals: apifyContext ?? {},
    currentDraft: currentDraft ?? null,
    improvements: improvements?.trim() || null,
  }
}

function sanitiseLead(lead: LeadsFinderContact) {
  return {
    fullName: lead.full_name,
    jobTitle: lead.job_title,
    email: lead.email,
    linkedin: lead.linkedin,
    country: lead.country,
    companyName: lead.company_name,
    companyWebsite: lead.company_website,
    companyLinkedIn: lead.company_linkedin,
    companyCountry: lead.company_country,
    industry: lead.industry,
    companyDescription: lead.company_description,
    keywords: lead.keywords,
  }
}

function sanitiseCrunchbase(company?: CrunchbaseCompany) {
  if (!company) return undefined

  return {
    name: company.name,
    description: company.description,
    website: company.website,
    headquarters: company.headquarters,
    latestFundingRound: company.latest_funding_round,
    latestFundingDate: company.latest_funding_date,
    totalFundingAmount: company.total_funding_amount,
    investors: company.investors?.slice(0, 8),
  }
}

function normaliseUrl(value?: string | null) {
  if (!value?.trim()) return null
  return value.trim().toLowerCase().replace(/\/+$/, "")
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function pickOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function pickStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean)
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;|/]+/).map((item) => item.trim()).filter(Boolean)
  }
  return []
}
