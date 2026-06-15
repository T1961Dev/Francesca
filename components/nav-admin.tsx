"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type AdminNavItem = {
  title: string
  url: string
  icon?: React.ReactNode
}

export function NavAdmin({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname()

  function navItemIsActive(url: string) {
    if (url === "/admin") {
      return pathname === "/admin" || pathname === "/admin/"
    }
    return pathname === url || pathname.startsWith(`${url}/`)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Admin
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const routeActive = navItemIsActive(item.url)
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={routeActive}>
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
