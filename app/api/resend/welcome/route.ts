import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { welcomeEmail } from "@/lib/resend/templates"
import { sendTrackedEmail } from "@/lib/resend/send"
import { captureError } from "@/lib/sentry/capture"

export async function POST() {
  try {
    const user = await requireAuth()
    if (!user.email) throw new Error("User email is missing")
    const template = welcomeEmail(user.user_metadata?.full_name)
    const data = await sendTrackedEmail({ userId: user.id, to: user.email, type: "welcome", ...template })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    captureError(error, { route: "resend-welcome" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Email failed" }, { status: 400 })
  }
}
