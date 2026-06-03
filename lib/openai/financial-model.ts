import "server-only"

import { zodTextFormat } from "openai/helpers/zod"

import { getFinancialModelOpenAIModel, getOpenAIClient } from "@/lib/openai/client"
import {
  financialModelSystemPrompt,
  financialModelUserPrompt,
} from "@/lib/openai/prompts"
import {
  FinancialModelInputSchema,
  FinancialModelSchema,
} from "@/lib/openai/schemas"

export async function generateFinancialModel(
  input: unknown,
  deckContext?: {
    deckSummary?: string | null
    deckFinancialSignals?: Record<string, unknown> | null
  }
) {
  const validatedInput = FinancialModelInputSchema.parse(input)
  const openai = getOpenAIClient()
  const response = await openai.responses.parse({
    model: getFinancialModelOpenAIModel(),
    input: [
      { role: "system", content: financialModelSystemPrompt },
      {
        role: "user",
        content: financialModelUserPrompt(validatedInput, {
          deckSummary: deckContext?.deckSummary,
          deckFinancialSignals: deckContext?.deckFinancialSignals,
        }),
      },
    ],
    text: {
      format: zodTextFormat(FinancialModelSchema, "financial_model"),
    },
  })

  if (!response.output_parsed) {
    throw new Error("OpenAI returned an empty financial model")
  }

  return {
    input: validatedInput,
    parsed: {
      ...response.output_parsed,
      chartsData: buildChartsData(response.output_parsed.projection),
    },
    raw: response,
  }
}

function buildChartsData(projection: Array<{
  month: number
  label: string
  revenue: number
  burn: number
  cashBalance: number
  runwayMonths: number
}>) {
  return {
    revenue: projection.map((month) => ({
      label: month.label || `M${month.month}`,
      value: Math.round(month.revenue),
    })),
    burn: projection.map((month) => ({
      label: month.label || `M${month.month}`,
      value: Math.round(month.burn),
    })),
    cashBalance: projection.map((month) => ({
      label: month.label || `M${month.month}`,
      value: Math.round(month.cashBalance),
    })),
    runway: projection.map((month) => ({
      label: month.label || `M${month.month}`,
      value: Math.round(month.runwayMonths * 10) / 10,
    })),
  }
}
