import { BadgeCheckIcon, Clock3Icon, PoundSterlingIcon } from "lucide-react"

const benefits = [
  {
    icon: PoundSterlingIcon,
    label: "Save thousands in advisor fees",
  },
  {
    icon: Clock3Icon,
    label: "Save weeks of manual work",
  },
  {
    icon: BadgeCheckIcon,
    label: "Raise with more confidence",
  },
]

export function WhyFoundersSection() {
  return (
    <section className="border-y border-border/50 bg-card/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-4">
          <h2 className="font-heading text-3xl font-normal tracking-tight md:text-4xl">
            Why founders choose RaiseWise
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Hiring a fundraising consultant can cost £2,000-£10,000. Building an
            investor-ready financial model often starts at £1,000, while researching the
            right investors can take days or even weeks. RaiseWise brings these essentials
            together in one platform, helping you prepare your raise faster and at a
            fraction of the cost.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {benefits.map((benefit) => (
            <div
              key={benefit.label}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/80 p-4"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1A3C2A] text-[#FBF3E0]">
                <benefit.icon className="size-5" aria-hidden />
              </div>
              <p className="text-sm font-medium leading-snug text-foreground">
                {benefit.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
