import { z } from "zod"

export const FactStatusSchema = z.enum([
  "verified",
  "founder-provided",
  "calculated",
  "inferred",
  "missing",
  "conflicting",
])

export const FactItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  status: FactStatusSchema,
  source: z.string().optional(),
  notes: z.string().optional(),
})

export const DisclosureItemSchema = z.object({
  item: z.string(),
  reason: z.string().optional(),
})

export const FactConfirmationSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  status: FactStatusSchema,
  critical: z.boolean(),
  founderDecision: z
    .enum(["pending", "approved", "edited", "do_not_use"])
    .optional(),
  editedValue: z.string().optional(),
})

export const RaiseBriefStrategySchema = z.object({
  facts: z.array(FactItemSchema).min(5),
  primary_investment_angle: z.string().min(1),
  why_this_angle_wins: z.string().min(1),
  supporting_evidence: z.array(z.string()).min(1).max(6),
  weak_or_distracting_angles_to_avoid: z.array(z.string()).max(6),
  recommended_outreach_angle: z.string().min(1),
  investor_fit_summary: z.string(),
  strongest_fit_signals: z.array(z.string()).max(6),
  possible_misalignments: z.array(z.string()).max(6),
  disclosure_strategy: z.object({
    reveal: z.array(DisclosureItemSchema).min(2),
    reveal_partially: z.array(DisclosureItemSchema).min(1),
    preserve_for_meeting: z.array(DisclosureItemSchema).min(2),
  }),
  credibility_strength: z.number().min(0).max(100),
  curiosity_strength: z.number().min(0).max(100),
  overall_confidence: z.number().min(0).max(100),
  facts_requiring_founder_confirmation: z.array(FactConfirmationSchema),
  missing_critical_information: z.array(z.string()),
  conflicting_information: z.array(z.string()),
})

export type RaiseBriefStrategy = z.infer<typeof RaiseBriefStrategySchema>

export const FinancialSnapshotItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  type: z.enum(["current", "historical", "projected"]),
  source: z.string(),
})

export const RaiseBriefContentSchema = z.object({
  company_name: z.string(),
  company_category: z.string(),
  headline: z.string().max(120),
  transaction_overview: z.object({
    round_stage: z.string(),
    raise_target: z.string(),
    use_of_funds: z.string(),
    target_milestone: z.string(),
  }),
  investment_highlights: z.array(z.string()).min(3).max(5),
  market: z.string(),
  financial_snapshot: z.array(FinancialSnapshotItemSchema).min(1).max(4),
  company_context: z.string(),
  team_credibility: z.string(),
  next_step: z.string(),
})

export const RaiseBriefEmailSchema = z.object({
  subject_options: z.array(z.string()).min(3).max(3),
  recommended_subject: z.string(),
  primary_email: z.string(),
  short_email: z.string(),
  follow_up_email: z.string(),
  personalisation_sentence: z.string(),
  recommended_cta: z.string(),
})

export const QualityScoresSchema = z.object({
  investor_relevance: z.number().min(0).max(100),
  credibility: z.number().min(0).max(100),
  curiosity: z.number().min(0).max(100),
  specificity: z.number().min(0).max(100),
  numerical_substance: z.number().min(0).max(100),
  narrative_consistency: z.number().min(0).max(100),
  investor_fit: z.number().min(0).max(100),
  information_discipline: z.number().min(0).max(100),
  human_tone: z.number().min(0).max(100),
  meeting_conversion_potential: z.number().min(0).max(100),
})

export const RaiseBriefProductionSchema = z.object({
  raise_brief: RaiseBriefContentSchema,
  email: RaiseBriefEmailSchema,
  deck_request_response: z.object({
    concise: z.string(),
    warm: z.string(),
    formal: z.string(),
  }),
  quality_scores: QualityScoresSchema,
  quality_control: z.object({
    unsupported_claims_removed: z.array(z.string()),
    conflicting_information: z.array(z.string()),
    missing_critical_information: z.array(z.string()),
    facts_requiring_founder_confirmation: z.array(z.string()),
    information_intentionally_preserved: z.array(z.string()),
    final_quality_notes: z.array(z.string()),
  }),
})

export type RaiseBriefProduction = z.infer<typeof RaiseBriefProductionSchema>
export type RaiseBriefContent = z.infer<typeof RaiseBriefContentSchema>
export type RaiseBriefEmail = z.infer<typeof RaiseBriefEmailSchema>
export type QualityScores = z.infer<typeof QualityScoresSchema>

export function passesQualityGates(scores: QualityScores): boolean {
  return (
    scores.credibility >= 75 &&
    scores.specificity >= 75 &&
    scores.narrative_consistency >= 75 &&
    scores.information_discipline >= 75 &&
    scores.meeting_conversion_potential >= 80
  )
}

export function hasUnresolvedCriticalFacts(strategy: RaiseBriefStrategy): boolean {
  return strategy.facts_requiring_founder_confirmation.some((fact) => {
    const decision = fact.founderDecision ?? "pending"
    return fact.critical && decision === "pending"
  })
}
