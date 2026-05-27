import type { z } from "zod"

import type {
  DeckAnalysisSchema,
  FinancialModelSchema,
  InvestorMatchSchema,
} from "@/lib/openai/schemas"

export type DeckAnalysisOutput = z.infer<typeof DeckAnalysisSchema>
export type FinancialModelOutput = z.infer<typeof FinancialModelSchema>
export type InvestorMatchOutput = z.infer<typeof InvestorMatchSchema>
