import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Soft-delete the calling user. Sets profiles.deleted_at and signs them out.
 * A daily cron hard-deletes anyone past 30 days.
 */
export async function POST() {
  try {
    const user = await requireAuth()
    const admin = createAdminClient()

    await admin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", user.id)

    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    captureError(error, { route: "me-delete" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not delete" },
      { status: 500 }
    )
  }
}
