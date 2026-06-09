import type { OutreachSequence } from "@/lib/openai/schemas"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

type OutreachMatch = Omit<InvestorMatch, "rank" | "outreachEmail" | "outreachSequence">

export type OutreachValidationContext = {
  profile: FounderProfile
  match: OutreachMatch
}

export type OutreachValidationResult = {
  valid: boolean
  reasons: string[]
}

const REQUIRED_DAYS = [0, 5, 12]
const REQUIRED_LABELS = ["Intro", "Follow-up", "Final bump"]
const PLACEHOLDER_PATTERN =
  /(\[[^\]]*(name|company|investor|firm)[^\]]*\]|\{\{[^}]+\}\}|INSERT|TBD|Dear Investor)/i
const GENERIC_PATTERN =
  /\b(synergies|perfect fit|great match|aligns with (our|your) vision|strong network|support founders|passionate about|excited to connect|hope this finds you well)\b/i

export function validateOutreachSequence(
  sequence: OutreachSequence | null | undefined,
  context: OutreachValidationContext
): OutreachValidationResult {
  const reasons: string[] = []
  const steps = sequence?.steps ?? []

  if (steps.length !== 3) reasons.push("must_have_exactly_three_steps")

  const days = steps.map((step) => step.sendAfterDays)
  for (const day of REQUIRED_DAYS) {
    if (!days.includes(day)) reasons.push(`missing_day_${day}`)
  }
  for (const day of days) {
    if (!REQUIRED_DAYS.includes(day)) reasons.push(`unexpected_day_${day}`)
  }

  const companyName = context.profile.company.name.toLowerCase()
  const firmName = context.match.firm.name.toLowerCase()
  const investorName = context.match.partner.name.toLowerCase()
  const investorFirstName = investorName.split(/\s+/)[0] ?? investorName
  const personalizationTerms = buildPersonalizationTerms(context)

  const bodies = steps.map((step) => normaliseBody(step.body))
  if (new Set(bodies.filter(Boolean)).size < bodies.filter(Boolean).length) {
    reasons.push("reused_body")
  }

  for (const [index, step] of steps.entries()) {
    const label = REQUIRED_LABELS[index]
    if (step.step !== index + 1) reasons.push(`bad_step_number_${index + 1}`)
    if (!step.label || !step.label.toLowerCase().includes(label.toLowerCase().split(" ")[0])) {
      reasons.push(`bad_label_${index + 1}`)
    }
    if (!step.subject.trim()) reasons.push(`empty_subject_${index + 1}`)
    if (!step.body.trim()) reasons.push(`empty_body_${index + 1}`)
    if (PLACEHOLDER_PATTERN.test(step.subject) || PLACEHOLDER_PATTERN.test(step.body)) {
      reasons.push(`placeholder_${index + 1}`)
    }
    if (GENERIC_PATTERN.test(step.body)) reasons.push(`generic_phrase_${index + 1}`)

    const subjectBody = `${step.subject} ${step.body}`.toLowerCase()
    if (!subjectBody.includes(companyName)) reasons.push(`missing_company_${index + 1}`)
    if (!subjectBody.includes(firmName) && !subjectBody.includes(investorFirstName)) {
      reasons.push(`missing_investor_or_firm_${index + 1}`)
    }
    if (!personalizationTerms.some((term) => subjectBody.includes(term))) {
      reasons.push(`missing_fit_signal_${index + 1}`)
    }
    if (wordCount(step.body) > maxWordsForDay(step.sendAfterDays)) {
      reasons.push(`too_long_${index + 1}`)
    }
  }

  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] }
}

export function validateOutreachSequenceBasics(
  sequence: OutreachSequence | null | undefined
): OutreachValidationResult {
  const reasons: string[] = []
  const steps = sequence?.steps ?? []
  if (steps.length !== 3) reasons.push("must_have_exactly_three_steps")

  const days = steps.map((step) => step.sendAfterDays)
  for (const day of REQUIRED_DAYS) {
    if (!days.includes(day)) reasons.push(`missing_day_${day}`)
  }

  for (const [index, step] of steps.entries()) {
    if (!step.subject.trim()) reasons.push(`empty_subject_${index + 1}`)
    if (!step.body.trim()) reasons.push(`empty_body_${index + 1}`)
    if (PLACEHOLDER_PATTERN.test(step.subject) || PLACEHOLDER_PATTERN.test(step.body)) {
      reasons.push(`placeholder_${index + 1}`)
    }
  }

  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] }
}

