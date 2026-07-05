import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const callbackError = params.error?.trim() || null

  return (
    <main className="flex h-svh flex-col items-center justify-center overflow-y-auto p-6 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email to receive a reset link. Use the same browser when you
            open the email link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {callbackError ? (
            <Alert variant="destructive">
              <AlertDescription>{callbackError}</AlertDescription>
            </Alert>
          ) : null}
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </main>
  )
}
