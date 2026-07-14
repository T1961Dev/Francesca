import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DashboardPreviewShell,
  PREVIEW_FOUNDER,
  PreviewGradientBar,
} from "@/components/marketing/landing/dashboard-preview-shell"

const categories = [
  {
    category: "Problem clarity",
    score: 88,
    feedback: "Clear articulation of the market pain and why it matters now.",
  },
  {
    category: "Solution strength",
    score: 84,
    feedback: "Product differentiation is credible with a focused wedge.",
  },
  {
    category: "Market size",
    score: 79,
    feedback: "TAM is framed sensibly, though bottom-up detail could go deeper.",
  },
  {
    category: "Traction",
    score: 82,
    feedback: "Early revenue signals and pipeline give investors something tangible.",
  },
]

export function HeroReadinessShot() {
  return (
    <div className="shot float-anim min-w-0 max-w-full" id="heroShot">
      <DashboardPreviewShell
        active="deck"
        breadcrumb="Your fundraising workspace"
      >
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-base font-medium tracking-tight sm:text-lg">
                Welcome back, {PREVIEW_FOUNDER.name.split(" ")[0]}
              </h3>
              <p className="text-[0.7rem] text-muted-foreground">
                Deck analysis · {PREVIEW_FOUNDER.company}
              </p>
            </div>
            <Badge className="shrink-0">pro</Badge>
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
            <Card className="min-w-0 bg-muted/20">
              <CardHeader className="px-3 pb-1 pt-3">
                <CardTitle className="text-sm">Investor-readiness score</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 px-3 pb-3">
                <div className="min-w-0 rounded-xl bg-card p-3 ring-1 ring-border/55">
                  <p className="bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text font-heading text-4xl leading-none text-transparent">
                    <span id="scoreNum">0</span>
                    <span className="ml-1 font-sans text-xs text-muted-foreground [-webkit-text-fill-color:currentColor]">
                      /100
                    </span>
                  </p>
                  <p className="mt-1 bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text text-[0.65rem] font-medium text-transparent">
                    Strong
                  </p>
                  <PreviewGradientBar value={87} className="preview-score-bar mt-2 max-w-full" animate />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 pb-1 pt-3">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="rounded-lg bg-muted/35 p-2.5 text-[0.68rem] leading-relaxed text-muted-foreground">
                  {PREVIEW_FOUNDER.company} presents a focused B2B SaaS story with credible early
                  traction and a clear path to the next fundraising milestone.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="px-3 pb-1 pt-3">
              <CardTitle className="text-sm">Category breakdown</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="relative min-w-0">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-card to-transparent sm:hidden"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-card to-transparent sm:hidden"
                />
                <div
                  className="flex max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Category scores — swipe to see more"
                >
                  {categories.map((item) => (
                    <div
                      key={item.category}
                      className="min-w-[9.5rem] shrink-0 rounded-lg bg-muted/35 p-2.5 ring-1 ring-border/55"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[0.68rem] font-medium leading-snug">{item.category}</p>
                        <span className="font-heading text-lg leading-none">{item.score}</span>
                      </div>
                      <PreviewGradientBar value={item.score} className="mt-2" />
                      <p className="mt-2 line-clamp-3 text-[0.62rem] leading-relaxed text-muted-foreground">
                        {item.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardPreviewShell>
    </div>
  )
}

export function FinancialDashboardShot() {
  const kpis = [
    { label: "Month 36 revenue", value: "£142k", hint: "Projected monthly revenue" },
    { label: "Cash at month 36", value: "£890k", hint: "14 months runway remaining" },
    { label: "Break-even", value: "Month 22", hint: "Revenue covers burn" },
    { label: "Raise target", value: "£500k", hint: "Current runway: 11 months" },
  ]

  return (
    <div className="shot min-w-0 max-w-full">
      <DashboardPreviewShell active="financial" breadcrumb="Financial model">
        <div className="space-y-3">
          <div>
            <h3 className="font-heading text-lg font-medium tracking-tight">
              {PREVIEW_FOUNDER.company}
            </h3>
            <p className="text-[0.7rem] text-muted-foreground">36-month funding model</p>
          </div>

          <div className="grid auto-rows-min gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => (
              <Card key={item.label} className="bg-muted/20">
                <CardContent className="px-3 py-3">
                  <p className="text-[0.58rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {item.label}
                  </p>
                  <p className="mt-1 bg-gradient-to-r from-[#070605] to-[#DF9C4E] bg-clip-text font-heading text-2xl leading-none text-transparent">
                    {item.value}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[0.62rem] leading-snug text-muted-foreground">
                    {item.hint}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="px-3 pb-1 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">Revenue</CardTitle>
                  <span className="font-heading text-sm text-muted-foreground">£142k</span>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <svg viewBox="0 0 460 120" width="100%" height="120" preserveAspectRatio="none">
                  <line x1="0" y1="30" x2="460" y2="30" stroke="var(--border)" strokeWidth="1" />
                  <line x1="0" y1="60" x2="460" y2="60" stroke="var(--border)" strokeWidth="1" />
                  <line x1="0" y1="90" x2="460" y2="90" stroke="var(--border)" strokeWidth="1" />
                  <path
                    d="M0,110 C60,105 110,92 160,78 C230,58 300,28 380,8 L460,4"
                    fill="none"
                    stroke="#1A3C2A"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M0,110 C60,105 110,92 160,78 C230,58 300,28 380,8 L460,4 L460,120 L0,120 Z"
                    fill="rgba(26,60,42,.07)"
                  />
                </svg>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="px-3 pb-1 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">Cash balance</CardTitle>
                  <span className="font-heading text-sm text-muted-foreground">£890k</span>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <svg viewBox="0 0 460 120" width="100%" height="120" preserveAspectRatio="none">
                  <line x1="0" y1="30" x2="460" y2="30" stroke="var(--border)" strokeWidth="1" />
                  <line x1="0" y1="60" x2="460" y2="60" stroke="var(--border)" strokeWidth="1" />
                  <line x1="0" y1="90" x2="460" y2="90" stroke="var(--border)" strokeWidth="1" />
                  <path
                    d="M0,96 C80,98 160,102 240,104 C320,106 400,106 460,104"
                    fill="none"
                    stroke="#C9A84C"
                    strokeWidth="2.5"
                  />
                </svg>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardPreviewShell>
    </div>
  )
}

const investors = [
  {
    rank: 1,
    name: "Northpoint Ventures",
    firm: "Northpoint Ventures",
    location: "London",
    score: 94,
    stage: "Pre-seed · Seed",
    cheque: "£250k–£750k",
    rationale: "Led 4 seed rounds in vertical SaaS this year, including two UK fintech platforms.",
  },
  {
    rank: 2,
    name: "Elm Court Capital",
    firm: "Elm Court Capital",
    location: "Berlin",
    score: 91,
    stage: "Seed",
    cheque: "€400k–€1M",
    rationale: "Recent investments in founder tooling and marketplace infrastructure across DACH.",
  },
  {
    rank: 3,
    name: "Harbourline Partners",
    firm: "Harbourline Partners",
    location: "New York",
    score: 88,
    stage: "Seed · Series A",
    cheque: "$500k–$1.5M",
    rationale: "Backs European founders expanding into the US with three SaaS deals this year.",
  },
]

export function InvestorDiscoveryShot() {
  return (
    <div className="shot min-w-0 max-w-full">
      <DashboardPreviewShell active="investors" breadcrumb="Investor matching">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading text-base font-medium tracking-tight sm:text-lg">
                Investor shortlist
              </h3>
              <p className="text-[0.7rem] text-muted-foreground">
                Ranked for {PREVIEW_FOUNDER.company}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              25 matches
            </Badge>
          </div>

          <div className="space-y-2">
            {investors.map((investor) => (
              <Card key={investor.rank} className="bg-card/95">
                <CardContent className="px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-[0.62rem] font-semibold text-muted-foreground">
                          #{investor.rank}
                        </span>
                        <p
                          className="truncate text-[0.78rem] font-medium blur-[5px] select-none"
                          aria-hidden
                        >
                          {investor.name}
                        </p>
                        <span className="sr-only">Investor name hidden</span>
                      </div>
                      <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                        {investor.location} · {investor.stage}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-heading text-xl leading-none">{investor.score}</p>
                      <p className="text-[0.58rem] text-muted-foreground">fit score</p>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[0.65rem] leading-relaxed text-muted-foreground">
                    {investor.rationale}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[0.58rem]">
                      {investor.cheque}
                    </Badge>
                    <Badge variant="outline" className="text-[0.58rem]">
                      Outreach ready
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardPreviewShell>
    </div>
  )
}
