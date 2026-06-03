# Supabase auth redirect URLs (local + production)

Password reset and signup emails only work if Supabase is allowed to redirect back to your app.

## Environment

Set in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Use your real staging/production URL in deployed environments.

## Supabase Dashboard

**Authentication → URL configuration**

| Setting | Local dev | Production (Render) |
|---------|-----------|---------------------|
| **Site URL** | `http://localhost:3000` | `https://francesca-sy16.onrender.com` (your live host) |
| **Redirect URLs** | Add each line below | Same with production host |

**Critical:** If **Site URL** is still `https://localhost:10000` (or any localhost), confirmation links will open the wrong host even when Render env vars are correct. Update Site URL to match production.

## Render environment variables

Set on the Render service (not only locally):

```env
NEXT_PUBLIC_APP_URL=https://francesca-sy16.onrender.com
APP_URL=https://francesca-sy16.onrender.com
```

Render also sets `RENDER_EXTERNAL_URL` automatically; the app uses it as a fallback in production if `NEXT_PUBLIC_APP_URL` still points at localhost.

After changing env vars, **redeploy** and **sign up again** so the new confirmation email contains the correct `redirect_to` URL.

Add these **Redirect URLs** (wildcards help for query strings):

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback/**
http://localhost:3000/reset-password
https://francesca-sy16.onrender.com/auth/callback
https://francesca-sy16.onrender.com/auth/callback/**
https://francesca-sy16.onrender.com/reset-password
```

If redirect URLs are missing, Supabase falls back to **Site URL** (`/`), which is why reset links can land on the landing page.

## Password reset flow

1. User submits email on `/forgot-password`
2. Email link → Supabase verify → `http://localhost:3000/auth/callback?type=recovery&next=/reset-password&code=...`
3. App exchanges `code` for a session and redirects to `/reset-password`
4. User sets a new password → sign in at `/login`

## Signup confirmation (`otp_expired`)

If you see `error_code=otp_expired` or “Email link is invalid or has expired”:

1. Fix **Site URL** and **Redirect URLs** above (must be your Render host, not localhost).
2. Fix **Render** `NEXT_PUBLIC_APP_URL`, redeploy, and **create a new signup** (old emails still point at the old URL).
3. Open the **latest** email link in a **private/incognito** window (Gmail/Outlook often prefetch links and burn one-time tokens).

With confirm email enabled, the link should hit `/auth/callback?type=signup&code=...` then `/onboarding`.

## Email link preloading

Some mail clients prefetch links and consume one-time tokens. If reset links fail immediately, resend the email and open the link in a private window.

## “Email rate limit exceeded” while testing

This comes from **Supabase**, not the RaiseWise app. On the **built-in email provider**, Supabase allows only about **2 auth emails per hour** for the whole project (signup, password reset, magic links, etc.).

### Quick fixes for local QA

1. **Wait** — limits reset after roughly an hour.
2. **Use a new address** — Gmail/Outlook plus tags work: `you+signup1@gmail.com`, `you+signup2@gmail.com`.
3. **Delete test users** — Supabase Dashboard → **Authentication → Users** → delete the test account, then sign up with a **different** email (deleting does not always reset the email quota for that address immediately).
4. **Disable confirm email (dev only)** — Dashboard → **Authentication → Providers → Email** → turn off **Confirm email**. New signups get a session immediately and **no verification email** is sent (our app already redirects to `/onboarding` when `data.session` exists).
5. **Custom SMTP (recommended for real staging)** — Dashboard → **Authentication → SMTP** → e.g. Resend. Limits move to your provider; you can also raise **Authentication → Rate limits → Email sent** in Supabase.
6. **Sign in instead** — If the account already exists from earlier tests, use **Sign in** rather than signing up again.

### RaiseWise app limits (separate)

The app also rate-limits signup/login forms (about 5 attempts per email per 10 minutes). That message says “Too many attempts. Try again in a minute.” — different from Supabase’s email rate limit.
