import { LandingHeader } from "@/components/marketing/landing-header"
import { SiteFooter } from "@/components/layout/footer"

export const metadata = { title: "About · RaiseWise" }

export default function AboutPage() {
  return (
    <main className="md:fixed md:inset-0 md:overflow-y-auto md:overscroll-y-contain bg-background">
      <LandingHeader />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium tracking-tight">About RaiseWise</h1>
        <div className="prose prose-sm mt-6 max-w-none">
          <p>
            RaiseWise helps founders close the gap between a draft pitch and an investor-ready
            raise. Analyse your deck, build a defensible financial model, and find the right
            investors — in one workspace.
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
