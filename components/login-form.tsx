import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/ui/submit-button"
import { cn } from "@/lib/utils"
import { loginAction } from "@/lib/auth/login-action"

type LoginFormProps = React.ComponentProps<"div"> & {
  error?: string | null
  message?: string | null
  redirectTo?: string | null
}

export function LoginForm({
  className,
  error,
  message,
  redirectTo,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use the email and password for your RaiseWise account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <Alert className="mb-4 border-[#1A3C2A]/25 bg-[#E8F0EB] text-[#1A3C2A]">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form action={loginAction}>
            {redirectTo ? (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            ) : null}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 max-[360px]:flex-col max-[360px]:items-start">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    prefetch
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline max-[360px]:ml-0"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <SubmitButton idleText="Sign in" pendingText="Signing in..." />
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
