import { readFile } from "node:fs/promises"
import path from "node:path"

const cache = new Map<string, string>()

export async function loadPrompt(filename: string): Promise<string> {
  const cached = cache.get(filename)
  if (cached) return cached

  const filePath = path.join(process.cwd(), "prompts", filename)
  const content = await readFile(filePath, "utf8")
  cache.set(filename, content)
  return content
}
