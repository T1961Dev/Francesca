import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { getAuthReturnPath, AUTH_RETURN_COOKIE } from "@/lib/routing/auth-return"

/**
 * Auth-aware 404 handling: logged-in users go to the app home; logged-out
 * users return to the last login or signup page they visited.
 */
export async function redirectFromNotFound(homeWhenAuthed = "/dashboard") {
  const user = await getCurrentUser()

  if (user) {
    redirect(homeWhenAuthed)
  }

  const cookieStore = await cookies()
  const returnPath = getAuthReturnPath(cookieStore.get(AUTH_RETURN_COOKIE)?.value)
  redirect(returnPath)
}
