"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { MenuIcon, XIcon } from "lucide-react"

import { BrandLogo } from "@/components/marketing/brand-logo"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "How it works", href: "/#workflow" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQs", href: "/#faq" },
  { label: "About", href: "/about" },
]

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function lockScrollContainers() {
  const nodes = [
    document.documentElement,
    document.body,
    ...Array.from(document.querySelectorAll<HTMLElement>("main")),
  ]
  return nodes.map((el) => {
    const previous = {
      overflow: el.style.overflow,
      overscrollBehavior: el.style.overscrollBehavior,
    }
    el.style.overflow = "hidden"
    el.style.overscrollBehavior = "none"
    return { el, previous }
  })
}

/** Shared marketing chrome for secondary public pages (pricing, about, legal). */
export function LandingHeader() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    const locked = lockScrollContainers()
    const panel = panelRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
          )
        : []

    requestAnimationFrame(() => {
      const items = focusables()
      ;(items[0] ?? panel)?.focus()
    })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        return
      }
      if (event.key !== "Tab" || !panel) return

      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (!panel.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => {
      locked.forEach(({ el, previous }) => {
        el.style.overflow = previous.overflow
        el.style.overscrollBehavior = previous.overscrollBehavior
      })
      window.removeEventListener("keydown", onKey)
      previouslyFocused?.focus?.()
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="relative z-50 mx-auto flex max-w-6xl items-center justify-between gap-4 bg-background/95 px-4 py-3 sm:px-6 sm:py-4">
        <BrandLogo showTagline={false} />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Log in
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/signup">Analyse my deck</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 touch-manipulation md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
          </Button>
        </div>
      </div>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-[3.75rem] z-40 bg-black/25 md:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            tabIndex={-1}
            className="relative z-50 border-t border-border/50 bg-background px-4 py-4 outline-none md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
              <Link
                href="/login"
                className="flex min-h-11 items-center text-sm font-medium text-muted-foreground"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Analyse my deck
                </Link>
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </header>
  )
}