export function buildFallbackOutreachSequence({
  profile,
  match,
}: OutreachValidationContext): OutreachSequence {
  const company = profile.company.name
  const firm = match.firm.name
  const firstName = firstNameOrFirm(match.partner.name, firm)
  const sector = profile.company.sectorRaw || profile.company.subSector || profile.company.sector
  const stage = profile.company.stage
  const raise = profile.raise.amount ? formatMoney(profile.raise.amount) : `${stage} round`
  const traction = tractionPhrase(profile)
  const investorEvidence = investorEvidencePhrase(match, profile)
  const fitReason = conciseFitReason(match, profile)
  const sectorFit = `${company}'s ${sector} focus`

  return {
    steps: [
      {
        step: 1,
        label: "Intro",
        sendAfterDays: 0,
        subject: `${company} x ${firm}`,
        body: [
          `Hi ${firstName}, I am the founder of ${company}, a ${stage} ${sector} company raising ${raise}.`,
          `${investorEvidence}, which overlaps with ${sectorFit}.`,
          `${fitReason}.`,
          traction
            ? `${traction}. Would it be worth sending a short deck or finding 15 minutes next week?`
            : `Would it be worth sending a short deck or finding 15 minutes next week?`,
        ].join(" "),
      },
      {
        step: 2,
        label: "Follow-up",
        sendAfterDays: 5,
        subject: `${company} follow-up`,
        body: [
          `Hi ${firstName}, quick follow-up on ${company} for ${firm}.`,
          `${company} is focused on ${sector}, and the raise is aimed at proving the next sales and product milestones for ${sectorFit}.`,
          `${fitReason}. Happy to send the deck if useful.`,
        ].join(" "),
      },
      {
        step: 3,
        label: "Final bump",
        sendAfterDays: 12,
        subject: `Closing the loop, ${company}`,
        body: [
          `${firstName}, closing the loop on ${company}.`,
          `${firm} stood out for ${sectorFit}: ${fitReason}.`,
          `If this is not a fit for ${firm} right now, no problem.`,
        ].join(" "),
      },
    ],
  }
}

export function ensureValidOutreachSequence(
  sequence: OutreachSequence | null | undefined,
  context: OutreachValidationContext
): { sequence: OutreachSequence; source: "validated" | "fallback"; reasons: string[] } {
  const result = validateOutreachSequence(sequence, context)
  if (sequence && result.valid) {
    return { sequence, source: "validated", reasons: [] }
  }
  const fallback = buildFallbackOutreachSequence(context)
  const fallbackResult = validateOutreachSequence(fallback, context)
  if (fallbackResult.valid) {
    return {
      sequence: fallback,
      source: "fallback",
      reasons: result.reasons,
    }
  }
  return {
    sequence: buildMinimalOutreachSequence(context),
    source: "fallback",
    reasons: [...result.reasons, ...fallbackResult.reasons],
  }
}

