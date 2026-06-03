import type { NextRequest, NextResponse } from "next/server"

export const AUTH_RETURN_COOKIE = "rw_auth_return"

export type AuthReturnPath = "/login" | "/signup"

const AUTH_PAGES: AuthReturnPath[] = ["/login", "/signup"]

export function isAuthReturnPath(value: string | undefined | null): value is AuthReturnPath {
  return value === "/login" || value === "/signup"
}

/** Where to send logged-out users after a 404 (last login or signup page visited). */
export function getAuthReturnPath(cookieValue: string | undefined | null): AuthReturnPath {
  return isAuthReturnPath(cookieValue) ? cookieValue : "/login"
}

/** Remember which auth page the user last opened (login vs signup). */
export function rememberAuthReturnPage(
  request: NextRequest,
  response: NextResponse,
  pathname: string
) {
  if (!isAuthReturnPath(pathname)) return

  response.cookies.set(AUTH_RETURN_COOKIE, pathname, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  })
}
