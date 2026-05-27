import "server-only"

import { createRequire } from "node:module"

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
