"use client"

import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatAuthErrorMessage } from "@/lib/auth/auth-error-message"
import { buildRecoveryCallbackUrlForBrowser } from "@/lib/auth/recovery-redirect"
import { createClient } from "@/lib/supabase/client"

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)

    const form = event.currentTarget
    const email = new FormData(form).get("email")

    if (typeof email !== "string" || !email.trim()) {
      setError("Enter a valid email address")
      setLoading(false)
      return
    }

    try {
      const redirectTo = buildRecoveryCallbackUrlForBrowser()
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      )

      if (resetError) {
        setError(formatAuthErrorMessage(resetError))
        setLoading(false)
        return
      }

      setSent(true)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not send reset email. Try again in a private window."
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert className="border-[#1A3C2A]/25 bg-[#E8F0EB] text-[#1A3C2A]">
          <AlertDescription>
            If an account exists for that email, a reset link is on its way. Open
            the link in this same browser (or request again here if you use another
            device). The link expires in 1 hour.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Back to login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircleIcon className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Back to login
        </Link>
      </p>
    </form>
  )
}
