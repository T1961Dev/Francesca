import "server-only"

import { nextMonthlyResetAt, resolveUsageLimit, type UsageAction } from "@/lib/usage/limits"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Plan } from "@/types/app"

export type LimitReachedReason = {
  error: "limit_reached"
  action: UsageAction
  limit_type: "deck_uploads" | "financial_models" | "investor_matches"
  current: number
  max: number
  /** ISO timestamp when the monthly counter next resets. */
  resets_at: string | null
  plan: Plan
}

export type UsageState = {
  deckUploadsThisMonth: number
  financialModelRunsThisMonth: number
  investorMatchRunsThisMonth: number
  totalDeckUploadsEver: number
  whatsappBonusUsed: boolean
  lastResetAt: string | null
}

/**
 * Atomic gate. Returns `{ ok: true }` if the user is allowed and the counter
 * has already been incremented (in the same transaction). Returns
 * `{ ok: false, reason }` if the user is at or above their limit — the caller
 * MUST stop and surface the structured error.
 *
 * Never call Apify/OpenAI before this returns ok.
 */
export async function attemptUsageIncrement({
  userId,
  plan,
  action,
}: {
  userId: string
  plan: Plan
  action: UsageAction
}): Promise<{ ok: true } | { ok: false; reason: LimitReachedReason }> {
  const supabase = createAdminClient()

  const { data: usage } = await supabase
    .from("user_usage")
    .select(
      "deck_uploads_this_month, financial_model_runs_this_month, investor_match_runs_this_month, total_deck_uploads_ever, whatsapp_bonus_used"
    )
    .eq("user_id", userId)
    .maybeSingle()

  const whatsappBonus = Boolean(usage?.whatsapp_bonus_used)
  const limit = resolveUsageLimit(plan, action, { whatsappBonus })

  const current = limit.useEverCounter
    ? (usage?.total_deck_uploads_ever as number | undefined) ?? 0
    : action === "deck_upload"
      ? (usage?.deck_uploads_this_month as number | undefined) ?? 0
      : action === "financial_model_run"
        ? (usage?.financial_model_runs_this_month as number | undefined) ?? 0
        : (usage?.investor_match_runs_this_month as number | undefined) ?? 0

  // Cheap pre-check so we return a friendly response without hitting the SQL
  // function. Final decision still rests on the atomic SQL call below to avoid
  // races between two concurrent requests.
  if (current >= limit.limit) {
    return {
      ok: false,
      reason: {
        error: "limit_reached",
        action,
        limit_type: limit.label,
        current,
        max: limit.limit,
        resets_at: limit.useEverCounter ? null : nextMonthlyResetAt().toISOString(),
        plan,
      },
    }
  }

  const { data, error } = await supabase.rpc("increment_usage_if_under_limit", {
    p_user_id: userId,
    p_action: action,
    p_limit: limit.limit,
    p_use_ever_counter: limit.useEverCounter,
  })

  if (error) {
    throw error
  }

  if (data === true) {
    return { ok: true }
  }

  return {
    ok: false,
    reason: {
      error: "limit_reached",
      action,
      limit_type: limit.label,
      current: limit.limit,
      max: limit.limit,
      resets_at: limit.useEverCounter ? null : nextMonthlyResetAt().toISOString(),
      plan,
    },
  }
}

/** Compensating decrement when a downstream step fails. */
export async function rollbackUsageIncrement({
  userId,
  action,
}: {
  userId: string
  action: UsageAction
}) {
  const supabase = createAdminClient()
  try {
    await supabase.rpc("decrement_usage", {
      p_user_id: userId,
      p_action: action,
    })
  } catch (error) {
    console.warn(
      "[usage] failed to roll back increment",
      action,
      error instanceof Error ? error.message : error
    )
  }
}

export async function fetchUsageState(userId: string): Promise<UsageState | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("user_usage")
    .select(
      "deck_uploads_this_month, financial_model_runs_this_month, investor_match_runs_this_month, total_deck_uploads_ever, whatsapp_bonus_used, last_reset_at"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (!data) return null

  return {
    deckUploadsThisMonth: (data.deck_uploads_this_month as number) ?? 0,
    financialModelRunsThisMonth: (data.financial_model_runs_this_month as number) ?? 0,
    investorMatchRunsThisMonth: (data.investor_match_runs_this_month as number) ?? 0,
    totalDeckUploadsEver: (data.total_deck_uploads_ever as number) ?? 0,
    whatsappBonusUsed: Boolean(data.whatsapp_bonus_used),
    lastResetAt: (data.last_reset_at as string | null) ?? null,
  }
}

export async function markWhatsappBonusUsed(userId: string) {
  const supabase = createAdminClient()
  await supabase
    .from("user_usage")
    .update({ whatsapp_bonus_used: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
}
