export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          company_name: string | null
          website: string | null
          role: string | null
          industry: string | null
          sector: string | null
          stage: string | null
          location: string | null
          geography: string | null
          funding_stage: string | null
          target_raise: number | null
          target_raise_currency: string | null
          description: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: "free" | "starter" | "pro" | "lifetime"
          subscription_status: string
          plan_cancels_at: string | null
          failed_payment_count: number
          lifetime_purchased_at: string | null
          paywall_dismissed_at: string | null
          welcome_email_sent: boolean
          whatsapp_number: string | null
          deleted_at: string | null
          upgrade_prompt_sent: boolean
          processing_jobs: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>
      }
      deck_uploads: GenericTable
      deck_analyses: GenericTable
      financial_models: GenericTable
      investor_matching_jobs: GenericTable
      investor_matches: GenericTable
      email_events: GenericTable
      billing_events: GenericTable
      pdf_exports: GenericTable
      raise_briefs: GenericTable
    }
  }
}

/* Loose tables: Row kept for reads; Insert/Update as any so Postgrest does not infer `never`. */
type GenericTable = {
  Row: Record<string, Json>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Insert: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Update: Record<string, any>
}
