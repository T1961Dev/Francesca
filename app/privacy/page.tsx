import { SiteFooter } from "@/components/layout/footer"

export const metadata = { title: "Privacy Policy · RaiseWise" }

export default function PrivacyPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Privacy Policy</h1>
        <div className="prose prose-sm mt-6 max-w-none">
          <p>
            RaiseWise processes personal data to provide deck analysis, financial modelling, and
            investor matching. We only collect what is needed to run the service.
          </p>
          <p>
            You can export or delete your account data at any time from Settings. For privacy
            requests, contact us at the address shown in the app footer.
          </p>
          <p>
            We use trusted processors for hosting, payments, email, analytics, and AI features.
            Data is stored securely and retained only as long as your account is active or as
            required by law.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
