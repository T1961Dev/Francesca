"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { MenuIcon, XIcon } from "lucide-react"

const links = [
  { href: "#workflow", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQs" },
  { href: "/about", label: "About" },
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

export function LandingMobileNav() {
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
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <XIcon size={20} strokeWidth={1.8} /> : <MenuIcon size={20} strokeWidth={1.8} />}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="mobile-nav-backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            ref={panelRef}
            className="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            tabIndex={-1}
          >
            <nav className="mobile-nav-links">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mobile-nav-actions">
              <Link className="login" href="/login" onClick={() => setOpen(false)}>
                Log in
              </Link>
              <Link className="btn small" href="/signup" onClick={() => setOpen(false)}>
                Analyse my deck
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
