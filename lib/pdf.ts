import "server-only"

import { createRequire } from "node:module"

import { buildTeaserContent } from "@/lib/deck/teaser-content"
import type { RaiseBriefContent } from "@/lib/raise-brief/schemas"

const require = createRequire(import.meta.url)
const PDFDocument = require("pdfkit/js/pdfkit.standalone.js")

export async function renderDeckAnalysisPdf(input: {
  companyName: string
  overallScore: number
  summary: string
  categoryScores: unknown[]
  strengths: string[]
  weaknesses: string[]
  missingSections: string[]
  investorReadiness: string
  suggestedFixes: unknown[]
  priorityActions: unknown[]
  fundraisingRisks?: string[]
}) {
  return renderPdf("RaiseWise Deck Analysis", [
    ["Company", input.companyName],
    ["Overall score", `${input.overallScore}/100`],
    ["Summary", input.summary],
    ["Category scores", formatStructuredList(input.categoryScores)],
    ["Strengths", formatBullets(input.strengths)],
    ["Weaknesses", formatBullets(input.weaknesses)],
    ["Missing sections", formatBullets(input.missingSections)],
    ["Investor readiness", input.investorReadiness],
    ["Suggested fixes", formatStructuredList(input.suggestedFixes)],
    ["Priority actions", formatStructuredList(input.priorityActions)],
    ["Fundraising risks", formatBullets(input.fundraisingRisks ?? [])],
    ["Generated date", new Date().toLocaleDateString()],
  ])
}

export async function renderInvestorMatchesPdf(input: {
  companyName: string
  runDate: string
  matches: Array<Record<string, unknown>>
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    // Cover page.
    doc.fontSize(22).text("RaiseWise Investor Matches")
    doc.moveDown(0.5)
    doc.fontSize(12).text(`Founder: ${input.companyName}`)
    doc.text(`Generated: ${input.runDate}`)
    doc.text(`Matches: ${input.matches.length}`)

    input.matches.forEach((match, index) => {
      doc.addPage()
      const rank = match.rank ?? index + 1
      const investor = match.investorName ?? "—"
      const firm = match.firmName ?? "—"

      doc.fontSize(18).text(`#${rank} · ${investor}`)
      doc.fontSize(12).text(String(firm))
      doc.moveDown(0.5)

      const rows: [string, unknown][] = [
        ["Role", match.role],
        ["Email", match.email],
        ["LinkedIn", match.linkedinUrl],
        ["Website", match.website],
        ["Location", match.location],
        ["Stage focus", match.investmentStage],
        ["Sector focus", Array.isArray(match.sectorFocus) ? (match.sectorFocus as string[]).join(", ") : match.sectorFocus],
        ["Cheque fit", match.chequeFit],
        ["Cheque size", match.chequeSize],
        ["Fit score", match.fitScore ?? match.matchScore],
      ]

      rows.forEach(([label, value]) => {
        doc.fontSize(10).text(`${label}: ${value ?? "—"}`)
      })

      doc.moveDown(0.5)
      if (match.matchRationale) {
        doc.fontSize(11).text("Why this investor", { underline: true })
        doc.fontSize(10).text(String(match.matchRationale))
        doc.moveDown(0.5)
      }
      if (match.whyNow) {
        doc.fontSize(11).text("Why now", { underline: true })
        doc.fontSize(10).text(String(match.whyNow))
        doc.moveDown(0.5)
      }
      if (match.outreachSubject || match.outreachBody) {
        doc.fontSize(11).text("Outreach draft", { underline: true })
        if (match.outreachSubject) doc.fontSize(10).text(`Subject: ${match.outreachSubject}`)
        if (match.outreachBody) doc.fontSize(10).text(String(match.outreachBody))
      }
    })

    doc.end()
  })
}

