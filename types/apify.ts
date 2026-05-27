export type NormalisedInvestorCandidate = {
  investor_name: string
  firm_name: string | null
  role: string | null
  linkedin_url: string | null
  email: string | null
  website: string | null
  location: string | null
  bio: string | null
  investment_stage: string | null
  sector_focus: string[]
  source_url: string | null
  raw_source: Record<string, unknown>
  confidence: number
}

export type InvestorMatchingStatus =
  | "pending"
  | "crunchbase_running"
  | "enriching"
  | "linkedin_running"
  | "ranking"
  | "discovery"
  | "activity_signals"
  | "processing"
  | "scraping"
  | "scoring"
  | "completed"
  | "failed"
  | "cancelled"

export type CrunchbaseCompany = {
  name: string
  description?: string
  website?: string
  linkedin_url?: string
  headquarters?: string
  founded_date?: string
  total_funding_amount?: number
  latest_funding_round?: string
  latest_funding_date?: string
  investors?: Array<{ name: string; type?: string; lead?: boolean }>
}

export type JohnVCFirm = {
  Firm_Name: string
  Firm_Type: string
  Country: string
  Website?: string
  LinkedIn?: string
  Focus_Areas: string[]
  Investment_Stages: string[]
  Description?: string
  Contacts: Array<{
    Name: string
    Title: string
    Email?: string
    LinkedIn?: string
  }>
}

export type LeadsFinderContact = {
  first_name?: string
  last_name?: string
  full_name?: string
  job_title?: string
  email?: string
  linkedin?: string
  country?: string
  company_name?: string
  company_domain?: string
  company_website?: string
  company_linkedin?: string
  company_country?: string
  industry?: string
  company_description?: string
  keywords?: string | string[]
}

export type LinkedInPost = {
  profileUrl: string
  postText: string
  postedAt: string
  postUrl?: string
}
