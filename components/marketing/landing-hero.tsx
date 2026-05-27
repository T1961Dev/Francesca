import Link from "next/link"
import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"

export function LandingHero() {
  return (
    <section className="border-b border-border/50 bg-background">
      <div className="mx-auto grid min-h-[620px] max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/raisewise-logo.png"
                alt="RaiseWise"
                width={172}
                height={48}
                priority
                className="h-10 w-auto object-contain"
              />
              <Badge variant="accent" className="ml-1">
                Beta
              </Badge>
            </div>
            <h1 className="font-heading max-w-4xl text-4xl leading-[1.06] font-normal tracking-tight md:text-6xl">
              Analyse your deck, model your raise, and find relevant{" "}
              <span className="italic">investors.</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Upload your pitch deck, get an investor-readiness score, build a
              funding model, and generate a ranked investor list.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Analyse your deck</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
        <FeaturePhotoCard
          eyebrow="Today"
          title={
            <>
              Make your raise sound like <FeatureEm>you.</FeatureEm>
            </>
          }
          description="Upload your deck and we score readiness, missing sections, and the angle most likely to land with investors."
          cta={{ label: "Start now", href: "/signup" }}
          className="md:p-10"
        />
      </div>
    </section>
  )
}
