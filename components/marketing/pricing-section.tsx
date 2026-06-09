import Link from "next/link"

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
import { getPlan, plans } from "@/lib/stripe/plans"

export async function PricingSection() {
  const currency = await detectCurrencyFromRequest()
  const lifetime = await fetchLifetimeInventory()

  const visiblePlans = plans.filter((plan) => {
    if (plan.id === "lifetime" && lifetime.soldOut) return false
    return true
  })

  const lifetimePlan = getPlan("lifetime")

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <h2 className="font-heading text-3xl font-medium tracking-tight md:text-4xl">
          Pricing
        </h2>
        <p className="text-muted-foreground">
          Start free, then upgrade when you need full reports and investor matching.
        </p>
        {lifetimePlan && !lifetime.soldOut ? (
          <p className="text-xs text-muted-foreground">
            Lifetime: {lifetime.remaining} of {lifetime.maxCount} remaining
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <Badge variant="accent">Try it</Badge>
            <p className="mt-1 text-2xl font-medium">{formatPrice(0, currency)}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1 deck upload ever</p>
            <p>Overall score + dimensions</p>
            <p>Full feedback locked</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/signup">Get started</Link>
            </Button>
          </CardFooter>
        </Card>
        {visiblePlans.map((plan) => {
          const price = plan.prices[currency]
          const suffix = plan.mode === "subscription" ? "/mo" : " once"
          return (
            <Card
              key={plan.id}
              className={plan.id === "pro" ? "ring-2 ring-primary/40" : undefined}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <Badge>
                  {plan.id === "pro"
                    ? "Best for outreach"
                    : plan.id === "lifetime"
                      ? "Pay once"
                      : "Paid"}
                </Badge>
                <p className="mt-1 text-2xl font-medium">
                  {formatPrice(price, currency)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {suffix}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <p key={feature}>{feature}</p>
                ))}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/signup?plan=${plan.id}&currency=${currency}`}>
                    Choose {plan.name}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
