import "server-only"

import { zodTextFormat } from "openai/helpers/zod"

import { logOpenAiCost } from "@/lib/costs/track"
import { loadPrompt } from "@/lib/matching/loadPrompt"
import {
  buildOutreachPromptPayload,
  type OutreachApifyContext,
} from "@/lib/matching/outreach-context"
import type { FounderFinancialContext } from "@/lib/matching/founder-financial-context"
import { OPENAI_MODELS } from "@/lib/openai/client"
import { getOpenAIClient } from "@/lib/openai/client"
import { OutreachSequenceSchema, type OutreachSequence } from "@/lib/openai/schemas"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

const OUTREACH_SEQUENCE_SYSTEM_PROMPT = `You write a 3-touch cold outreach sequence for early-stage founders.
Return JSON with exactly 3 steps: intro (day 0), follow-up (day 5), final bump (day 12).
Keep each body concise. No bullet lists. Never invent investor signals.`

export async function generateOutreachSequence({
  profile,
  match,
  apifyContext,
  financialContext,
  improvements,
  currentSequence,
  userId,
  runId,
}: {
  profile: FounderProfile
  match: Omit<InvestorMatch, "rank" | "outreachEmail" | "outreachSequence">
  apifyContext?: OutreachApifyContext
  financialContext?: FounderFinancialContext | null
  improvements?: string
  currentSequence?: OutreachSequence | null
  userId?: string | null
  runId?: string | null
}): Promise<OutreachSequence> {
  const model =
    process.env.OPENAI_INVESTOR_OUTREACH_MODEL?.trim() || OPENAI_MODELS.standard
  const systemPrompt = await loadPrompt("writeOutreachSequence.md").catch(
    () => OUTREACH_SEQUENCE_SYSTEM_PROMPT
  )
  const openai = getOpenAIClient()
  const response = await openai.responses.parse({
    model,
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          ...buildOutreachPromptPayload({
            profile,
            match,
            apifyContext,
            improvements,
            currentDraft: currentSequence?.steps[0]
              ? {
                  subject: currentSequence.steps[0].subject,
                  body: currentSequence.steps[0].body,
                }
              : undefined,
            financialContext,
          }),
          currentSequence: currentSequence ?? null,
        }),
      },
    ],
    text: {
      format: zodTextFormat(OutreachSequenceSchema, "investor_outreach_sequence"),
    },
  })

  if (!response.output_parsed?.steps?.length) {
    throw new Error("OpenAI returned empty investor outreach sequence")
  }

  await logOpenAiCost({
    userId: userId ?? null,
    runId: runId ?? null,
    runType: "investor_match",
    model,
    usage: response.usage,
  }).catch(() => undefined)

  return {
    steps: response.output_parsed.steps.map((step) => ({
      step: step.step,
      label: step.label.trim(),
      subject: cleanOutreach(step.subject).slice(0, 80),
      body: cleanOutreach(step.body),
      sendAfterDays: step.sendAfterDays,
    })),
  }
}

/** Generates a 3-step sequence; intro step is also returned as a single email for legacy fields. */
export async function generateOutreachEmail({
  profile,
  match,
  apifyContext,
  financialContext,
  improvements,
  currentDraft,
  userId,
  runId,
}: {
  profile: FounderProfile
  match: Omit<InvestorMatch, "rank" | "outreachEmail" | "outreachSequence">
  apifyContext?: OutreachApifyContext
  financialContext?: FounderFinancialContext | null
  improvements?: string
  currentDraft?: { subject: string; body: string }
  userId?: string | null
  runId?: string | null
}) {
  const sequence = await generateOutreachSequence({
    profile,
    match,
    apifyContext,
    financialContext,
    improvements,
    currentSequence: currentDraft
      ? {
          steps: [
            {
              step: 1,
              label: "Intro",
              subject: currentDraft.subject,
              body: currentDraft.body,
              sendAfterDays: 0,
            },
            {
              step: 2,
              label: "Follow-up",
              subject: currentDraft.subject,
              body: currentDraft.body,
              sendAfterDays: 5,
            },
            {
              step: 3,
              label: "Final bump",
              subject: currentDraft.subject,
              body: currentDraft.body,
              sendAfterDays: 12,
            },
          ],
        }
      : null,
    userId,
    runId,
  })

  const intro = sequence.steps[0]
  return {
    subject: intro.subject,
    body: intro.body,
    sequence,
  }
}

function cleanOutreach(value: string) {
  return value
    .replace(/—/g, "-")
    .replace(/I hope this finds you well[,.]?\s*/gi, "")
    .replace(/I came across your profile[,.]?\s*/gi, "")
    .replace(/synergies/gi, "fit")
    .replace(/\[(?:Name|Company|Firm)[^\]]*\]/gi, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .trim()
}
