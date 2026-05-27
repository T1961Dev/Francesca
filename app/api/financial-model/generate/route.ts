import { NextResponse } from "next/server"

import { canUseFinancialModel, getUserPlan } from "@/lib/access"
import { logOpenAiCost } from "@/lib/costs/track"
import { generateFinancialModel } from "@/lib/openai/financial-model"
import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"
import { attemptUsageIncrement, rollbackUsageIncrement } from "@/lib/usage/track"

export async function POST(request: Request) {
  let userId: string | null = null
  let incremented = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    }
    userId = user.id

    const plan = await getUserPlan()

    if (!canUseFinancialModel(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Starter or Pro to use the financial model." },
        { status: 403 }
      )
    }

    const gate = await attemptUsageIncrement({
      userId: user.id,
      plan,
      action: "financial_model_run",
    })
    if (!gate.ok) {
      return NextResponse.json({ success: false, ...gate.reason }, { status: 402 })
    }
    incremented = true

    await captureServerEvent("financial_model_started", user.id, { plan })
    const result = await generateFinancialModel(await request.json())
    const { data, error } = await supabase
      .from("financial_models")
      .insert({
        user_id: user.id,
        inputs: result.input,
        projection: result.parsed.projection,
        narrative: result.parsed.narrative,
        investor_summary: result.parsed.investorSummary,
        risks: result.parsed.risks,
        assumptions: result.parsed.assumptions,
        use_of_funds: result.parsed.useOfFunds,
        charts_data: result.parsed.chartsData,
        raw_openai_response: result.raw as unknown as Record<string, unknown>,
        status: "completed",
      })
      .select("id")
      .single()

    if (error) throw error

    await logOpenAiCost({
      userId: user.id,
      runId: data.id as string,
      runType: "financial_model",
      model:
        (result.raw as { model?: string } | undefined)?.model ??
        process.env.OPENAI_FINANCIAL_MODEL ??
        "gpt-4o",
      usage: (result.raw as { usage?: Record<string, number> } | undefined)?.usage,
    })

    await captureServerEvent("financial_model_completed", user.id, { modelId: data.id })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (userId && incremented) {
      await rollbackUsageIncrement({ userId, action: "financial_model_run" })
    }
    captureError(error, { route: "financial-model-generate" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Model generation failed" },
      { status: 400 }
    )
  }
}
