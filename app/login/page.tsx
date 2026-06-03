import { LoginForm } from "@/components/login-form"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirectTo?: string }>
}) {
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const error = params.error?.trim() || null
  const message =
    params.message === "password-updated"
      ? "Password updated. Sign in with your new password."
      : null
  const redirectTo =
    typeof params.redirectTo === "string" && params.redirectTo.startsWith("/")
      ? params.redirectTo
      : null

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm error={error} message={message} redirectTo={redirectTo} />
      </div>
    </div>
  )
}
