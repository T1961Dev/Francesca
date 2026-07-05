import { SiteFooter } from "@/components/layout/footer"

export const metadata = { title: "Terms of Service · RaiseWise" }

export default function TermsPage() {
  return (
    <main className="fixed inset-0 overflow-y-auto overscroll-y-contain bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Terms of Service</h1>
        <div className="prose prose-sm mt-6 max-w-none">
          <p>
            By using RaiseWise you agree to these terms. The service is provided for founders
            preparing to raise investment; outputs are guidance, not financial or legal advice.
          </p>
          <p>
            You keep ownership of content you upload. Subscriptions renew according to the plan you
            choose and can be cancelled from Billing. Refunds follow the policy shown at checkout.
          </p>
          <p>
            We may suspend accounts that abuse the service or violate applicable law. RaiseWise is
            provided as-is within the limits permitted by law.
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
