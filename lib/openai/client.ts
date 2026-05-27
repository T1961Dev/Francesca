import "server-only"

import OpenAI from "openai"

export const OPENAI_MODELS = {
  standard: "gpt-4.1-mini",
  advanced: "gpt-4.1",
} as const

/** Structured financial projections: defaults to a stronger model than deck analysis. Override with OPENAI_FINANCIAL_MODEL. */
export function getFinancialModelOpenAIModel() {
  return process.env.OPENAI_FINANCIAL_MODEL?.trim() || OPENAI_MODELS.advanced
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}
