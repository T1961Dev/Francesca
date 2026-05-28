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
import { resetPasswordAction } from "@/lib/auth/reset-password-action"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const params = await searchParams
  const error = params.error?.trim() || null
  const sent = params.sent === "true"

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {sent
              ? "Check your inbox for a reset link."
              : "Enter your email to receive a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {sent ? (
            <div className="space-y-4">
              <Alert className="border-[#1A3C2A]/25 bg-[#E8F0EB] text-[#1A3C2A]">
                <AlertDescription>
                  If an account exists for that email, a reset link is on its
                  way. The link expires in 1 hour.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                <a
                  href="/login"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Back to login
                </a>
              </p>
            </div>
          ) : (
            <form action={resetPasswordAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <SubmitButton
                className="w-full"
                idleText="Send reset link"
                pendingText="Sending..."
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
          )}
        </CardContent>
      </Card>
    </main>
  )
}
