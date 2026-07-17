import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { RaiseBriefEditor } from "@/components/raise-brief/raise-brief-editor"
import { StrategyReview } from "@/components/raise-brief/strategy-review"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { canGenerateRaiseBrief } from "@/lib/access"
import { requireAuth, getProfile } from "@/lib/auth"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"
import {
  RaiseBriefProductionSchema,
  RaiseBriefStrategySchema,
} from "@/lib/raise-brief/schemas"
import { createClient } from "@/lib/supabase/server"
import type { Plan } from "@/types/app"

export default async function RaiseBriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireAuth()
  const profile = await getProfile()
  const plan = (profile?.plan as Plan | undefined) ?? "free"

  if (!canGenerateRaiseBrief(plan)) {
    redirect("/pricing")
  }

  const supabase = await createClient()
  const { data: brief } = await supabase
    .from("raise_briefs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!brief) notFound()

  const status = String(brief.status)
  const strategy = brief.strategy
    ? RaiseBriefStrategySchema.safeParse(brief.strategy)
    : null
  const production = brief.production
    ? RaiseBriefProductionSchema.safeParse(brief.production)
    : null

  return (
    <main className={dashboardPageMainClass}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Raise Brief · {status.replace(/_/g, " ")}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
            {strategy?.success
              ? strategy.data.primary_investment_angle
              : "Strategy in progress"}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Review the strategy first. Production only runs after you confirm the
            angle and any critical facts.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/raise-brief">All versions</Link>
        </Button>
      </div>

      {status === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription>
            {String(brief.error ?? "Something went wrong. Start a new Raise Brief.")}
          </AlertDescription>
        </Alert>
      ) : null}

      {status === "strategy_pending" || status === "producing" ? (
        <Alert>
          <AlertTitle>
            {status === "producing" ? "Producing your Raise Brief…" : "Building strategy…"}
          </AlertTitle>
          <AlertDescription>
            This usually takes under a minute. Refresh if the page does not update.
          </AlertDescription>
        </Alert>
      ) : null}

      {strategy?.success &&
      (status === "strategy_ready" || (status === "ready" && !production?.success)) ? (
        <StrategyReview briefId={id} initialStrategy={strategy.data} />
      ) : null}

      {status === "ready" && production?.success ? (
        <div className="space-y-4">
          {strategy?.success ? (
            <details className="rounded-xl border border-border/60 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                View strategy & disclosure decisions
              </summary>
              <div className="mt-4">
                <StrategyReview briefId={id} initialStrategy={strategy.data} />
              </div>
            </details>
          ) : null}
          <RaiseBriefEditor briefId={id} initialProduction={production.data} />
        </div>
      ) : null}
    </main>
  )
}
