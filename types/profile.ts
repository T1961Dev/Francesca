import type { FounderFinancialContext } from "@/lib/matching/founder-financial-context"

export type DeckSignals = {
  overallScore: number | null
  summary: string
  categoryScores: Array<{ category: string; score: number; feedback?: string }>
  financialSignals?: Record<string, unknown> | null
  strengths: string[]
  weaknesses: string[]
  missingSections: string[]
  priorityActions: string[]
  fundraisingRisks: string[]
  investorReadiness: string | null
  keywords: string[]
}

export type FounderProfile = {
  userId: string
  deckId: string
  company: {
    name: string
    oneLiner: string
    /** Lossy enum bucket kept for backwards-compat filtering. */
    sector: "EdTech" | "FinTech" | "SaaS" | "HealthTech" | "AI" | "Other"
    /** Lossy enum bucket kept for backwards-compat filtering. */
    businessModel: "b2b-saas" | "b2c" | "marketplace" | "b2b2c"
    /** Free-text sector the user actually typed, never bucketed. */
    sectorRaw: string
    /** Free-text sub-sector / industry the user actually typed. */
    subSector: string
    /** Free-text business model description (raw, never bucketed). */
    businessModelRaw: string
    stage: "pre-seed" | "seed" | "series-a"
    geography: string
  }
  traction: {
    mrr?: number
    users?: number
    growthRate?: number
    customers?: number
  }
  team: {
    founders: Array<{ name: string; role: string; background: string }>
  }
  raise: {
    amount: number
    use_of_funds: string[]
  }
  deckSignals?: DeckSignals
  /** Latest saved financial model — CFO loop for rank + outreach. */
  financialContext?: FounderFinancialContext | null
}

export type InvestorMatch = {
  rank: number
  fitScore: number
  firm: {
    name: string
    website?: string
    linkedin?: string
    type: string
    country: string
    focusAreas: string[]
    investmentStages: string[]
    recentInvestments: Array<{
      company: string
      stage: string
      amount?: string
      announcedDate: string
    }>
  }
  partner: {
    name: string
    title: string
    email?: string
    linkedin: string
  }
  matchRationale: string
  chequeFit?: "Strong" | "Partial" | "Weak" | "Unknown"
  chequeSize?: string
  fitBreakdown?: {
    sectorFit: number
    stageFit: number
    geographyFit: number
    chequeFit: number
    businessModelFit: number
    tractionFit: number
    evidenceQuality: number
  }
  rationaleComponents?: {
    startupFact: string
    investorEvidence: string
    fitReason: string
    caveat: string
    confidence: string
  }
  recentLinkedInSignals: Array<{
    postText: string
    postedAt: string
    relevance: "high" | "medium" | "low"
  }>
  outreachEmail: {
    subject: string
    body: string
  }
  outreachSequence?: {
    steps: Array<{
      step: number
      label: string
      subject: string
      body: string
      sendAfterDays: number
    }>
  }
  limitedData?: boolean
}
