import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FeaturePhotoCardProps = {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  cta?: { label: string; href: string }
  className?: string
  size?: "default" | "sm"
}

export function FeaturePhotoCard({
  eyebrow,
  title,
  description,
  cta,
  className,
  size = "default",
}: FeaturePhotoCardProps) {
  const isSmall = size === "sm"
  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-xl bg-[#070605] text-[#F7F0E6] ring-1 ring-black/5",
        isSmall ? "min-h-28 items-center p-4" : "min-h-[8.5rem] items-center p-6 md:p-7",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.95) 0%, rgba(0,0,0,.78) 35%, rgba(0,0,0,.18) 100%), radial-gradient(42% 95% at 74% 24%, rgba(201,168,76,.92), transparent 60%), radial-gradient(34% 82% at 92% 68%, rgba(26,60,42,.88), transparent 68%), radial-gradient(30% 72% at 62% 18%, rgba(85,112,95,.72), transparent 64%), radial-gradient(72% 72% at 24% 105%, rgba(26,60,42,.86), transparent 73%), linear-gradient(90deg, #07120d 0%, #0f1f17 42%, #1a3c2a 100%)",
          backgroundBlendMode:
            "normal, screen, multiply, screen, screen, normal",
          filter: "saturate(1.05) contrast(1.05)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,.38) 0 1px, transparent 1px), radial-gradient(circle at 70% 40%, rgba(0,0,0,.18) 0 1px, transparent 1px)",
          backgroundSize: "10px 10px, 16px 16px",
        }}
      />
      <div className="relative z-10">
        {eyebrow ? (
          <p
            className={cn(
              "mb-2 font-medium text-[#F7F0E6]/70",
              isSmall
                ? "text-[0.65rem] tracking-[0.18em] uppercase"
                : "text-xs tracking-[0.18em] uppercase"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h3
          className={cn(
            "font-heading font-normal tracking-tight text-[#F7F0E6]",
            isSmall
              ? "text-xl leading-snug"
              : "text-[1.55rem] leading-tight md:text-[1.85rem]"
          )}
        >
          {title}
        </h3>
        {description ? (
          <p
            className={cn(
              "mt-2 max-w-xl text-[#F7F0E6]/75",
              isSmall ? "text-xs leading-relaxed" : "text-sm md:text-[0.9375rem]"
            )}
          >
            {description}
          </p>
        ) : null}
        {cta ? (
          <Button
            asChild
            variant="secondary"
            size={isSmall ? "sm" : "default"}
            className={cn(
              "mt-4 bg-[#F0E6D5] text-[#1A1410] shadow-none hover:bg-[#E8DCC6] focus-visible:ring-[#F7F0E6]/30",
              !isSmall && "mt-5"
            )}
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/* Italicised serif emphasis used inside FeaturePhotoCard titles. */
export function FeatureEm({ children }: { children: React.ReactNode }) {
  return <span className="italic text-[#F7F0E6]">{children}</span>
}
