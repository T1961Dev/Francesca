/** Open an export URL in a new tab without navigating the current page. */
export function openExportUrl(url: string) {
  if (typeof window === "undefined") return

  const tab = window.open(url, "_blank", "noopener,noreferrer")
  if (tab) return

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.target = "_blank"
  anchor.rel = "noopener noreferrer"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
