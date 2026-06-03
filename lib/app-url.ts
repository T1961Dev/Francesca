/**
 * Canonical public app URL for auth redirects, emails, and Stripe.
 * On Render, set NEXT_PUBLIC_APP_URL to your live host; RENDER_EXTERNAL_URL
 * is used as a fallback when env vars still point at localhost.
 */
export function getPublicAppUrl(): string {
  const isProd = process.env.NODE_ENV === "production"

  const raw = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]

  const candidates = raw
    .map((value) => value?.trim().replace(/\/$/, "") ?? "")
    .filter(Boolean)

  for (const url of candidates) {
    if (isProd && isLocalhostUrl(url)) continue
    if (url.startsWith("http://") || url.startsWith("https://")) return url
  }

  const render = process.env.RENDER_EXTERNAL_URL?.trim().replace(/\/$/, "")
  if (isProd && render && !isLocalhostUrl(render)) {
    return render.startsWith("http") ? render : `https://${render}`
  }

  return candidates[0] || "http://localhost:3000"
}

function isLocalhostUrl(url: string) {
  try {
    const host = new URL(url).hostname
    return host === "localhost" || host === "127.0.0.1" || host === "::1"
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url)
  }
}
