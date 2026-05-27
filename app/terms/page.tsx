import { SiteFooter } from "@/components/layout/footer"

export const metadata = { title: "Terms of Service · RaiseWise" }

export default function TermsPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Terms of Service</h1>
        <p className="mt-2 inline-block rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
          ⚠ Placeholder — final content pending client legal review.
        </p>
        <div className="prose prose-sm mt-6 max-w-none">
          <p>
            This page is a placeholder. The final Terms of Service must be reviewed and approved by
            the client&apos;s solicitor before launch.
          </p>
          <p>
            Topics to cover: account creation, acceptable use, payment terms, subscription
            lifecycle, cancellations and refunds, content ownership, limitation of liability,
            governing law.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
