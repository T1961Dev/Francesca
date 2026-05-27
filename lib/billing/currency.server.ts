import "server-only"

import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/billing/currency"
import type { Currency } from "@/types/billing"

/**
 * Locale → currency detection. Currently only USD is supported, so this is a
 * thin wrapper. When you enable GBP/EUR, restore the country mapping using
 * `x-vercel-ip-country` / `cf-ipcountry` and fall back to DEFAULT_CURRENCY.
 */
export async function detectCurrencyFromRequest(): Promise<Currency> {
  if (SUPPORTED_CURRENCIES.length === 1) return DEFAULT_CURRENCY
  return DEFAULT_CURRENCY
}
