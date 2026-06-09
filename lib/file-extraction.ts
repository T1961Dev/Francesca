import "server-only"

import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { PDFParse } from "pdf-parse"

const require = createRequire(import.meta.url)
PDFParse.setWorker(
  pathToFileURL(
    path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    )
  ).href
)

const PPTX2Json = require("pptx2json") as new () => {
  buffer2json(buffer: Buffer): Promise<Record<string, unknown>>
}

const maxFileSize = 50 * 1024 * 1024
const supportedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

export function validateUploadFile(file: File) {
  if (!file.size) {
    throw new Error("File is empty")
  }

  if (file.size > maxFileSize) {
    throw new Error("File exceeds the 50MB upload limit")
  }

  if (!supportedTypes.has(file.type)) {
    throw new Error("Only PDF and PPTX files are supported")
  }
}

export async function extractTextFromPdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    return validateExtractedText(result.text)
  } finally {
    await parser.destroy()
  }
}

export async function extractTextFromPptx(buffer: Buffer) {
  const parser = new PPTX2Json()
  const json = await parser.buffer2json(buffer)
  const text = collectText(json).join(" ")
  return validateExtractedText(text)
}

export function normaliseExtractedText(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

export function validateExtractedText(text: string) {
  const normalised = normaliseExtractedText(text)

  if (normalised.length < 50) {
    throw new Error("Could not extract enough readable text from the file")
  }

  return normalised
}

function collectText(value: unknown): string[] {
  if (typeof value === "string") {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectText)
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectText)
  }

  return []
}
