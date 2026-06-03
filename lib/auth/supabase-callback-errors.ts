/** User-facing copy for Supabase auth redirect errors (query or hash). */

export function formatSupabaseCallbackError(
  params: URLSearchParams | { get: (key: string) => string | null }
): string {
  const code = params.get("error_code") ?? params.get("error") ?? ""
  const description = params.get("error_description") ?? ""

  if (code === "otp_expired" || description.toLowerCase().includes("expired")) {
    return (
      "This confirmation link has expired or was already used. " +
      "Sign up again to get a new email, or sign in if you already confirmed. " +
      "Open the link in a private window — some inboxes preview links and invalidate them."
    )
  }

  if (code === "access_denied") {
    return description
      ? decodeURIComponent(description.replace(/\+/g, " "))
      : "Email confirmation was denied or cancelled."
  }

  if (description) {
    return decodeURIComponent(description.replace(/\+/g, " "))
  }

  return "Email confirmation failed. Try signing up again or sign in."
}
