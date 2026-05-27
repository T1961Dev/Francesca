import "server-only"

import { LIFETIME_MAX_INVENTORY } from "@/lib/stripe/plans"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type LifetimeInventoryState = {
  currentCount: number
  maxCount: number
  remaining: number
  soldOut: boolean
}

const FALLBACK: LifetimeInventoryState = {
  currentCount: 0,
  maxCount: LIFETIME_MAX_INVENTORY,
  remaining: LIFETIME_MAX_INVENTORY,
  soldOut: false,
}

/** Authenticated-readable counter for marketing/billing UIs. */
export async function fetchLifetimeInventory(): Promise<LifetimeInventoryState> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("lifetime_inventory")
      .select("current_count, max_count")
      .eq("id", 1)
      .maybeSingle()

    return normalise(data)
  } catch {
    return FALLBACK
  }
}

/** Service-role variant for routes outside an authenticated request scope. */
export async function fetchLifetimeInventoryAdmin(): Promise<LifetimeInventoryState> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("lifetime_inventory")
      .select("current_count, max_count")
      .eq("id", 1)
      .maybeSingle()

    return normalise(data)
  } catch {
    return FALLBACK
  }
}

function normalise(data: { current_count?: unknown; max_count?: unknown } | null) {
  const current =
    typeof data?.current_count === "number" ? data.current_count : 0
  const max =
    typeof data?.max_count === "number" ? data.max_count : LIFETIME_MAX_INVENTORY
  return {
    currentCount: current,
    maxCount: max,
    remaining: Math.max(0, max - current),
    soldOut: current >= max,
  }
}
