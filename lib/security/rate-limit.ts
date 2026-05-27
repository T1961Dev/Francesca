import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Window-based rate limiter using a single Postgres row per (key, window).
 *
 * - Window = fixed-size bucket aligned to clock (e.g. 60_000ms windows snap to
 *   each minute). Simple, slightly less precise than a sliding window.
 * - For prod-scale traffic, swap the Supabase RPC with Upstash Redis. The
 *   call sites only need this function.
 */
export async function bumpRateLimit({
  key,
  windowMs,
  limit,
}: {
  key: string
  windowMs: number
  limit: number
}): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("bump_rate_limit_bucket", {
    p_bucket_key: key,
    p_window_start: windowStart.toISOString(),
  })

  if (error) {
    // Fail open on infra problems — never block a real user because the DB hiccups.
    return { allowed: true, remaining: limit, resetAt: new Date(windowStart.getTime() + windowMs) }
  }

  const hits = Number(data) || 0
  return {
    allowed: hits <= limit,
    remaining: Math.max(0, limit - hits),
    resetAt: new Date(windowStart.getTime() + windowMs),
  }
}

export function ipFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip") || "unknown"
}
