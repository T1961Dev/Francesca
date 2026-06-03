import { SignupForm } from "@/components/signup-form"
import { getCurrentUser } from "@/lib/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verify?: string }>
}) {
  const params = await searchParams
  const verifyEmail = params.verify?.trim() || null

  if (!verifyEmail) {
    const user = await getCurrentUser()
    if (user) {
      redirect("/dashboard")
    }
  }

  const error = params.error?.trim() || null

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {verifyEmail ? (
          <Card>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We sent a verification link to <strong>{verifyEmail}</strong>.
                Click it to activate your account, then come back to log in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Can&apos;t find it? Check your spam folder, or{" "}
                <a
                  href="/signup"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  try a different email
                </a>
                .
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Already verified?{" "}
                <a
                  href="/login"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Sign in
                </a>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <SignupForm error={error} />
        )}
      </div>
    </div>
  )
}
