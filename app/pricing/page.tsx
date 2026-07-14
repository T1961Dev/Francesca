import { LandingHeader } from "@/components/marketing/landing-header"
import { PricingSection } from "@/components/marketing/pricing-section"

export default function PricingPage() {
  return (
    <main className="md:fixed md:inset-0 md:overflow-y-auto md:overscroll-y-contain bg-background">
      <LandingHeader />
      <PricingSection />
    </main>
  )
}
