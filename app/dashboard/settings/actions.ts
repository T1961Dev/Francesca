"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireAuth } from "@/lib/auth"
import { mirrorProfileFields } from "@/lib/profile/prefill"
import { createClient } from "@/lib/supabase/server"

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key)
  if (v === null || v === "") return null
  return String(v).trim() || null
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const payload = mirrorProfileFields({
    full_name: str(formData, "full_name"),
    company_name: str(formData, "company_name"),
    website: str(formData, "website"),
    role: str(formData, "role"),
    sector: str(formData, "sector"),
    stage: str(formData, "stage"),
    geography: str(formData, "geography"),
    target_raise: parseOptionalNumber(formData.get("target_raise")),
    description: str(formData, "description"),
  })

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id")

  if (updateError) {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent(updateError.message)}`
    )
  }

  if (!updated?.length) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      ...payload,
      plan: "free",
      subscription_status: "inactive",
    })

    if (insertError) {
      redirect(
        `/dashboard/settings?error=${encodeURIComponent(insertError.message)}`
      )
    }
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard", "layout")
  redirect("/dashboard/settings?saved=1")
}
