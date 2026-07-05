import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import { getProfile } from "@/lib/auth"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"

export default async function Page() {
  const profile = await getProfile()
  const plan = profile?.plan ?? "free"
  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ||
    profile?.company_name?.trim() ||
    "founder"

  const modules = [
    [
      "Deck Analyser",
      "Upload and score your investor deck.",
      "/dashboard/deck-analyser",
    ],
    [
      "Financial Model",
      "Generate a 36-month funding model.",
      "/dashboard/financial-model",
    ],
    [
      "Investor Matching",
      "Rank relevant investors and outreach.",
      "/dashboard/investor-matching",
    ],
  ] as const

  return (
    <main className={dashboardPageMainClass}>
      <div className="shrink-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyse your deck, model your raise, and match with investors.
            </p>
          </div>
          <Badge variant={plan === "free" ? "accent" : "default"}>{plan}</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <FeaturePhotoCard
            eyebrow="Today"
            title={
              <>
                Make your raise sound like <FeatureEm>you.</FeatureEm>
              </>
            }
            description="Upload your deck and we will score readiness, missing sections, and the strongest narrative angle for your stage."
            cta={{ label: "Analyse a deck", href: "/dashboard/deck-analyser" }}
          />
          <Card size="sm" className="justify-between">
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className="space-y-1">
                  <p className="font-heading text-[2rem] leading-none">36 mo</p>
                  <p className="text-xs text-muted-foreground">funding model</p>
                </div>
                <div className="space-y-1">
                  <p className="font-heading text-[2rem] leading-none">~150</p>
                  <p className="text-xs text-muted-foreground">investor leads</p>
                </div>
                <div className="space-y-1">
                  <p className="font-heading text-[2rem] leading-none">PDF</p>
                  <p className="text-xs text-muted-foreground">
                    exportable reports
                  </p>
                </div>
              </div>
            </CardContent>
            <div className="mx-5 mb-5 rounded-lg border border-accent-foreground/10 bg-accent p-4">
              <p className="text-[0.8rem] font-medium text-foreground">
                Founder profile ready
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-accent-foreground/85">
                Keep reports, models, and investor matching aligned to your raise.
              </p>
              <Button asChild size="xs" className="mt-2.5">
                <Link href="/dashboard/settings">Review profile</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <p className="shrink-0 text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Modules
        </p>
        <div className="pb-1">
          <div className="grid gap-4 md:grid-cols-3">
            {modules.map(([title, body, href]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{body}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={href}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
