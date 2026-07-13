import Link from "next/link"

import { BrandLogo } from "@/components/marketing/brand-logo"

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "tomasjonesdev@gmail.com"

export function LandingFooter() {
  return (
    <footer className="border-t border-border/55 bg-background/90">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-start">
          <BrandLogo href="/" taglineClassName="max-w-sm text-sm sm:text-base" />
          <nav className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <Link href="#how-it-works" className="hover:text-foreground">
              How it works
            </Link>
            <Link href="#pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="#faqs" className="hover:text-foreground">
              FAQs
            </Link>
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">
              Contact
            </a>
          </nav>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} RaiseWise. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