export async function renderDeckTeaserPdf(input: {
  companyName: string
  sector?: string | null
  stage?: string | null
  geography?: string | null
  targetRaise?: number | null
  targetRaiseCurrency?: string | null
  summary: string
  investorReadiness: string
  strengths: string[]
  categoryScores: unknown[]
}) {
  const content = buildTeaserContent(input)

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const margin = 48
    const contentWidth = pageWidth - margin * 2
    const columnGap = 20
    const columnWidth = (contentWidth - columnGap) / 2
    const cream = "#FFFDF7"
    const pale = "#F7F4ED"
    const green = "#1A3C2A"
    const gold = "#C9A84C"
    const muted = "#5C6F63"
    const dark = "#12100B"
    const border = "#D8E2DB"
    const preparedDate = new Date().toLocaleDateString("en-GB")

    doc.rect(0, 0, pageWidth, pageHeight).fill(cream)
    doc.rect(0, 0, pageWidth, 118).fill(green)

    doc.fillColor("#DCE8E1").fontSize(8).text("CONFIDENTIAL · INVESTOR OVERVIEW", margin, 28, {
      characterSpacing: 1.2,
    })
    doc.fillColor("#FFFFFF").fontSize(28).text(content.companyName, margin, 46, {
      width: contentWidth - 180,
      lineGap: 1,
    })
    doc.fillColor("#E8F0EB").fontSize(11).text(content.metaLine || "Early-stage company", margin, 88, {
      width: contentWidth - 180,
    })

    doc.roundedRect(pageWidth - margin - 156, 34, 156, 58, 10).fill("#FFFFFF")
    doc.fillColor(muted).fontSize(8).text("RAISING", pageWidth - margin - 144, 46, {
      characterSpacing: 0.8,
    })
    doc.fillColor(green).fontSize(18).text(content.raiseLabel, pageWidth - margin - 144, 60, {
      width: 132,
    })

    let y = 138
    doc
      .fillColor(muted)
      .fontSize(9)
      .text(`Prepared ${preparedDate}`, margin, y, { width: contentWidth, align: "right" })

    y = 168
    teaserSectionLabel(doc, "Overview", margin, y, gold, green)
    const overviewHeight = measureTextHeight(doc, content.overview, contentWidth, 12, 5)
    doc.fillColor(dark).fontSize(12).text(content.overview, margin, y + 22, {
      width: contentWidth,
      lineGap: 5,
    })

    y += 30 + overviewHeight + 18
    const rowOneLeft = drawTeaserBlock(doc, {
      x: margin,
      y,
      width: columnWidth,
      title: "The problem",
      body: content.problem,
      colors: { green, gold, fill: pale, border, dark, muted },
    })
    const rowOneRight = drawTeaserBlock(doc, {
      x: margin + columnWidth + columnGap,
      y,
      width: columnWidth,
      title: "What we do",
      body: content.solution,
      colors: { green, gold, fill: pale, border, dark, muted },
    })
    y += Math.max(rowOneLeft, rowOneRight) + 16

    const rowTwoLeft = drawTeaserBlock(doc, {
      x: margin,
      y,
      width: columnWidth,
      title: "Why now",
      body: content.whyNow,
      colors: { green, gold, fill: pale, border, dark, muted },
    })
    const rowTwoRight = drawTeaserBlock(doc, {
      x: margin + columnWidth + columnGap,
      y,
      width: columnWidth,
      title: "Highlights",
      bullets: content.highlights,
      colors: { green, gold, fill: pale, border, dark, muted },
    })
    y += Math.max(rowTwoLeft, rowTwoRight) + 24

    const footerY = pageHeight - 72
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).strokeColor(border).stroke()
    doc.fillColor(green).fontSize(10).text(content.companyName, margin, footerY + 14)
    doc
      .fillColor(muted)
      .fontSize(8)
      .text(
        "One-page investor overview. Full deck available on request after mutual interest.",
        margin,
        footerY + 30,
        { width: contentWidth - 120, lineGap: 2 }
      )
    doc
      .fillColor(muted)
      .fontSize(8)
      .text("Prepared with RaiseWise", pageWidth - margin - 120, footerY + 14, {
        width: 120,
        align: "right",
      })

    doc.end()
  })
}