function buildPersonalizationTerms({ profile, match }: OutreachValidationContext) {
  return [
    profile.company.sectorRaw,
    profile.company.subSector,
    profile.company.businessModelRaw,
    profile.company.stage,
    profile.raise.amount ? String(profile.raise.amount) : "",
    profile.traction.mrr ? String(profile.traction.mrr) : "",
    profile.traction.customers ? String(profile.traction.customers) : "",
    profile.traction.users ? String(profile.traction.users) : "",
    ...match.firm.focusAreas,
    ...match.firm.investmentStages,
    match.chequeFit ?? "",
  ]
    .flatMap((term) => String(term).toLowerCase().split(/[|,/]+/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
}

function investorEvidencePhrase(match: OutreachMatch, profile: FounderProfile) {
  const focus = conciseFocusTerms(match, profile).slice(0, 2).join(" and ")
  const stages = match.firm.investmentStages.slice(0, 2).join(" or ")
  if (focus && stages) return `${match.firm.name} shows focus in ${focus} at ${stages}`
  if (focus) return `${match.firm.name} shows focus in ${focus}`
  if (stages) return `${match.firm.name} backs ${stages} companies`
  return `${match.firm.name} appears relevant from the supplied investor profile`
}

function conciseFitReason(match: OutreachMatch, profile: FounderProfile) {
  const rationale = match.matchRationale.split(/[.!?]/)[0]?.trim()
  if (rationale && rationale.length <= 160) return rationale
  const focus = conciseFocusTerms(match, profile)[0] ?? profile.company.sectorRaw ?? "your investment focus"
  return `there is a clear fit around ${focus}`
}

function conciseFocusTerms(match: OutreachMatch, profile: FounderProfile) {
  const preferred = buildPersonalizationTerms({ profile, match })
  const generic = new Set([
    "venture capital",
    "private equity",
    "venture capital & private equity",
    "venture capital & private equity principals",
    "startups",
    "startup",
    "founders",
    "capital",
    "portfolio",
    "investment",
    "investing",
  ])
  const seen = new Set<string>()
  const terms = match.firm.focusAreas
    .flatMap((area) => area.split(/[,|/]/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && term.length <= 42)
    .filter((term) => !generic.has(term.toLowerCase()))
    .filter((term) => {
      const lower = term.toLowerCase()
      if (seen.has(lower)) return false
      seen.add(lower)
      return true
    })

  const preferredTerms = terms.filter((term) =>
    preferred.some((candidate) => term.toLowerCase().includes(candidate) || candidate.includes(term.toLowerCase()))
  )
  return [...preferredTerms, ...terms].slice(0, 4)
}

function buildMinimalOutreachSequence({
  profile,
  match,
}: OutreachValidationContext): OutreachSequence {
  const company = profile.company.name
  const firm = match.firm.name
  const firstName = firstNameOrFirm(match.partner.name, firm)
  const sector = profile.company.sectorRaw || profile.company.subSector || profile.company.sector
  const stage = profile.company.stage
  const raise = profile.raise.amount ? formatMoney(profile.raise.amount) : `${stage} round`

  return {
    steps: [
      {
        step: 1,
        label: "Intro",
        sendAfterDays: 0,
        subject: `${company} x ${firm}`,
        body: `Hi ${firstName}, I am the founder of ${company}, a ${stage} ${sector} company raising ${raise}. ${firm} looks relevant to ${company}'s ${sector} focus. Would it be worth sending the deck?`,
      },
      {
        step: 2,
        label: "Follow-up",
        sendAfterDays: 5,
        subject: `${company} follow-up`,
        body: `Hi ${firstName}, following up on ${company} for ${firm}. The raise supports the next product and sales milestones for our ${sector} work. Happy to send the deck if useful.`,
      },
      {
        step: 3,
        label: "Final bump",
        sendAfterDays: 12,
        subject: `Closing the loop, ${company}`,
        body: `${firstName}, closing the loop on ${company}. ${firm} stood out for our ${sector} focus. If this is not a fit for ${firm}, no problem.`,
      },
    ],
  }
}

function tractionPhrase(profile: FounderProfile) {
  const parts = []
  if (profile.traction.mrr) parts.push(`${formatMoney(profile.traction.mrr)} MRR`)
  if (profile.traction.customers) parts.push(`${profile.traction.customers} customers`)
  if (profile.traction.users) parts.push(`${profile.traction.users.toLocaleString("en-GB")} users`)
  return parts.length ? `${profile.company.name} has ${parts.slice(0, 2).join(" and ")}` : ""
}

function firstNameOrFirm(name: string, firm: string) {
  const first = name.trim().split(/\s+/)[0]
  if (!first || /^unknown$/i.test(first)) return firm
  return first
}

function formatMoney(amount: number) {
  if (amount >= 1_000_000) return `GBP ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}m`
  if (amount >= 1_000) return `GBP ${Math.round(amount / 1_000)}k`
  return `GBP ${amount}`
}

function normaliseBody(body: string) {
  return body.toLowerCase().replace(/\s+/g, " ").trim()
}

function wordCount(body: string) {
  return body.trim().split(/\s+/).filter(Boolean).length
}

function maxWordsForDay(day: number) {
  if (day === 0) return 130
  if (day === 5) return 100
  return 80
}
