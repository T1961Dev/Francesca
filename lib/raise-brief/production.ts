import "server-only"

import { zodTextFormat } from "openai/helpers/zod"

import { getOpenAIClient, OPENAI_MODELS } from "@/lib/openai/client"
import {
  raiseBriefProductionSystemPrompt,
  raiseBriefProductionUserPrompt,
  raiseBriefRewriteNotes,
} from "@/lib/raise-brief/prompts"
import {
  passesQualityGates,
  RaiseBriefProductionSchema,
  type RaiseBriefProduction,
  type RaiseBriefStrategy,
} from "@/lib/raise-brief/schemas"
import {
  serializeWorkspacePackForPrompt,
  type RaiseBriefWorkspacePack,
} from "@/lib/raise-brief/workspace-pack"

function applyFounderConfirmations(strategy: RaiseBriefStrategy): RaiseBriefStrategy {
  const confirmations = strategy.facts_requiring_founder_confirmation.map((fact) => {
    if (fact.founderDecision === "edited" && fact.editedValue?.trim()) {
      return { ...fact, value: fact.editedValue.trim() }
    }
    return fact
  })

  const blocked = new Set(
    confirmations
      .filter((fact) => fact.founderDecision === "do_not_use")
      .map((fact) => fact.key)
  )

  return {
    ...strategy,
    facts_requiring_founder_confirmation: confirmations,
    facts: strategy.facts.filter((fact) => !blocked.has(fact.key)),
  }
}

async function callProduction(input: {
  pack: RaiseBriefWorkspacePack
  strategy: RaiseBriefStrategy
  rewriteNotes?: string[]
}) {
  const openai = getOpenAIClient()
  const response = await openai.responses.parse({
    model: OPENAI_MODELS.advanced,
    input: [
      { role: "system", content: raiseBriefProductionSystemPrompt },
      {
        role: "user",
        content: raiseBriefProductionUserPrompt({
          workspaceJson: serializeWorkspacePackForPrompt(input.pack),
          strategyJson: JSON.stringify(input.strategy, null, 2),
          rewriteNotes: input.rewriteNotes,
        }),
      },
    ],
    text: {
      format: zodTextFormat(RaiseBriefProductionSchema, "raise_brief_production"),
    },
  })

  if (!response.output_parsed) {
    throw new Error("OpenAI returned an empty Raise Brief production result")
  }

  return {
    parsed: response.output_parsed as RaiseBriefProduction,
    raw: {
      id: response.id,
      model: response.model,
      outputText: response.output_text,
      usage: response.usage,
    },
  }
}

export async function runRaiseBriefProduction(input: {
  pack: RaiseBriefWorkspacePack
  strategy: RaiseBriefStrategy
}) {
  const strategy = applyFounderConfirmations(input.strategy)
  let result = await callProduction({ pack: input.pack, strategy })

  if (!passesQualityGates(result.parsed.quality_scores)) {
    const notes = raiseBriefRewriteNotes(result.parsed.quality_scores)
    result = await callProduction({
      pack: input.pack,
      strategy,
      rewriteNotes: notes.length
        ? notes
        : ["Rewrite to meet RaiseWise quality floors without inventing facts."],
    })
  }

  return {
    ...result,
    strategyUsed: strategy,
    passedQualityGates: passesQualityGates(result.parsed.quality_scores),
  }
}
