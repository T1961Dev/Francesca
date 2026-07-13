import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function BrandLogo({
  className,
  showTagline = true,
  taglineClassName,
  href = "/",
}: {
  className?: string
  showTagline?: boolean
  taglineClassName?: string
  href?: string
}) {
  const content = (
    <div className={cn("flex items-start gap-3", className)}>
      <Image
        src="/brand/raisewise-icon.png"
        alt=""
        width={44}
        height={44}
        className="size-10 shrink-0 rounded-lg object-cover sm:size-11"
        priority
      />
      <div className="min-w-0 pt-0.5">
        <p className="leading-none">
          <span className="text-lg font-semibold tracking-tight text-[#1A3C2A] sm:text-xl">
            Raise
          </span>{" "}
          <span className="text-lg font-semibold tracking-tight text-[#C9A84C] sm:text-xl">
            Wise
          </span>
        </p>
        {showTagline ? (
          <p
            className={cn(
              "mt-1.5 max-w-xs text-sm font-medium leading-snug text-[#3D5A49] sm:text-[0.95rem]",
              taglineClassName
            )}
          >
            Your unfair advantage in fundraising.
          </p>
        ) : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    )
  }

  return content
}
