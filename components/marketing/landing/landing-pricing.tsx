import Link from "next/link"

import { CheckIcon, LockIcon } from "@/components/marketing/landing/landing-icons"
import { formatPrice } from "@/lib/billing/currency"
import { detectCurrencyFromRequest } from "@/lib/billing/currency.server"
import { fetchLifetimeInventory } from "@/lib/stripe/lifetime-inventory"
import { getPlan } from "@/lib/stripe/plans"

export async function LandingPricingBlock() {
  const currency = await detectCurrencyFromRequest()
  const lifetime = await fetchLifetimeInventory()
  const starterPlan = getPlan("starter")
  const proPlan = getPlan("pro")
  const lifetimePlan = getPlan("lifetime")

  return (
    <section className="pricing" id="pricing">
      <div className="wrap center">
        <div className="reveal">
          <p className="eyebrow">Pricing</p>
          <h2 className="h2 serif">Start free. Upgrade when you&apos;re ready to raise.</h2>
          <p className="lede">
            Start with a free analysis. Upgrade when you need deeper insights, investor-ready
            financial planning and tailored investor outreach.
          </p>
          <p className="lede" style={{ fontSize: 15, marginTop: 14, color: "var(--muted)" }}>
            Choose the plan that matches your fundraising stage. Upgrade only when you need more
            support.
          </p>
        </div>

        <div className="plans">
          <div className="plan reveal">
            <div className="plan-head">
              <h3>Free</h3>
              <span className="badge soft">Try it</span>
            </div>
            <div className="price serif">{formatPrice(0, currency)}</div>
            <ul className="feats">
              <li>
                <CheckIcon />
                Analyse one pitch deck
              </li>
              <li>
                <CheckIcon />
                Investor readiness score
              </li>
              <li>
                <CheckIcon />
                High-level investor feedback
              </li>
              <li>
                <CheckIcon />
                Upgrade whenever you&apos;re ready
              </li>
            </ul>
            <Link className="btn ghost" href="/signup">
              Get started
            </Link>
          </div>

          {starterPlan ? (
            <div className="plan reveal" style={{ transitionDelay: ".05s" }}>
              <div className="plan-head">
                <h3>Starter</h3>
              </div>
              <div className="price serif">
                {formatPrice(starterPlan.prices[currency], currency)}
                <small>/month</small>
              </div>
              <ul className="feats">
                <li>
                  <CheckIcon />
                  Comprehensive investor feedback
                </li>
                <li>
                  <CheckIcon />
                  Full pitch deck report
                </li>
                <li>
                  <CheckIcon />
                  Investor-ready financial model
                </li>
                <li>
                  <CheckIcon />
                  Export reports as PDF
                </li>
              </ul>
              <Link className="btn ghost" href={`/signup?plan=starter&currency=${currency}`}>
                Choose Starter
              </Link>
            </div>
          ) : null}

          {proPlan ? (
            <div className="plan featured reveal" style={{ transitionDelay: ".1s" }}>
              <div className="plan-head">
                <h3>Pro</h3>
                <span className="badge pop">Most popular</span>
              </div>
              <div className="price serif">
                {formatPrice(proPlan.prices[currency], currency)}
                <small>/month</small>
              </div>
              <ul className="feats">
                <li>
                  <CheckIcon />
                  Everything in Starter
                </li>
                <li>
                  <CheckIcon />
                  Ranked investor shortlist
                </li>
                <li>
                  <CheckIcon />
                  Personalised outreach emails
                </li>
                <li>
                  <CheckIcon />
                  Raise Brief
                </li>
                <li>
                  <CheckIcon />
                  Export investor database
                </li>
              </ul>
              <Link className="btn" href={`/signup?plan=pro&currency=${currency}`} style={{ boxShadow: "none" }}>
                Choose Pro
              </Link>
            </div>
          ) : null}

          {lifetimePlan && !lifetime.soldOut ? (
            <div className="plan founding reveal" style={{ transitionDelay: ".15s" }}>
              <div className="plan-head">
                <h3>Lifetime</h3>
                <span className="badge found">Founding Edition</span>
              </div>
              <div className="price serif">
                {formatPrice(lifetimePlan.prices[currency], currency)}
                <small> one-time</small>
              </div>
              <ul className="feats">
                <li>
                  <CheckIcon />
                  Everything in Pro
                </li>
                <li>
                  <CheckIcon />
                  25 ranked investors per run
                </li>
                <li>
                  <CheckIcon />
                  Pay once, no subscription
                </li>
                <li>
                  <CheckIcon />
                  Priority support and early access to future features
                </li>
                <li>
                  <CheckIcon color="#C9A84C" />
                  Available to founding customers only
                </li>
              </ul>
              <Link className="btn ghost" href={`/signup?plan=lifetime&currency=${currency}`}>
                Choose Lifetime
              </Link>
            </div>
          ) : null}
        </div>

        <p className="plans-note">
          <LockIcon />
          Secure payments. Cancel anytime.
        </p>
      </div>
    </section>
  )
}
