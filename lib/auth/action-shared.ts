import { headers } from "next/headers"
import { z } from "zod"

import { bumpRateLimit } from "@/lib/security/rate-limit"

export const emailPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function rateLimit(scope: string, formEmail: FormDataEntryValue | null) {
  const hdrs = await headers()
  const forwarded = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || hdrs.get("x-real-ip") || "unknown"
  const email = typeof formEmail === "string" ? formEmail.toLowerCase() : ""

  const ipResult = await bumpRateLimit({
    key: `${scope}:ip:${ip}`,
    windowMs: 60_000,
    limit: 10,
  })
  if (!ipResult.allowed) return false

  if (email) {
    const emailResult = await bumpRateLimit({
      key: `${scope}:email:${email}`,
      windowMs: 600_000,
      limit: 5,
    })
    if (!emailResult.allowed) return false
  }

  return true
}

export function getAppUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    ""

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL or APP_URL env var")
  }

  return url.replace(/\/$/, "")
}

export function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  return value
}
