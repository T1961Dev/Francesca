"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"

export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Image
        src="/brand/raisewise-icon.png"
        alt=""
        width={size}
        height={size}
        className="size-full object-cover"
        priority
      />
    </span>
  )
}

export function LandingBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <BrandMark />
      <span className="brand-text">
        <span className="name">RaiseWise</span>
        <span className="payoff">Your unfair advantage in fundraising.</span>
      </span>
    </Link>
  )
}

export function LandingEffects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in")
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll(".landing-page .reveal").forEach((el) => io.observe(el))

    const heroShot = document.getElementById("heroShot")
    if (heroShot) {
      const heroIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            heroIO.unobserve(heroShot)

            heroShot.querySelectorAll<HTMLElement>(".preview-score-bar-inner[data-w]").forEach((bar) => {
              const width = bar.getAttribute("data-w")
              if (reduced) bar.style.transition = "none"
              requestAnimationFrame(() => {
                if (width) bar.style.width = `${width}%`
              })
            })

            const scoreEl = document.getElementById("scoreNum")
            if (scoreEl) {
              if (reduced) {
                scoreEl.textContent = "87"
                return
              }
              const target = 87
              const duration = 1500
              let start: number | null = null
              const tick = (timestamp: number) => {
                if (!start) start = timestamp
                const progress = Math.min((timestamp - start) / duration, 1)
                const eased = 1 - (1 - progress) ** 3
                scoreEl.textContent = String(Math.round(eased * target))
                if (progress < 1) requestAnimationFrame(tick)
              }
              requestAnimationFrame(tick)
            }
          })
        },
        { threshold: 0.35 }
      )
      heroIO.observe(heroShot)
    }

    const faqButtons = document.querySelectorAll<HTMLButtonElement>(".landing-page .qa button")
    const onFaqClick = (event: Event) => {
      const btn = event.currentTarget as HTMLButtonElement
      const qa = btn.parentElement
      const ans = qa?.querySelector<HTMLElement>(".ans")
      if (!qa || !ans) return

      const open = qa.classList.contains("open")
      document.querySelectorAll(".landing-page .qa.open").forEach((item) => {
        item.classList.remove("open")
        item.querySelector("button")?.setAttribute("aria-expanded", "false")
        const panel = item.querySelector<HTMLElement>(".ans")
        if (panel) panel.style.maxHeight = ""
      })
      if (!open) {
        qa.classList.add("open")
        btn.setAttribute("aria-expanded", "true")
        ans.style.maxHeight = `${ans.scrollHeight}px`
      }
    }

    faqButtons.forEach((btn) => btn.addEventListener("click", onFaqClick))

    return () => {
      io.disconnect()
      faqButtons.forEach((btn) => btn.removeEventListener("click", onFaqClick))
    }
  }, [])

  return null
}
