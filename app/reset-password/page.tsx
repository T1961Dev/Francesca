import Link from "next/link"

import { getCurrentUser } from "@/lib/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { updatePasswordAction } from "@/lib/auth/update-password-action"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams
  const error = params.error?.trim() || null

  if (!user) {
    return (
      <main className="flex h-svh flex-col items-center justify-center overflow-y-auto p-6 py-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Reset link expired</CardTitle>
            <CardDescription>
              Open the link from your email in one browser window, or request a
              new reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Your session could not be started from this link. Request a new
                password reset email and try again in a private window.
              </AlertDescription>
            </Alert>
            <p className="text-center text-sm">
              <Link
                href="/forgot-password"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Request a new reset link
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex h-svh flex-col items-center justify-center overflow-y-auto p-6 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form action={updatePasswordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
              />
            </div>
            <SubmitButton
              className="w-full"
              idleText="Update password"
              pendingText="Updating..."
            />
            <p className="text-center text-sm text-muted-foreground">
              <a
                href="/login"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Back to login
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
