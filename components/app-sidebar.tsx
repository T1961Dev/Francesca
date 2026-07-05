"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavAdmin } from "@/components/nav-admin"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SidebarUpgradeCard } from "@/components/sidebar-upgrade-card"
import {
  AlertTriangleIcon,
  AudioLinesIcon,
  CreditCardIcon,
  FileTextIcon,
  FilterIcon,
  GemIcon,
  LineChartIcon,
  ReceiptIcon,
  Settings2Icon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

const iconCls = "size-4 stroke-[1.5]"

export type AppSidebarUser = {
  id: string
  email: string
  userMetadata?: Record<string, unknown> | null
}

export type AppSidebarProfile = {
  full_name: string | null
  company_name: string | null
  plan: string | null
  email: string | null
} | null

export function AppSidebar({
  user,
  profile,
  isAdmin = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: AppSidebarUser
  profile: AppSidebarProfile
  isAdmin?: boolean
}) {
  const meta = user.userMetadata as
    | { full_name?: string; avatar_url?: string }
    | null
    | undefined

  const displayEmail =
    profile?.email?.trim() || user.email?.trim() || ""

  const displayName =
    profile?.full_name?.trim() ||
    meta?.full_name?.trim() ||
    (displayEmail ? displayEmail.split("@")[0] : "Account")

  const companyLabel = "RaiseWise"
  const planLabel = (profile?.plan ?? "free").toLowerCase()

  const teams = [
    {
      name: companyLabel,
      logo: "/brand/raisewise-icon.png",
      plan: planLabel,
      tagline: "Your unfair advantage in fundraising.",
    },
  ]

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <AudioLinesIcon className={iconCls} />,
    },
    {
      title: "Deck Analyser",
      url: "/dashboard/deck-analyser",
      icon: <FileTextIcon className={iconCls} />,
    },
    {
      title: "Financial Model",
      url: "/dashboard/financial-model",
      icon: <LineChartIcon className={iconCls} />,
    },
    {
      title: "Investor Matching",
      url: "/dashboard/investor-matching",
      icon: <TargetIcon className={iconCls} />,
    },
    {
      title: "Billing",
      url: "/dashboard/billing",
      icon: <CreditCardIcon className={iconCls} />,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: <Settings2Icon className={iconCls} />,
    },
  ]

  const navUser = {
    name: displayName,
    email: displayEmail,
    avatar: meta?.avatar_url ?? null,
  }

  const adminNavIcons: Record<string, React.ReactNode> = {
    Users: <UsersIcon className={iconCls} />,
    Lifetime: <GemIcon className={iconCls} />,
    Revenue: <TrendingUpIcon className={iconCls} />,
    Costs: <ReceiptIcon className={iconCls} />,
    Funnel: <FilterIcon className={iconCls} />,
    Failures: <AlertTriangleIcon className={iconCls} />,
  }

  const adminNav = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    icon: adminNavIcons[item.title],
  }))

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {isAdmin ? <NavAdmin items={adminNav} /> : null}
      </SidebarContent>
      <SidebarFooter className="gap-1">
        <SidebarUpgradeCard visible={planLabel === "free"} />
        <NavUser user={navUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
