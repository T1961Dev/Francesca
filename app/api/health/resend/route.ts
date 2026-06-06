import { NextResponse } from "next/server"

import { getResendConfigStatus } from "@/lib/resend/config"

/**
 * Verify Resend env is configured. GET /api/health/resend
 * Does not send email or expose secrets.
 */
export async function GET() {
  const status = getResendConfigStatus()

  return NextResponse.json({
    ok: status.ready,
    ...status,
  })
}
