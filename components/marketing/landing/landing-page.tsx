import Link from "next/link"
import { Fraunces } from "next/font/google"

import {
  ArrowDownIcon,
  EyeSupportIcon,
  LinkedInIcon,
  MailIcon,
  PlusIcon,
  UsersTrustIcon,
  XIcon,
} from "@/components/marketing/landing/landing-icons"
import { LandingPricingBlock } from "@/components/marketing/landing/landing-pricing"
import {
  FinancialDashboardShot,
  HeroReadinessShot,
  InvestorDiscoveryShot,
} from "@/components/marketing/landing/landing-shots"
import { LandingMobileNav } from "@/components/marketing/landing/landing-mobile-nav"
import { LandingBrand, LandingEffects } from "@/components/marketing/landing/landing-shared"

import "./landing.css"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
})

const faqs = [
  [
    "What file types are supported?",
    "PDF and PowerPoint (.pptx). Simply upload your pitch deck as it is, there's no need to reformat or convert anything.",
  ],
  [
    "How does investor matching work?",
    "RaiseWise analyses your pitch deck, funding stage, sector and fundraising goals to identify investors who are actively investing in companies like yours. Instead of giving you a generic database, we provide a ranked shortlist based on relevance and investment fit.",
  ],
  [
    "Is my pitch deck private?",
    "Yes. Your pitch deck is private by default and only accessible to you. Your data is never shared, sold or made available to investors, other founders or third parties without your explicit permission. We take security seriously, using encryption and industry-standard safeguards to protect your information at every stage.",
  ],
  [
    "Where does the investor data come from?",
    "We combine multiple trusted, verified live data sources to deliver investor recommendations that are active, relevant and aligned with your fundraising goals, not static lists that become outdated the moment you download them.",
  ],
  [
    "Do I need a paid plan?",
    "No. You can upload one pitch deck and receive your Fundraising Readiness Score completely free. Upgrade only when you want access to your full analysis, investor-ready financial model, investor matches and outreach tools.",
  ],
  [
    "How long does the analysis take?",
    "Most analyses are completed in just a few minutes, depending on the size and complexity of your pitch deck.",
  ],
  [
    "Is RaiseWise suitable for first-time founders?",
    "Absolutely. Whether you're raising your first pre-seed round or preparing for Series A, RaiseWise helps you understand what investors look for and prepare with greater confidence.",
  ],
  [
    "Will RaiseWise guarantee funding?",
    "No. No platform can guarantee investment. RaiseWise is designed to help you present your business more effectively, strengthen your fundraising materials and connect with investors who are a better fit for your company.",
  ],
]

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "tomasjonesdev@gmail.com"

