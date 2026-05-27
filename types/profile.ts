export type FounderProfile = {
  userId: string
  deckId: string
  company: {
    name: string
    oneLiner: string
    sector: "EdTech" | "FinTech" | "SaaS" | "HealthTech" | "AI" | "Other"
    subSector: string
    stage: "pre-seed" | "seed" | "series-a"
    geography: string
    businessModel: "b2b-saas" | "b2c" | "marketplace" | "b2b2c"
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
  recentLinkedInSignals: Array<{
    postText: string
    postedAt: string
    relevance: "high" | "medium" | "low"
  }>
  outreachEmail: {
    subject: string
    body: string
  }
  limitedData?: boolean
}
