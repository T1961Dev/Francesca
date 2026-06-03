"use client"

import { useEffect } from "react"

import { formatSupabaseCallbackError } from "@/lib/auth/supabase-callback-errors"
import { createClient } from "@/lib/supabase/client"
import { PASSWORD_RESET_NEXT } from "@/lib/supabase/auth-callback"

/**
 * Completes Supabase auth when the email link lands on the wrong path (e.g. Site
 * URL /login) with tokens or errors in the URL hash.
 */
export function AuthSessionFromUrl() {
  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href)
      const supabase = createClient()

      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : ""
      if (hash) {
        const hashParams = new URLSearchParams(hash)

        if (hashParams.get("error") || hashParams.get("error_code")) {
          const message = formatSupabaseCallbackError(hashParams)
          const target =
            hashParams.get("error_code") === "otp_expired" ||
            hashParams.get("type") === "signup"
              ? "signup"
              : "login"
          window.history.replaceState(null, "", url.pathname + url.search)
          window.location.replace(
            `/${target}?error=${encodeURIComponent(message)}`
          )
          return
        }

        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          window.history.replaceState(null, "", url.pathname + url.search)

          if (error) {
            window.location.replace(
              `/signup?error=${encodeURIComponent(error.message)}`
            )
            return
          }

          if (type === "recovery") {
            window.location.replace(PASSWORD_RESET_NEXT)
            return
          }

          window.location.replace("/onboarding")
          return
        }
      }

      const code = url.searchParams.get("code")
      const tokenHash = url.searchParams.get("token_hash")
      if (
        (code || tokenHash) &&
        !url.pathname.startsWith("/auth/callback")
      ) {
        const params = new URLSearchParams(url.searchParams)
        if (tokenHash && !params.get("type")) {
          params.set("type", "email")
        }
        if (code && !params.get("type") && !params.get("next")) {
          params.set("type", "signup")
        }
        window.location.replace(`/auth/callback?${params.toString()}`)
      }
    }

    void run()
  }, [])

  return null
}