export function LandingPage() {
  return (
    <div className={`landing-page ${fraunces.variable}`}>
      <LandingEffects />

      <header>
        <div className="wrap nav">
          <LandingBrand />
          <nav className="menu">
            <Link href="#workflow">How it works</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQs</Link>
            <Link href="/about">About</Link>
          </nav>
          <div className="nav-actions">
            <Link className="login" href="/login">
              Log in
            </Link>
            <Link className="btn small" href="/signup">
              Analyse my deck
            </Link>
          </div>
          <LandingMobileNav />
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="reveal">
            <h1 className="serif">
              Everything you need to raise your <em>next round.</em>
            </h1>
            <p className="sub">
              From your first pitch deck to your investor shortlist, RaiseWise helps you prepare,
              validate and execute your raise, all in one platform.
            </p>
            <Link className="btn" href="/signup">
              Analyse my deck <span className="arrow">→</span>
            </Link>
            <p className="support">
              <EyeSupportIcon />
              See your company through an investor&apos;s eyes.
            </p>
          </div>
          <div className="reveal" style={{ transitionDelay: ".15s" }}>
            <HeroReadinessShot />
          </div>
        </div>
      </section>

      <section className="trust">
        <div className="wrap">
          <div className="trust-card reveal">
            <div className="trust-icon">
              <UsersTrustIcon />
            </div>
            <h2 className="serif">Built on thousands of real fundraising journeys.</h2>
            <p>
              RaiseWise has been refined using thousands of pitch decks, financial models and
              investor interactions from founders around the world.
            </p>
          </div>
        </div>
      </section>

      <section className="sect" id="workflow">
        <div className="wrap center">
          <div className="reveal">
            <p className="eyebrow">How it works</p>
            <h2 className="h2 serif">Built around how founders actually raise capital.</h2>
          </div>
          <div className="steps">
            <div className="step reveal">
              <span className="n serif">01</span>
              <h3 className="serif">Pitch Deck Review</h3>
              <p>Understand how investors will evaluate your pitch before your first meeting.</p>
            </div>
            <div className="step reveal" style={{ transitionDelay: ".1s" }}>
              <span className="n serif">02</span>
              <h3 className="serif">Financial Planning</h3>
              <p>
                Build an investor-ready financial model that supports your story with credible
                numbers.
              </p>
            </div>
            <div className="step reveal" style={{ transitionDelay: ".2s" }}>
              <span className="n serif">03</span>
              <h3 className="serif">Investor Discovery</h3>
              <p>
                Find investors who actively back companies like yours, ranked by relevance and fit.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase">
        <div className="wrap center">
          <div className="reveal">
            <p className="eyebrow">Financial planning</p>
            <h2 className="h2 serif">Credible numbers, without the spreadsheet.</h2>
          </div>
          <div className="dash reveal">
            <FinancialDashboardShot />
          </div>
        </div>
      </section>

      <section className="why">
        <div className="wrap">
          <div className="why-card reveal">
            <p className="eyebrow">Why founders choose RaiseWise</p>
            <h2 className="h2 serif">Preparing a raise used to be expensive.</h2>
            <div className="ladder">
              <div className="rung">
                <h4 className="serif">Fundraising consultant</h4>
                <span className="cost serif">
                  £2,000 to £10,000 <small>can cost, per engagement</small>
                </span>
              </div>
              <div className="down-arrow">
                <ArrowDownIcon />
              </div>
              <div className="rung">
                <h4 className="serif">Financial model</h4>
                <span className="cost serif">
                  From £1,000 <small>often starts at, when outsourced</small>
                </span>
              </div>
              <div className="down-arrow">
                <ArrowDownIcon />
              </div>
              <div className="rung">
                <h4 className="serif">Investor research</h4>
                <span className="cost serif">
                  Days or weeks <small>by hand</small>
                </span>
              </div>
              <div className="down-arrow">
                <ArrowDownIcon />
              </div>
              <div className="rung final">
                <h4 className="serif">RaiseWise</h4>
                <span className="cost serif">One platform.</span>
              </div>
            </div>
          </div>
          <p className="advisor-note reveal">
            RaiseWise isn&apos;t here to replace fundraising advisors. It&apos;s here to help every
            founder prepare like they already have one.
          </p>
        </div>
      </section>

      <section className="emotion">
        <div className="glow" />
        <svg className="arc" width="900" height="300" viewBox="0 0 900 300" fill="none" aria-hidden>
          <path
            d="M0,290 C220,220 420,140 640,90 C730,70 820,58 900,52"
            stroke="url(#arcGrad)"
            strokeWidth="1.4"
          />
          <path
            d="M0,300 C230,240 440,170 660,120 C750,100 830,88 900,82"
            stroke="rgba(26,60,42,.10)"
            strokeWidth="1"
          />
          <circle cx="640" cy="90" r="3.5" fill="#C9A84C" />
          <defs>
            <linearGradient id="arcGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(201,168,76,0)" />
              <stop offset="55%" stopColor="rgba(201,168,76,.55)" />
              <stop offset="100%" stopColor="rgba(201,168,76,.15)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="wrap reveal">
          <p className="eyebrow">A better way to prepare your raise</p>
          <h2 className="serif">
            Fundraising is hard enough.
            <br />
            Preparing for it <em>shouldn&apos;t be.</em>
          </h2>
          <p>
            RaiseWise helps you spend less time guessing what investors want, and more time building
            the company they&apos;re excited to invest in.
          </p>
        </div>
      </section>

      <LandingPricingBlock />

      <section className="discovery">
        <div className="wrap center">
          <div className="reveal">
            <p className="eyebrow">Investor discovery</p>
            <h2 className="h2 serif">A shortlist, not a database.</h2>
            <p className="lede">
              Ranked by relevance and fit, with the context you need to make every approach count.
            </p>
          </div>
          <div className="reveal" style={{ marginTop: 56 }}>
            <InvestorDiscoveryShot />
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <div className="cta-card reveal">
            <div>
              <h2 className="serif">Raise like you&apos;ve done it before.</h2>
              <p>
                Everything you need to prepare, validate and execute your raise, before you speak to
                a single investor.
              </p>
            </div>
            <Link className="btn light" href="/signup">
              Analyse my deck <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="wrap center">
          <div className="reveal">
            <p className="eyebrow">FAQ</p>
            <h2 className="h2 serif">Questions founders ask before they raise.</h2>
          </div>
          <div className="faq-list reveal">
            {faqs.map(([question, answer]) => (
              <div className="qa" key={question}>
                <button type="button">
                  {question}
                  <span className="chev">
                    <PlusIcon />
                  </span>
                </button>
                <div className="ans">
                  <p>{answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot">
          <div>
            <LandingBrand />
            <p className="legal">© {new Date().getFullYear()} RaiseWise. All rights reserved.</p>
          </div>
          <nav>
            <Link href="#workflow">How it works</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQs</Link>
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </nav>
          <div className="socials">
            <a className="soc" href="#" aria-label="LinkedIn">
              <LinkedInIcon />
            </a>
            <a className="soc" href="#" aria-label="X">
              <XIcon />
            </a>
            <a className="soc" href={`mailto:${SUPPORT_EMAIL}`} aria-label="Email">
              <MailIcon />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
