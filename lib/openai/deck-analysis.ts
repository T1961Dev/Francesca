import "server-only"

import { zodTextFormat } from "openai/helpers/zod"

import { getOpenAIClient, OPENAI_MODELS } from "@/lib/openai/client"
import {
  deckAnalysisSystemPrompt,
  deckAnalysisUserPrompt,
} from "@/lib/openai/prompts"
import { DeckAnalysisSchema } from "@/lib/openai/schemas"

export async function analyseDeckText(deckText: string) {
  const openai = getOpenAIClient()
  const response = await openai.responses.parse({
    model: OPENAI_MODELS.standard,
    input: [
      { role: "system", content: deckAnalysisSystemPrompt },
      { role: "user", content: deckAnalysisUserPrompt(deckText) },
    ],
    text: {
      format: zodTextFormat(DeckAnalysisSchema, "deck_analysis"),
    },
  })

  if (!response.output_parsed) {
    throw new Error("OpenAI returned an empty deck analysis")
  }

  return {
    parsed: response.output_parsed,
    raw: {
      id: response.id,
      model: response.model,
      outputText: response.output_text,
      usage: response.usage,
    },
  }
}
