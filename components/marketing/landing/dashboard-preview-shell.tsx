import Image from "next/image"
import type { ReactNode } from "react"

import {
  AudioLinesIcon,
  CreditCardIcon,
  FileTextIcon,
  LineChartIcon,
  PanelLeftIcon,
  Settings2Icon,
  TargetIcon,
} from "lucide-react"

export const PREVIEW_FOUNDER = {
  name: "Lucille G. Kellogg",
  email: "LucilleGKellogg@noname.com",
  initials: "LK",
  company: "Anonymised 789",
}

const iconCls = "size-3.5 shrink-0 stroke-[1.5]"

const navItems = [
  { title: "Workspace", icon: AudioLinesIcon, active: false },
  { title: "Pitch Deck", icon: FileTextIcon, activeKey: "deck" as const },
  { title: "Financials", icon: LineChartIcon, activeKey: "financial" as const },
  { title: "Investors", icon: TargetIcon, activeKey: "investors" as const },
  { title: "Billing", icon: CreditCardIcon, active: false },
  { title: "Settings", icon: Settings2Icon, active: false },
]

export function DashboardPreviewShell({
  active = "deck",
  breadcrumb,
  children,
  className,
}: {
  active?: "deck" | "financial" | "investors" | "dashboard"
  breadcrumb: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`dashboard-preview-root min-w-0 max-w-full overflow-hidden rounded-[22px] border border-border/60 bg-background text-foreground shadow-[var(--shell-shadow)] ${className ?? ""}`}
    >
      <div className="flex min-h-[340px] min-w-0 sm:min-h-[420px]">
        <aside className="hidden w-[188px] shrink-0 flex-col border-r border-border/45 bg-card/40 md:flex">
          <div className="border-b border-border/45 p-3">
            <div className="flex items-start gap-2.5">
              <Image
                src="/brand/raisewise-icon.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="leading-none">
                  <span className="text-sm font-semibold text-[#1A3C2A]">Raise</span>{" "}
                  <span className="text-sm font-semibold text-[#C9A84C]">Wise</span>
                </p>
                <p className="mt-1 line-clamp-2 text-[0.62rem] leading-snug text-muted-foreground">
                  Your unfair advantage in fundraising.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-2 py-3">
            <p className="px-2 pb-2 text-[0.58rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Platform
            </p>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  item.activeKey === active ||
                  (item.title === "Workspace" && active === "dashboard")
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.72rem] font-medium ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className={iconCls} />
                    <span className="truncate">{item.title}</span>
                  </div>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-border/45 p-2">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[0.62rem] font-semibold text-primary-foreground">
                {PREVIEW_FOUNDER.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.72rem] font-medium">{PREVIEW_FOUNDER.name}</p>
                <p className="truncate text-[0.62rem] text-muted-foreground">
                  {PREVIEW_FOUNDER.email}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border/45 bg-card/80 px-3">
            <PanelLeftIcon className="size-4 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 truncate font-heading text-xs text-muted-foreground">
              {breadcrumb}
            </p>
            <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[0.55rem] font-semibold text-primary-foreground">
                {PREVIEW_FOUNDER.initials}
              </div>
            </div>
          </header>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-background p-2.5 sm:p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function PreviewGradientBar({
  value,
  className,
  innerClassName,
  animate = false,
}: {
  value: number
  className?: string
  innerClassName?: string
  animate?: boolean
}) {
  return (
    <div className={`h-1.5 max-w-full overflow-hidden rounded-sm bg-secondary ${className ?? ""}`}>
      <div
        className={`preview-score-bar-inner h-full max-w-full bg-gradient-to-r from-[#070605] to-[#DF9C4E] ${innerClassName ?? ""}`}
        data-w={animate ? value : undefined}
        style={animate ? { width: 0 } : { width: `${value}%` }}
      />
    </div>
  )
}
