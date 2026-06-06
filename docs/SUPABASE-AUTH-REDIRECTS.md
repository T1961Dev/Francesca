# Supabase auth redirect URLs (local + production)

Password reset and signup emails only work if Supabase and **Render env vars** agree on your public host.

## Environment (Render production)

Set on the Render service — **then trigger a full redeploy** (rebuild, not just restart):

```env
APP_URL=https://francesca-sy16.onrender.com
NEXT_PUBLIC_APP_URL=https://francesca-sy16.onrender.com
```

Delete any of these if they still point at Render’s internal host:

- `NEXT_PUBLIC_APP_URL=http://localhost:10000`
- `SITE_URL=http://localhost:10000`

| Variable | Role |
|----------|------|
| **`APP_URL`** | **Primary** for server auth emails (`emailRedirectTo`, `redirectTo`). Read at **runtime** on each signup/reset. |
| **`NEXT_PUBLIC_APP_URL`** | Fallback only. If this was `http://localhost:10000` at **build time**, it is baked into the client bundle — fix the value and **redeploy**. |
| **`RENDER_EXTERNAL_URL`** | Auto-set by Render; used if `APP_URL` is missing or unsafe. |

### Verify after deploy

Open:

```
https://francesca-sy16.onrender.com/api/health/app-url
```

You want:

```json
{
  "ok": true,
  "appUrl": "https://francesca-sy16.onrender.com",
  "signupCallback": "https://francesca-sy16.onrender.com/auth/callback?type=signup",
  "unsafe": false
}
```

If `unsafe: true`, `signupCallbackError` is set, or `candidates` shows an unsafe host, fix Render env vars and redeploy again.

If the health check is **OK** but email links still show `localhost:10000`, the problem is almost certainly **Supabase Site URL** (not the app). Set Site URL to your production host in the dashboard, then send a **new** signup/reset email.

### What the code does (no `request.origin` for auth emails)

- Signup: `emailRedirectTo: buildAuthCallbackUrl("signup")` → uses `APP_URL` first, never `request.nextUrl.origin`.
- Reset: `redirectTo: buildAuthCallbackUrl("recovery")` → same.
- After email click: `/auth/callback` redirects using `getPublicAppUrl()`, not the internal Render host.

## Supabase Dashboard

**Authentication → URL configuration**

| Setting | Production |
|---------|------------|
| **Site URL** | `https://francesca-sy16.onrender.com` |
| **Redirect URLs** | `https://francesca-sy16.onrender.com/auth/callback` and `https://francesca-sy16.onrender.com/auth/callback/**` |

**Do not** use `https://localhost:10000` as Site URL in production.

Optional for local dev only:

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback/**
```

## Password reset flow

1. User submits email on `/forgot-password` (**browser client** — stores PKCE verifier in cookies)
2. Email link → Supabase verify → `https://francesca-sy16.onrender.com/auth/callback?type=recovery&next=/reset-password&code=...`
3. App exchanges `code` → session → `/reset-password`
4. New password → sign in at `/login`

**PKCE / “code challenge does not match”**

- Request the reset on `/forgot-password` in the **same browser** you will use to open the email link.
- Open the link once, preferably in a **private window** (mail apps sometimes prefetch links).
- If it still fails, request a **new** reset email after deploy.

## Signup confirmation

1. User signs up on production
2. Email link should target `https://francesca-sy16.onrender.com/auth/callback?type=signup&code=...`
3. App exchanges code → `/onboarding`

## Signup `otp_expired`

If you see `error_code=otp_expired`:

1. Fix Render env + Supabase Site URL (above).
2. **Redeploy** and sign up with a **new email** (old emails still have the old `redirect_to`).
3. Open the link in **incognito** (mail clients often prefetch links).

## Resend SMTP for Supabase Auth (recommended)

Use the **same Resend account** as product emails (`docs/RESEND-EMAILS.md`). Auth mail (confirm signup, reset password) goes through Supabase → Resend SMTP; welcome / score-ready / upgrade emails still use the Resend SDK in the app.

Guide: [Send emails using Supabase with SMTP](https://resend.com/docs/send-with-supabase-smtp)

### Prerequisites

1. [Verify your domain](https://resend.com/domains) in Resend (e.g. `raisewise.app`).
2. Create or reuse a Resend API key (store in Render + `.env.local` as `RESEND_API_KEY` for the app).

### Supabase dashboard

**Authentication → Email → SMTP Settings** (enable custom SMTP)

| Field | Value |
|-------|--------|
| **Enable custom SMTP** | On |
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | Your Resend API key (`re_…`) |
| **Sender email** | Address on your verified domain, e.g. `hello@raisewise.app` |
| **Sender name** | `RaiseWise` |

Use the **same sender** as `RESEND_FROM_EMAIL` in Render so auth and product mail match:

```env
RESEND_FROM_EMAIL="RaiseWise <hello@raisewise.app>"
```

Click **Save**. Supabase sends all auth emails via Resend after this.

### Still required (SMTP does not fix redirects)

- **Authentication → URL configuration**: Site URL + `/auth/callback` redirect URLs (see above).
- **Render**: `APP_URL` / `NEXT_PUBLIC_APP_URL` set to production host.

### Optional: email templates

**Authentication → Email → Templates** — edit Confirm signup / Reset password copy and subjects. Links must keep Supabase placeholders (`{{ .ConfirmationURL }}`, etc.).

### Test

1. Request password reset or sign up with a **new** email.
2. In [Resend → Emails](https://resend.com/emails), confirm the message was sent.
3. Open the link in a **private window**; it should hit `/auth/callback` on your production host.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Auth email not received | Resend dashboard → check bounces; domain DNS verified |
| Link still `localhost:10000` | Fix Supabase Site URL + Render `APP_URL`, redeploy, **new** email |
| SMTP auth failed | Password = full API key; username exactly `resend`; port `465` |

## Email rate limit (built-in Supabase mailer only)

Without custom SMTP, built-in mailer ≈ 2 auth emails/hour. **Resend SMTP removes that cap** for auth mail.

## Email link preloading

Open reset/confirm links in a private window if the first click fails.

## `ERR_TOO_MANY_REDIRECTS` on forgot-password / login

The proxy must only forward Supabase params (`code`, `token_hash`, `error_code`) to
`/auth/callback`, not app form messages (`?error=` on `/forgot-password`, `/login`, etc.).
A redirect loop looked like: `/forgot-password?error=…` → `/auth/callback` → `/login?error=…` → repeat.

After fixing, clear cookies for the site and retry.
