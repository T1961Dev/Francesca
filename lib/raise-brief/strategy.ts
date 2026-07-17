import "server-only"

import { zodTextFormat } from "openai/helpers/zod"

import { getOpenAIClient, OPENAI_MODELS } from "@/lib/openai/client"
import {
  raiseBriefStrategySystemPrompt,
  raiseBriefStrategyUserPrompt,
} from "@/lib/raise-brief/prompts"
import {
  RaiseBriefStrategySchema,
  type RaiseBriefStrategy,
} from "@/lib/raise-brief/schemas"
import {
  serializeWorkspacePackForPrompt,
  type RaiseBriefWorkspacePack,
} from "@/lib/raise-brief/workspace-pack"

function mergeDeterministicConflicts(
  strategy: RaiseBriefStrategy,
  pack: RaiseBriefWorkspacePack
): RaiseBriefStrategy {
  const existingKeys = new Set(
    strategy.facts_requiring_founder_confirmation.map((item) => item.key)
  )

  const fromPack = pack.conflicts.map((conflict) => ({
    key: conflict.key,
    label: conflict.label,
    value: conflict.values.map((row) => `${row.source}: ${row.value}`).join(" | "),
    status: "conflicting" as const,
    critical: true,
    founderDecision: "pending" as const,
  }))

  const mergedConfirmations = [...strategy.facts_requiring_founder_confirmation]
  for (const item of fromPack) {
    if (!existingKeys.has(item.key)) {
      mergedConfirmations.push(item)
      existingKeys.add(item.key)
    }
  }

  const conflicting = Array.from(
    new Set([
      ...strategy.conflicting_information,
      ...pack.conflicts.map((conflict) => conflict.message),
    ])
  )

  return {
    ...strategy,
    facts_requiring_founder_confirmation: mergedConfirmations,
    conflicting_information: conflicting,
  }
}

export async function runRaiseBriefStrategy(pack: RaiseBriefWorkspacePack) {
  const openai = getOpenAIClient()
  const workspaceJson = serializeWorkspacePackForPrompt(pack)

  const response = await openai.responses.parse({
    model: OPENAI_MODELS.advanced,
    input: [
      { role: "system", content: raiseBriefStrategySystemPrompt },
      { role: "user", content: raiseBriefStrategyUserPrompt(workspaceJson) },
    ],
    text: {
      format: zodTextFormat(RaiseBriefStrategySchema, "raise_brief_strategy"),
    },
  })

  if (!response.output_parsed) {
    throw new Error("OpenAI returned an empty Raise Brief strategy")
  }

  const withDefaults: RaiseBriefStrategy = {
    ...response.output_parsed,
    facts_requiring_founder_confirmation:
      response.output_parsed.facts_requiring_founder_confirmation.map((fact) => ({
        ...fact,
        founderDecision: fact.founderDecision ?? "pending",
      })),
  }
  const parsed = mergeDeterministicConflicts(withDefaults, pack)

  return {
    parsed,
    raw: {
      id: response.id,
      model: response.model,
      outputText: response.output_text,
      usage: response.usage,
    },
  }
}
