import "server-only"

import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import { logOpenAiCost } from "@/lib/costs/track"
import { loadPrompt } from "@/lib/matching/loadPrompt"
import {
  buildOutreachPromptPayload,
  type OutreachApifyContext,
} from "@/lib/matching/outreach-context"
import { OPENAI_MODELS } from "@/lib/openai/client"
import { getOpenAIClient } from "@/lib/openai/client"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

const OutreachSchema = z.object({
  subject: z.string(),
  body: z.string(),
})

const OUTREACH_SYSTEM_PROMPT = `You write cold investor outreach emails for early-stage founders.

Rules:
- Sound like a real founder typing a quick note, not a marketer or AI assistant.
- Keep the body under 120 words. Plain sentences. No bullet lists.
- Open with one specific hook from the supplied investor or firm signals (recent deal, LinkedIn post, sector focus, or title). Never invent signals.
- Tie the hook to one concrete detail about the founder's company (sector, stage, geography, or raise).
- End with a low-friction ask (15-minute call or quick deck share).
- Use the partner's first name in the greeting when available.
- Do not include placeholders like [Name] or {{company}}.

Banned phrases and patterns (never use):
- "I hope this finds you well"
- "I came across your profile"
- "synergies", "leverage", "delve", "landscape", "passionate about", "excited to connect"
- "perfect fit", "great match", "aligns with our vision"
- em dashes (use commas or short sentences instead)
- overly formal sign-offs like "Warm regards" or "Best regards" (use "Thanks," or first name only)

If improvements are provided, apply them while keeping the email human and specific.
If a current draft is provided during regeneration, rewrite it rather than making tiny edits.

Return JSON only with subject and body.`

export async function generateOutreachEmail({
  profile,
  match,
  apifyContext,
  improvements,
  currentDraft,
  userId,
  runId,
}: {
  profile: FounderProfile
  match: Omit<InvestorMatch, "rank" | "outreachEmail">
  apifyContext?: OutreachApifyContext
  improvements?: string
  currentDraft?: { subject: string; body: string }
  userId?: string | null
  runId?: string | null
}) {
  const model =
    process.env.OPENAI_INVESTOR_OUTREACH_MODEL?.trim() || OPENAI_MODELS.standard
  const systemPrompt = await loadPrompt("writeOutreachEmail.md").catch(
    () => OUTREACH_SYSTEM_PROMPT
  )
  const openai = getOpenAIClient()
  const response = await openai.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(
          buildOutreachPromptPayload({
            profile,
            match,
            apifyContext,
            improvements,
            currentDraft,
          })
        ),
      },
    ],
    text: {
      format: zodTextFormat(OutreachSchema, "investor_outreach"),
    },
  })

  if (!response.output_parsed) {
    throw new Error("OpenAI returned empty investor outreach")
  }

  await logOpenAiCost({
    userId: userId ?? null,
    runId: runId ?? null,
    runType: "investor_match",
    model,
    usage: response.usage,
  }).catch(() => undefined)

  return {
    subject: cleanOutreach(response.output_parsed.subject).slice(0, 80),
    body: cleanOutreach(response.output_parsed.body),
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
