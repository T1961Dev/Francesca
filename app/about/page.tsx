import { SiteFooter } from "@/components/layout/footer"

export const metadata = { title: "About · RaiseWise" }

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium tracking-tight">About RaiseWise</h1>
        <p className="mt-2 inline-block rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
          ⚠ Placeholder — final content pending client review.
        </p>
        <div className="prose prose-sm mt-6 max-w-none">
          <p>
            RaiseWise helps founders close the gap between a draft pitch and an investor-ready
            raise. Analyse your deck, build a defensible financial model, and find the right
            investors — in one workspace.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
