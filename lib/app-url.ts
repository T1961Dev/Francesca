/**

 * Canonical public app URL for auth emails, Stripe, and post-auth redirects.

 *

 * **Render / production:** set `APP_URL` (runtime, not baked at build).

 * `NEXT_PUBLIC_APP_URL` is only a fallback — a bad build-time value like

 * `http://localhost:10000` must never win over `APP_URL` or `RENDER_EXTERNAL_URL`.

 *

 * Never use `request.nextUrl.origin` for Supabase `redirectTo` / `emailRedirectTo`.

 */



const URL_ENV_KEYS = [

  "APP_URL",

  "SITE_URL",

  "RENDER_EXTERNAL_URL",

  "NEXT_PUBLIC_APP_URL",

  "NEXT_PUBLIC_SITE_URL",

  "VERCEL_URL",

] as const



function normalizeCandidate(value: string | undefined, key: string) {

  const trimmed = value?.trim().replace(/\/$/, "") ?? ""

  if (!trimmed) return ""

  if (key === "VERCEL_URL") return `https://${trimmed}`

  return trimmed

}



function listUrlCandidates() {

  return URL_ENV_KEYS.map((key) => ({

    key,

    value: normalizeCandidate(process.env[key], key),

  })).filter((entry) => entry.value)

}



function pickSafeUrl(candidates: { key: string; value: string }[], isProd: boolean) {

  for (const { key, value } of candidates) {

    if (isUnsafeAppUrl(value)) continue

    if (value.startsWith("http://") || value.startsWith("https://")) {

      return { url: normalizeProtocol(value, isProd), source: key }

    }

    if (!isProd) {

      return { url: normalizeProtocol(value, isProd), source: key }

    }

  }

  return null

}



export function getPublicAppUrl(): string {

  const isProd = process.env.NODE_ENV === "production"

  const picked = pickSafeUrl(listUrlCandidates(), isProd)



  if (picked) return picked.url



  if (!isProd) {

    return "http://localhost:3000"

  }



  const unsafe = listUrlCandidates().map((c) => `${c.key}=${c.value}`).join(", ")

  throw new Error(

    unsafe

      ? `No safe public app URL in production (${unsafe}). Set APP_URL=https://francesca-sy16.onrender.com, remove NEXT_PUBLIC_APP_URL=http://localhost:10000, redeploy.`

      : "No public app URL configured in production. Set APP_URL on Render and redeploy."

  )

}



/** Throws when auth emails would use a localhost / internal URL in production. */

export function assertSafeAppUrlForAuth(context: string) {

  if (process.env.NODE_ENV !== "production") return



  const url = getPublicAppUrl()

  if (!isUnsafeAppUrl(url)) return



  throw new Error(

    `${context}: unsafe app URL "${url}". On Render set APP_URL=https://francesca-sy16.onrender.com ` +

      "(remove NEXT_PUBLIC_APP_URL=http://localhost:10000 if present), redeploy, then sign up again."

  )

}



/** Prefer HTTPS in production when only a hostname was provided. */

function normalizeProtocol(url: string, isProd: boolean) {

  if (!isProd) return url

  if (url.startsWith("http://") || url.startsWith("https://")) return url

  return `https://${url}`

}



/** Localhost, loopback, or Render internal port leaks. */

export function isUnsafeAppUrl(url: string) {

  if (/:10000\b/.test(url)) return true

  try {

    const { hostname, port } = new URL(

      url.startsWith("http") ? url : `https://${url}`

    )

    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {

      return true

    }

    if (port === "10000") return true

    return false

  } catch {

    return /localhost|127\.0\.0\.1|:10000\b/i.test(url)

  }

}



export function getAppUrlDiagnostics() {

  const candidates = listUrlCandidates().map(({ key, value }) => ({

    key,

    unsafe: isUnsafeAppUrl(value),

    host: safeHostLabel(value),

  }))



  let resolved: string | null = null

  let source: string | null = null

  let resolveError: string | null = null



  try {

    const picked = pickSafeUrl(

      listUrlCandidates(),

      process.env.NODE_ENV === "production"

    )

    if (picked) {

      resolved = picked.url

      source = picked.source

    } else if (process.env.NODE_ENV !== "production") {

      resolved = "http://localhost:3000"

      source = "default-dev"

    }

  } catch (e) {

    resolveError = e instanceof Error ? e.message : "resolve failed"

  }



  if (!resolved && process.env.NODE_ENV === "production") {

    try {

      resolved = getPublicAppUrl()

      source = source ?? "getPublicAppUrl"

    } catch (e) {

      resolveError = e instanceof Error ? e.message : resolveError

    }

  }



  return { candidates, resolved, source, resolveError }

}



function safeHostLabel(url: string) {

  try {

    return new URL(url.startsWith("http") ? url : `https://${url}`).host

  } catch {

    return "(invalid)"

  }

}



/**

 * Where to send users after /auth/callback. In production always use the

 * configured public URL — never `request.nextUrl.origin` (Render internal host).

 */

export function getAuthRedirectOrigin(_request?: { nextUrl: { origin: string } }) {

  return getPublicAppUrl()

}



/** Build /auth/callback on the public host (for middleware recovery redirects). */

export function buildPublicAuthCallbackRedirect(

  searchParams: URLSearchParams,

  overrides?: { pathname?: string; type?: string }

) {

  const origin = getPublicAppUrl()

  const url = new URL("/auth/callback", origin)



  searchParams.forEach((value, key) => {

    url.searchParams.set(key, value)

  })



  if (overrides?.type && !url.searchParams.get("type")) {

    url.searchParams.set("type", overrides.type)

  }



  return url.toString()

}


