import Link from "next/link"
import { EyeIcon } from "lucide-react"

import { FeatureEm, FeaturePhotoCard } from "@/components/feature-photo-card"
import { HeroProductPreview } from "@/components/marketing/hero-product-preview"
import { Button } from "@/components/ui/button"

export function LandingHero() {
  return (
    <section className="border-b border-border/50 bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
        <div className="space-y-8">
          <div className="space-y-5">
            <h1 className="font-heading max-w-4xl text-4xl leading-[1.06] font-normal tracking-tight md:text-5xl lg:text-6xl">
              Everything you need to raise your next round.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              From your first pitch deck to your investor shortlist, RaiseWise helps you
              prepare, validate and execute your raise, all in one platform.
            </p>
          </div>
          <div className="space-y-3">
            <Button asChild size="lg">
              <Link href="/signup">Analyse my deck</Link>
            </Button>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <EyeIcon className="size-4 shrink-0 text-[#C9A84C]" aria-hidden />
              See your company through an investor&apos;s eyes.
            </p>
          </div>
        </div>

        <HeroProductPreview />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16 lg:pb-20">
        <FeaturePhotoCard
          title={
            <>
              Raise like you&apos;ve done it <FeatureEm>before.</FeatureEm>
            </>
          }
          description="Everything you need to prepare, validate and execute your raise, before you speak to a single investor."
          className="md:p-10"
        />
      </div>
    </section>
  )
}
