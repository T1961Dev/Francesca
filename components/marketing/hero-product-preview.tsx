const categories = [
  { label: "Story", score: 92 },
  { label: "Market", score: 88 },
  { label: "Business model", score: 84 },
  { label: "Traction", score: 76 },
  { label: "Financials", score: 81 },
  { label: "Team", score: 90 },
]

export function HeroProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shell-shadow)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Investor readiness
          </p>
          <p className="font-heading mt-1 text-lg text-foreground">Deck analysis</p>
        </div>
        <div className="rounded-full border border-[#C9A84C]/30 bg-[#FBF3E0] px-3 py-1 text-xs font-medium text-[#8C7025]">
          Strong
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className="mx-auto flex size-32 items-center justify-center rounded-full border-8 border-[#E8F0EB] bg-background sm:mx-0">
          <div className="text-center">
            <p className="font-heading text-4xl leading-none text-foreground">87</p>
            <p className="mt-1 text-xs text-muted-foreground">/ 100</p>
          </div>
        </div>

        <div className="space-y-3">
          {categories.map((item) => (
            <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">{item.score}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#E8F0EB]">
                  <div
                    className="h-full rounded-full bg-[#1A3C2A]"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
