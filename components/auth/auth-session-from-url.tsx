"use client"

import { useEffect } from "react"

import { createClient } from "@/lib/supabase/client"
import { PASSWORD_RESET_NEXT } from "@/lib/supabase/auth-callback"

/**
 * Supabase sometimes redirects to the Site URL (/) with tokens in the hash or
 * ?code= in the query when the exact redirect URL is not allowlisted. This
 * completes the session client-side and sends the user to the right page.
 */
export function AuthSessionFromUrl() {
  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href)
      const supabase = createClient()

      const code = url.searchParams.get("code")
      if (code && !url.pathname.startsWith("/auth/callback")) {
        const params = new URLSearchParams(url.searchParams)
        if (!params.get("next") && !params.get("type")) {
          params.set("next", PASSWORD_RESET_NEXT)
          params.set("type", "recovery")
        }
        params.set("code", code)
        window.location.replace(`/auth/callback?${params.toString()}`)
        return
      }

      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : ""
      if (!hash) return

      const params = new URLSearchParams(hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")
      const type = params.get("type")

      if (!accessToken || !refreshToken) return

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      window.history.replaceState(null, "", url.pathname + url.search)

      if (error) {
        window.location.replace(
          `/login?error=${encodeURIComponent(error.message)}`
        )
        return
      }

      if (type === "recovery") {
        window.location.replace(PASSWORD_RESET_NEXT)
        return
      }

      if (type === "signup") {
        window.location.replace("/onboarding")
        return
      }

      window.location.replace("/dashboard")
    }

    void run()
  }, [])

  return null
}