export async function renderRaiseBriefPdf(brief: RaiseBriefContent) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const margin = 40
    const contentWidth = pageWidth - margin * 2
    const columnGap = 14
    const columnWidth = (contentWidth - columnGap) / 2
    const cream = "#FFFDF7"
    const pale = "#F7F4ED"
    const green = "#1A3C2A"
    const gold = "#C9A84C"
    const muted = "#5C6F63"
    const dark = "#12100B"
    const border = "#D8E2DB"
    const preparedDate = new Date().toLocaleDateString("en-GB")

    const meta = [
      brief.company_category,
      brief.transaction_overview.round_stage,
    ]
      .filter(Boolean)
      .join(" · ")

    doc.rect(0, 0, pageWidth, pageHeight).fill(cream)
    doc.rect(0, 0, pageWidth, 108).fill(green)

    doc.fillColor("#DCE8E1").fontSize(8).text("CONFIDENTIAL · RAISE BRIEF", margin, 24, {
      characterSpacing: 1.2,
    })
    doc.fillColor("#FFFFFF").fontSize(24).text(brief.company_name, margin, 42, {
      width: contentWidth - 170,
      lineGap: 1,
    })
    doc.fillColor("#E8F0EB").fontSize(10).text(meta || "Investor teaser", margin, 78, {
      width: contentWidth - 170,
    })

    doc.roundedRect(pageWidth - margin - 150, 30, 150, 52, 10).fill("#FFFFFF")
    doc.fillColor(muted).fontSize(7).text("RAISING", pageWidth - margin - 138, 40, {
      characterSpacing: 0.8,
    })
    doc.fillColor(green).fontSize(14).text(brief.transaction_overview.raise_target || "—", pageWidth - margin - 138, 54, {
      width: 126,
    })

    let y = 124
    doc.fillColor(dark).fontSize(13).text(brief.headline, margin, y, {
      width: contentWidth,
      lineGap: 3,
    })
    y += measureTextHeight(doc, brief.headline, contentWidth, 13, 3) + 14

    teaserSectionLabel(doc, "Transaction overview", margin, y, gold, green)
    y += 18
    const tx = [
      brief.transaction_overview.round_stage,
      brief.transaction_overview.use_of_funds,
      brief.transaction_overview.target_milestone,
    ]
      .filter(Boolean)
      .join(" · ")
    doc.fillColor(dark).fontSize(9).text(tx, margin, y, { width: contentWidth, lineGap: 3 })
    y += measureTextHeight(doc, tx, contentWidth, 9, 3) + 12

    const leftHighlights = drawTeaserBlock(doc, {
      x: margin,
      y,
      width: columnWidth,
      title: "Investment highlights",
      bullets: brief.investment_highlights.slice(0, 5),
      colors: { green, gold, fill: pale, border, dark, muted },
    })

    const snapshotLines = brief.financial_snapshot
      .slice(0, 4)
      .map((item) => `${item.label}: ${item.value}${item.type === "projected" ? " (projected)" : ""}`)
    const rightSnapshot = drawTeaserBlock(doc, {
      x: margin + columnWidth + columnGap,
      y,
      width: columnWidth,
      title: "Financial snapshot",
      bullets: snapshotLines,
      colors: { green, gold, fill: pale, border, dark, muted },
    })
    y += Math.max(leftHighlights, rightSnapshot) + 12

    const marketBlock = drawTeaserBlock(doc, {
      x: margin,
      y,
      width: columnWidth,
      title: "Market",
      body: clampWords(brief.market, 70),
      colors: { green, gold, fill: pale, border, dark, muted },
    })
    const contextBlock = drawTeaserBlock(doc, {
      x: margin + columnWidth + columnGap,
      y,
      width: columnWidth,
      title: "Company context",
      body: clampWords(brief.company_context, 70),
      colors: { green, gold, fill: pale, border, dark, muted },
    })
    y += Math.max(marketBlock, contextBlock) + 12

    teaserSectionLabel(doc, "Team credibility", margin, y, gold, green)
    y += 18
    doc.fillColor(dark).fontSize(9).text(clampWords(brief.team_credibility, 40), margin, y, {
      width: contentWidth,
      lineGap: 3,
    })
    y += measureTextHeight(doc, clampWords(brief.team_credibility, 40), contentWidth, 9, 3) + 10

    const footerY = Math.min(y + 8, pageHeight - 64)
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).strokeColor(border).stroke()
    doc.fillColor(green).fontSize(9).text(brief.next_step || "Full investment presentation available through a founder-led discussion.", margin, footerY + 10, {
      width: contentWidth - 130,
      lineGap: 2,
    })
    doc.fillColor(muted).fontSize(7).text(`Prepared ${preparedDate} · RaiseWise`, pageWidth - margin - 120, footerY + 12, {
      width: 120,
      align: "right",
    })

    doc.end()
  })
}

export async function renderFinancialModelPdf(input: {
  companyName: string
  assumptions: unknown
  revenueSummary: string
  burnSummary: string
  cashForecast: string
  fundingNarrative: string
  risks: unknown
}) {
  return renderPdf("RaiseWise Financial Model", [
    ["Company", input.companyName],
    ["Input assumptions", JSON.stringify(input.assumptions, null, 2)],
    ["Revenue summary", input.revenueSummary],
    ["Burn summary", input.burnSummary],
    ["Cash forecast", input.cashForecast],
    ["Funding narrative", input.fundingNarrative],
    ["Risks", JSON.stringify(input.risks, null, 2)],
    ["Generated date", new Date().toLocaleDateString()],
  ])
}

