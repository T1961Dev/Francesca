import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { sendWelcomeEmail } from "@/lib/resend/emails"
import { captureError } from "@/lib/sentry/capture"

/** Manual / QA trigger for the welcome email. */
export async function POST() {
  try {
    const user = await requireAuth()
    if (!user.email) throw new Error("User email is missing")

    await sendWelcomeEmail({
      userId: user.id,
      to: user.email,
      name: user.user_metadata?.full_name ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    captureError(error, { route: "resend-welcome" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Email failed" },
      { status: 400 }
    )
  }
}
