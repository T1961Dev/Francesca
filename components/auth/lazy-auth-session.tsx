"use client"

import dynamic from "next/dynamic"

const AuthSessionFromUrl = dynamic(
  () =>
    import("@/components/auth/auth-session-from-url").then(
      (m) => m.AuthSessionFromUrl
    ),
  { ssr: false }
)

export function LazyAuthSession() {
  return <AuthSessionFromUrl />
}
