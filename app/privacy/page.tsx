import { SiteFooter } from "@/components/layout/footer"

export const metadata = { title: "Privacy Policy · RaiseWise" }

export default function PrivacyPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Privacy Policy</h1>
        <p className="mt-2 inline-block rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
          ⚠ Placeholder — final content pending client legal review.
        </p>
        <div className="prose prose-sm mt-6 max-w-none">
          <p>
            We process personal data to provide the RaiseWise service. You can download or delete
            your data at any time from Settings.
          </p>
          <p>
            Topics to cover: data we collect, lawful basis, third-party processors (Supabase,
            Stripe, Resend, OpenAI, Apify, PostHog, Sentry), data retention, international
            transfers, your rights, contact for DPO.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
