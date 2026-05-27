import { notFound } from "next/navigation"

import { requireAuth } from "@/lib/auth"

/**
 * Parse the ADMIN_EMAILS env var (comma-separated). Falls back to a known dev
 * email so local development isn't broken.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim() ?? "tomasjonesdev@gmail.com"
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.trim().toLowerCase())
}

/**
 * Hide the existence of the admin area from non-admins: return 404 instead of
 * 403. Use at the top of every admin server component.
 */
export async function requireAdmin() {
  const user = await requireAuth()
  if (!isAdminEmail(user.email)) {
    notFound()
  }
  return user
}
