export function normaliseLinkedInProfileUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  if (trimmed.startsWith("linkedin.com") || trimmed.startsWith("www.linkedin.com")) {
    return `https://${trimmed}`
  }
  return null
}
