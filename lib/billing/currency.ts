import type { Currency } from "@/types/billing"

// Only USD is enabled for launch. Add "gbp" and "eur" to SUPPORTED_CURRENCIES
// when the matching Stripe price IDs and locale rules are ready.
export const SUPPORTED_CURRENCIES: Currency[] = ["usd"]
export const DEFAULT_CURRENCY: Currency = "usd"

const SYMBOL: Record<Currency, string> = {
  gbp: "£",
  eur: "€",
  usd: "$",
}

export function getCurrencySymbol(currency: Currency) {
  return SYMBOL[currency]
}

export function formatPrice(amount: number, currency: Currency) {
  return `${SYMBOL[currency]}${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export function isSupportedCurrency(value: unknown): value is Currency {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value as Currency)
}
