/**
 * User-facing copy for Supabase Auth errors (signup, login, password reset).
 */
export function formatAuthErrorMessage(error: { message: string }): string {
  const raw = error.message.trim()
  const lower = raw.toLowerCase()

  if (lower.includes("rate limit") && lower.includes("email")) {
    return (
      "Too many sign-in or verification emails were sent recently. " +
      "Supabase limits this to about 2 emails per hour on the default mailer. " +
      "Wait up to an hour, try a different email (e.g. you+test2@gmail.com), " +
      "or in the Supabase dashboard turn off Confirm email for local testing " +
      "or connect custom SMTP (see docs/SUPABASE-AUTH-REDIRECTS.md)."
    )
  }

  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with this email already exists. Sign in instead."
  }

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password."
  }

  if (lower.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the verification link."
  }

  return raw
}
