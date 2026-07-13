const previews = [
  {
    title: "Deck analysis",
    eyebrow: "Investor readiness",
    score: "87",
    label: "Strong",
    bars: [
      { label: "Problem", value: 92 },
      { label: "Solution", value: 88 },
      { label: "Market", value: 84 },
      { label: "Traction", value: 76 },
    ],
  },
  {
    title: "Financial model",
    eyebrow: "36-month projection",
    score: "36",
    label: "Months",
    bars: [
      { label: "Revenue", value: 78 },
      { label: "Burn", value: 64 },
      { label: "Runway", value: 71 },
      { label: "Raise fit", value: 83 },
    ],
  },
  {
    title: "Investor matches",
    eyebrow: "Ranked shortlist",
    score: "25",
    label: "Matches",
    bars: [
      { label: "Stage fit", value: 94 },
      { label: "Sector fit", value: 89 },
      { label: "Cheque fit", value: 81 },
      { label: "Outreach angle", value: 86 },
    ],
  },
]

export function ScreenshotsSection() {
  return (
    <section className="border-y border-border/50 bg-[#F5F1E7]/50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-heading text-3xl font-normal tracking-tight md:text-4xl">
            See the platform in action
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            From deck feedback to financial planning and investor discovery, RaiseWise
            keeps your raise preparation in one place.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {previews.map((preview) => (
            <div
              key={preview.title}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shell-shadow)]"
            >
              <div className="border-b border-border/50 bg-[#1A3C2A] px-5 py-4 text-[#E8F0EB]">
                <p className="text-[0.65rem] font-medium tracking-[0.16em] text-[#C9A84C] uppercase">
                  {preview.eyebrow}
                </p>
                <p className="font-heading mt-1 text-lg">{preview.title}</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-heading text-4xl leading-none text-foreground">
                      {preview.score}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{preview.label}</p>
                  </div>
                  <div className="rounded-full border border-[#C9A84C]/30 bg-[#FBF3E0] px-3 py-1 text-xs font-medium text-[#8C7025]">
                    RaiseWise
                  </div>
                </div>
                <div className="space-y-3">
                  {preview.bars.map((bar) => (
                    <div key={bar.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground">{bar.label}</span>
                        <span className="text-muted-foreground">{bar.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#E8F0EB]">
                        <div
                          className="h-full rounded-full bg-[#1A3C2A]"
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
