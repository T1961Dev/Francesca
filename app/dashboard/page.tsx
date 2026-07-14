import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FundraisingJourneyTracker } from "@/components/dashboard/fundraising-journey-tracker"
import {
  NextStepActions,
  WorkspaceProgressCard,
} from "@/components/dashboard/workspace-progress"
import { getProfile, requireAuth } from "@/lib/auth"
import { getWorkspaceJourney } from "@/lib/dashboard/journey"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"
import { cn } from "@/lib/utils"

export default async function Page() {
  const user = await requireAuth()
  const profile = await getProfile()
  const plan = profile?.plan ?? "free"
  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ||
    profile?.company_name?.trim() ||
    "founder"

  const journey = await getWorkspaceJourney(user.id, profile)

  const modules = [
    [
      "Pitch Deck",
      "Analyse your pitch deck and receive a detailed fundraising assessment.",
      "/dashboard/deck-analyser",
    ],
    [
      "Financials",
      "Build an investor-ready financial model tailored to your raise.",
      "/dashboard/financial-model",
    ],
    [
      "Investors",
      "Discover investors who actively invest in companies like yours.",
      "/dashboard/investor-matching",
    ],
  ] as const

  return (
    <main className={dashboardPageMainClass}>
      <div className="shrink-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Let&apos;s get you investor-ready. Complete each step to prepare your raise with
              confidence.
            </p>
          </div>
          <Badge variant={plan === "free" ? "accent" : "default"}>{plan}</Badge>
        </div>

        <FundraisingJourneyTracker
          steps={journey.steps}
          currentStepId={journey.currentStepId}
        />

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <div
            className={cn(
              "relative flex min-h-[8.5rem] items-center overflow-hidden rounded-xl bg-[#070605] p-6 text-[#F7F0E6] ring-1 ring-black/5 md:p-7"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,.95) 0%, rgba(0,0,0,.78) 35%, rgba(0,0,0,.18) 100%), radial-gradient(42% 95% at 74% 24%, rgba(201,168,76,.92), transparent 60%), radial-gradient(34% 82% at 92% 68%, rgba(26,60,42,.88), transparent 68%), radial-gradient(30% 72% at 62% 18%, rgba(85,112,95,.72), transparent 64%), radial-gradient(72% 72% at 24% 105%, rgba(26,60,42,.86), transparent 73%), linear-gradient(90deg, #07120d 0%, #0f1f17 42%, #1a3c2a 100%)",
                backgroundBlendMode: "normal, screen, multiply, screen, screen, normal",
                filter: "saturate(1.05) contrast(1.05)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,.38) 0 1px, transparent 1px), radial-gradient(circle at 70% 40%, rgba(0,0,0,.18) 0 1px, transparent 1px)",
                backgroundSize: "10px 10px, 16px 16px",
              }}
            />
            <div className="relative z-10 min-w-0">
              <p className="mb-2 text-xs font-medium tracking-[0.18em] text-[#F7F0E6]/70 uppercase">
                {journey.next.eyebrow}
              </p>
              <h3 className="font-heading text-[1.55rem] font-normal leading-tight tracking-tight text-[#F7F0E6] md:text-[1.85rem]">
                {journey.next.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm text-[#F7F0E6]/75 md:text-[0.9375rem]">
                {journey.next.description}
              </p>
              {journey.next.detail ? (
                <p className="mt-2 max-w-xl rounded-lg bg-white/10 px-3 py-2 text-sm leading-relaxed text-[#F7F0E6]">
                  {journey.next.detail}
                </p>
              ) : null}
              <NextStepActions action={journey.next} />
            </div>
          </div>

          <WorkspaceProgressCard
            items={journey.checklist}
            profileComplete={journey.checklist.find((item) => item.id === "profile")?.done ?? false}
          />
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
