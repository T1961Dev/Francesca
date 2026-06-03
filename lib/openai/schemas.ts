import { z } from "zod"

const PrioritySchema = z.enum(["high", "medium", "low"])

export const DeckFinancialSignalsSchema = z.object({
  monthlyRevenue: z.number().nullable(),
  monthlyBurn: z.number().nullable(),
  cashBalance: z.number().nullable(),
  runwayMonths: z.number().nullable(),
  raiseAmount: z.number().nullable(),
  customerCount: z.number().nullable(),
  teamSize: z.number().nullable(),
  grossMarginPercent: z.number().nullable(),
  revenueGrowthPercentMonthly: z.number().nullable(),
  notes: z.string().nullable(),
})

export type DeckFinancialSignals = z.infer<typeof DeckFinancialSignalsSchema>

export const DeckAnalysisSchema = z.object({
  summary: z.string(),
  categoryScores: z.array(
    z.object({
      category: z.string(),
      score: z.number().min(0).max(100),
      feedback: z.string(),
    })
  ),
  financialSignals: DeckFinancialSignalsSchema,
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingSections: z.array(z.string()),
  investorReadiness: z.string(),
  suggestedFixes: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      priority: PrioritySchema,
    })
  ),
  priorityActions: z.array(
    z.object({
      action: z.string(),
      reason: z.string(),
      priority: PrioritySchema,
    })
  ),
  fundraisingRisks: z.array(z.string()),
})

export const OutreachStepSchema = z.object({
  step: z.number().int().min(1).max(3),
  label: z.string(),
  subject: z.string(),
  body: z.string(),
  sendAfterDays: z.number().int().min(0),
})

export const OutreachSequenceSchema = z.object({
  steps: z.array(OutreachStepSchema).length(3),
})

export type OutreachSequence = z.infer<typeof OutreachSequenceSchema>

export const FinancialModelInputSchema = z.object({
  companyName: z.string().min(1),
  businessModel: z.string().min(1),
  industry: z.string().min(1),
  currentMonthlyRevenue: z.coerce.number().min(0),
  currentMonthlyBurn: z.coerce.number().min(0),
  currentCashBalance: z.coerce.number().min(0),
  currentRunway: z.coerce.number().min(0),
  raiseAmount: z.coerce.number().min(0),
  monthlyRevenueGrowth: z.coerce.number().min(0).max(100),
  monthlyCostGrowth: z.coerce.number().min(0).max(100),
  grossMargin: z.coerce.number().min(0).max(100),
  churn: z.coerce.number().min(0).max(100),
  currentCustomers: z.coerce.number().min(0),
  targetCustomers: z.coerce.number().min(0),
  averageRevenuePerCustomer: z.coerce.number().min(0),
  teamSize: z.coerce.number().min(0),
  plannedHires: z.coerce.number().min(0),
  fundingGoal: z.string().min(1),
  targetMarket: z.string().min(1),
  notes: z.string().optional(),
})

export const FinancialModelSchema = z.object({
  projection: z.array(
    z.object({
      month: z.number(),
      label: z.string(),
      revenue: z.number(),
      burn: z.number(),
      cashBalance: z.number(),
      runwayMonths: z.number(),
      customers: z.number().nullable(),
    })
  ).length(36),
  breakEvenMonth: z.number().nullable(),
  narrative: z.string(),
  investorSummary: z.string(),
  risks: z.array(z.string()),
  assumptions: z.array(z.string()),
  useOfFunds: z.array(
    z.object({
      category: z.string(),
      amount: z.number(),
      rationale: z.string(),
    })
  ),
})

export const InvestorMatchSchema = z.object({
  matches: z.array(
    z.object({
      investorName: z.string(),
      firmName: z.string(),
      role: z.string(),
      linkedinUrl: z.string().nullable(),
      email: z.string().nullable(),
      website: z.string().nullable(),
      location: z.string().nullable(),
      investmentStage: z.string().nullable(),
      sectorFocus: z.array(z.string()),
      matchScore: z.number().min(0).max(100),
      matchRationale: z.string(),
      whyThisInvestor: z.string(),
      whyNow: z.string(),
      suggestedAngle: z.string(),
      outreachSubject: z.string(),
      outreachBody: z.string(),
    })
  ).max(25),
})
