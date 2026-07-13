import { UsersIcon } from "lucide-react"

export function CredibilityStrip() {
  return (
    <section className="border-y border-[#1A3C2A]/10 bg-[#DCE8E1]/70">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#1A3C2A] text-[#FBF3E0]">
            <UsersIcon className="size-5" aria-hidden />
          </div>
          <h2 className="font-heading max-w-xs text-2xl leading-tight font-normal tracking-tight text-foreground md:text-3xl">
            Built on thousands of real fundraising journeys.
          </h2>
        </div>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          RaiseWise has been refined using thousands of pitch decks, financial models and
          investor interactions from founders around the world.
        </p>
      </div>
    </section>
  )
}
