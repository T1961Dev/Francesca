import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"
import { markWhatsappBonusUsed } from "@/lib/usage/track"

// E.164 phone format: leading +, then 8-15 digits. Lenient by design — we
// store the raw value and let the client do the heavy lifting.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Use international format with country code, e.g. +44 7…")

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const number = phoneSchema.parse(body?.number ?? "")

    const supabase = createAdminClient()
    await supabase
      .from("profiles")
      .update({ whatsapp_number: number })
      .eq("id", user.id)
    await markWhatsappBonusUsed(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "Invalid number" },
        { status: 400 }
      )
    }
    captureError(error, { route: "whatsapp" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not save" },
      { status: 400 }
    )
  }
}
