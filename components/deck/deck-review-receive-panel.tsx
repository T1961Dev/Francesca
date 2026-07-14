const RECEIVE_ITEMS = [
  "Overall investor readiness score",
  "Strengths and weaknesses by section",
  "Missing proof points",
  "Narrative and messaging feedback",
  "Priority improvements before investor meetings",
]

export function DeckReviewReceivePanel() {
  return (
    <div className="relative flex min-h-[8.5rem] overflow-hidden rounded-xl bg-[#070605] p-6 text-[#F7F0E6] ring-1 ring-black/5 md:p-7">
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
          What you&apos;ll receive
        </p>
        <ul className="space-y-2.5">
          {RECEIVE_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-snug text-[#F7F0E6]/85">
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#C9A84C]"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
