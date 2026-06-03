/**
 * Short or old URLs that should redirect to the current app routes
 * (avoids a bare 404 for common mistakes like /settings).
 */
export const LEGACY_PATH_REDIRECTS: Record<string, string> = {
  "/settings": "/dashboard/settings",
  "/billing": "/dashboard/billing",
  "/deck-analyser": "/dashboard/deck-analyser",
  "/deck": "/dashboard/deck-analyser",
  "/financial-model": "/dashboard/financial-model",
  "/investor-matching": "/dashboard/investor-matching",
}

export function resolveLegacyPathRedirect(pathname: string): string | null {
  const exact = LEGACY_PATH_REDIRECTS[pathname]
  if (exact) return exact

  // e.g. /settings/profile → /dashboard/settings
  for (const [from, to] of Object.entries(LEGACY_PATH_REDIRECTS)) {
    if (pathname.startsWith(`${from}/`)) {
      return `${to}${pathname.slice(from.length)}`
    }
  }

  return null
}
