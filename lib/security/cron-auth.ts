import "server-only"

/**
 * Authorise cron / background job HTTP endpoints.
 * Fails closed when CRON_SECRET is unset (including production).
 */
export function authorizeCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret") ||
    ""

  return provided === secret
}