function renderPdf(title: string, sections: [string, string][]) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.fontSize(20).text(title)
    doc.moveDown()

    for (const [heading, body] of sections) {
      doc.fontSize(13).text(heading, { underline: true })
      doc.moveDown(0.25)
      doc.fontSize(10).text(body || "Not provided")
      doc.moveDown()
    }

    doc.end()
  })
}

function formatBullets(items: string[]) {
  if (!items.length) return "Not provided"
  return items.map((item) => `• ${item}`).join("\n")
}

function formatStructuredList(items: unknown[]) {
  if (!items.length) return "Not provided"

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return String(item)

      const record = item as Record<string, unknown>
      const title =
        record.category ?? record.title ?? record.action ?? record.name ?? "Item"
      const score = typeof record.score === "number" ? ` (${record.score}/100)` : ""
      const priority = record.priority ? ` [${record.priority}]` : ""
      const body =
        record.feedback ?? record.explanation ?? record.reason ?? record.rationale ?? ""

      return `• ${title}${score}${priority}${body ? `\n  ${body}` : ""}`
    })
    .join("\n")
}

function clampWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return value.trim()
  return `${words.slice(0, maxWords).join(" ")}…`
}

function formatRaise(amount?: number | null, currency?: string | null) {
  if (!amount) return "—"
  const code = (currency ?? "gbp").toUpperCase()
  const symbol = code === "GBP" ? "£" : code === "EUR" ? "€" : code === "USD" ? "$" : `${code} `
  return `${symbol}${Number(amount).toLocaleString()}`
}

function teaserSectionLabel(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  x: number,
  y: number,
  gold: string,
  green: string
) {
  doc.roundedRect(x, y + 3, 24, 2.5, 1.25).fill(gold)
  doc.fillColor(green).fontSize(9).text(label.toUpperCase(), x + 32, y, { characterSpacing: 0.8 })
}

function measureTextHeight(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  width: number,
  fontSize: number,
  lineGap = 3
) {
  doc.fontSize(fontSize)
  return doc.heightOfString(text, { width, lineGap })
}

function drawTeaserBlock(
  doc: InstanceType<typeof PDFDocument>,
  input: {
    x: number
    y: number
    width: number
    title: string
    body?: string
    bullets?: string[]
    colors: {
      green: string
      gold: string
      fill: string
      border: string
      dark: string
      muted: string
    }
  }
) {
  const padding = 16
  const titleHeight = 22
  const innerWidth = input.width - padding * 2
  let contentHeight = 0

  if (input.body) {
    contentHeight += measureTextHeight(doc, input.body, innerWidth, 10, 4)
  }

  const bullets = input.bullets?.filter(Boolean) ?? []
  if (bullets.length) {
    bullets.forEach((bullet) => {
      contentHeight += measureTextHeight(doc, bullet, innerWidth - 14, 10, 2) + 10
    })
  } else if (!input.body) {
    contentHeight += measureTextHeight(
      doc,
      "Focused execution in a defined market with a clear path to the next milestone.",
      innerWidth,
      10,
      4
    )
  }

  const cardHeight = padding + titleHeight + contentHeight + padding
  const { x, y, width, title, body, colors } = input

  doc.roundedRect(x, y, width, cardHeight, 12).fill(colors.fill)
  doc.roundedRect(x, y, width, cardHeight, 12).stroke(colors.border)
  doc.fillColor(colors.green).fontSize(12).text(title, x + padding, y + padding, {
    width: innerWidth,
  })

  let cursorY = y + padding + titleHeight

  if (body) {
    doc.fillColor(colors.dark).fontSize(10).text(body, x + padding, cursorY, {
      width: innerWidth,
      lineGap: 4,
    })
    cursorY += measureTextHeight(doc, body, innerWidth, 10, 4)
  }

  if (bullets.length) {
    bullets.forEach((bullet) => {
      doc.circle(x + padding + 4, cursorY + 5, 2.5).fill(colors.gold)
      doc.fillColor(colors.dark).fontSize(10).text(bullet, x + padding + 14, cursorY, {
        width: innerWidth - 14,
        lineGap: 2,
      })
      cursorY += measureTextHeight(doc, bullet, innerWidth - 14, 10, 2) + 10
    })
  } else if (!body) {
    doc
      .fillColor(colors.dark)
      .fontSize(10)
      .text(
        "Focused execution in a defined market with a clear path to the next milestone.",
        x + padding,
        cursorY,
        { width: innerWidth, lineGap: 4 }
      )
  }

  return cardHeight
}
