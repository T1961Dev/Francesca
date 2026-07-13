"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MenuIcon, XIcon } from "lucide-react"

const links = [
  { href: "#workflow", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQs" },
  { href: "/about", label: "About" },
]

export function LandingMobileNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={open}
        aria-controls="landing-mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <XIcon size={20} strokeWidth={1.8} /> : <MenuIcon size={20} strokeWidth={1.8} />}
      </button>

      {open ? (
        <div
          id="landing-mobile-menu"
          className="mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
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
      ) : null}
    </div>
  )
}
