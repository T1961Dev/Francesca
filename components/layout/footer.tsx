import Link from "next/link"

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "tomasjonesdev@gmail.com"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/55 bg-background/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} RaiseWise. All rights reserved.</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  )
}
