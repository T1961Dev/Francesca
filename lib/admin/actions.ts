"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/admin/auth"
import { captureError } from "@/lib/sentry/capture"
import { getStripe } from "@/lib/stripe/client"
import { createAdminClient } from "@/lib/supabase/admin"

async function logAdminAction(adminEmail: string, targetUserId: string | null, action: string, details: Record<string, unknown>) {
  const supabase = createAdminClient()
  await supabase.from("admin_actions").insert({
    admin_email: adminEmail,
    target_user_id: targetUserId,
    action,
    details,
  })
}

export async function grantPlan(userId: string, plan: string) {
  const admin = await requireAdmin()
  const supabase = createAdminClient()
  await supabase.from("profiles").update({ plan }).eq("id", userId).throwOnError()
  await logAdminAction(admin.email ?? "unknown", userId, "grant_plan", { plan })
  revalidatePath(`/admin/users/${userId}`)
}

export async function resetUsage(userId: string) {
  const admin = await requireAdmin()
  const supabase = createAdminClient()
  await supabase
    .from("user_usage")
    .update({
      deck_uploads_this_month: 0,
      financial_model_runs_this_month: 0,
      investor_match_runs_this_month: 0,
      last_reset_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .throwOnError()
  await logAdminAction(admin.email ?? "unknown", userId, "reset_usage", {})
  revalidatePath(`/admin/users/${userId}`)
}

export async function rerunFailedJob(jobId: string) {
  const admin = await requireAdmin()
  const supabase = createAdminClient()
  const { data: job } = await supabase
    .from("investor_matching_jobs")
    .select("user_id")
    .eq("id", jobId)
    .maybeSingle()

  if (!job) return

  await supabase
    .from("investor_matching_jobs")
    .update({ status: "pending", pipeline_stage: "admin_retry", error: null })
    .eq("id", jobId)

  const { dispatchInvestorMatchingRun } = await import("@/lib/investors/dispatch")
  dispatchInvestorMatchingRun(jobId)

  await logAdminAction(admin.email ?? "unknown", String(job.user_id), "rerun_failed_pipeline", { jobId })
}

export async function softDeleteUser(userId: string) {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId)
    .throwOnError()

  // Cancel any Stripe subscription if present.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle()

  if (profile?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(String(profile.stripe_subscription_id))
    } catch (error) {
      captureError(error, { route: "admin-soft-delete-cancel-sub" })
    }
  }

  await logAdminAction(admin.email ?? "unknown", userId, "soft_delete_user", {})
  revalidatePath("/admin/users")
}
