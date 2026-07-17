import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatPrice } from "@/lib/billing/currency"
import { detectCurrencyFromRequest } from "@/lib/billing/currency.server"
import { fetchLifetimeInventory } from "@/lib/stripe/lifetime-inventory"
import { getPlan } from "@/lib/stripe/plans"

function PlanFeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#C9A84C]" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

const freeFeatures = [
  "Analyse one pitch deck",
  "Investor readiness score",
  "High-level investor feedback",
  "Upgrade whenever you're ready",
]

const starterFeatures = [
  "Comprehensive investor feedback",
  "Full pitch deck report",
  "Investor-ready financial model",
  "Export reports as PDF",
]

const proFeatures = [
  "Everything in Starter",
  "Ranked investor shortlist",
  "Personalised outreach emails",
  "Raise Brief",
  "Export investor database",
]

const lifetimeFeatures = [
  "Everything in Pro",
  "Available to only 50 founding customers.",
  "Priority support & early access to future features.",
]

export async function LandingPricingSection() {
  const currency = await detectCurrencyFromRequest()
  const lifetime = await fetchLifetimeInventory()

  const starterPlan = getPlan("starter")
  const proPlan = getPlan("pro")
  const lifetimePlan = getPlan("lifetime")

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
      <div className="mb-10 max-w-3xl space-y-4">
        <h2 className="font-heading text-3xl font-normal tracking-tight md:text-4xl">
          Start free. Upgrade when you&apos;re ready to raise.
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Start with a free analysis. Upgrade when you need deeper insights,
          investor-ready financial planning and tailored investor outreach.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          RaiseWise isn&apos;t here to replace fundraising advisors. It&apos;s here to help
          every founder prepare like they already have one.
        </p>
        <p className="text-sm font-medium text-foreground">
          Choose the plan that matches your fundraising stage. Upgrade only when you need
          more support.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <p className="mt-1 text-2xl font-medium">{formatPrice(0, currency)}</p>
          </CardHeader>
          <CardContent>
            <PlanFeatureList items={freeFeatures} />
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/signup">Get started</Link>
            </Button>
          </CardFooter>
        </Card>

        {starterPlan ? (
          <Card className="border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle>Starter</CardTitle>
              <p className="mt-1 text-2xl font-medium">
                {formatPrice(starterPlan.prices[currency], currency)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            </CardHeader>
            <CardContent>
              <PlanFeatureList items={starterFeatures} />
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/signup?plan=starter&currency=${currency}`}>
                  Choose Starter
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {proPlan ? (
          <Card className="border-[#C9A84C]/40 bg-card ring-2 ring-[#C9A84C]/25">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Pro</CardTitle>
                <Badge className="bg-[#1A3C2A] text-[#FBF3E0]">Most popular</Badge>
              </div>
              <p className="mt-1 text-2xl font-medium">
                {formatPrice(proPlan.prices[currency], currency)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            </CardHeader>
            <CardContent>
              <PlanFeatureList items={proFeatures} />
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/signup?plan=pro&currency=${currency}`}>Choose Pro</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {lifetimePlan && !lifetime.soldOut ? (
          <Card className="border-border/70 bg-card/95">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Lifetime</CardTitle>
                <Badge variant="accent">Founding Edition</Badge>
              </div>
              <p className="mt-1 text-2xl font-medium">
                {formatPrice(lifetimePlan.prices[currency], currency)}
                <span className="text-sm font-normal text-muted-foreground"> once</span>
              </p>
            </CardHeader>
            <CardContent>
              <PlanFeatureList items={lifetimeFeatures} />
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/signup?plan=lifetime&currency=${currency}`}>
                  Choose Lifetime
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
