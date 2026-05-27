"use client"

import { normaliseLinkedInProfileUrl } from "@/lib/investors/avatar"

export function InvestorIdentityCell({
  name,
  linkedinUrl,
}: {
  name: string
  linkedinUrl?: string | null
}) {
  const profileUrl = normaliseLinkedInProfileUrl(linkedinUrl)
  const displayName = name.trim() || "Unknown investor"

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate font-medium">{displayName}</span>
      {profileUrl ? (
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 rounded-sm text-[#0A66C2] transition-opacity hover:opacity-80"
          aria-label={`Open ${displayName} on LinkedIn`}
          onClick={(event) => event.stopPropagation()}
        >
          <LinkedInLogo className="size-4" />
        </a>
      ) : null}
    </div>
  )
}

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.56V9h3.554v11.452z" />
    </svg>
  )
}
