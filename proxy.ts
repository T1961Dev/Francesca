import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * All page routes except static assets and API (API keeps JSON 404s).
     * Enables legacy path redirects (/settings → /dashboard/settings) and
     * remembering the last login vs signup page for 404 recovery.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
