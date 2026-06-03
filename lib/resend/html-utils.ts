export function appUrl(path = "") {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://raisewise.app"
  ).replace(/\/$/, "")
  if (!path) return base
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function emailButton(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#1A3C2A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:500">${label}</a>`
}

/** Plain-text fallback for Resend (auto-generated from HTML is weaker for buttons). */
export function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
