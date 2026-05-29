import { FaqSection } from "@/components/marketing/faq-section";
import { LandingHero } from "@/components/marketing/landing-hero";
import { ModuleCards } from "@/components/marketing/module-cards";
import { PricingSection } from "@/components/marketing/pricing-section";

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-y-auto overscroll-y-contain bg-background">
      <LandingHero />
      <ModuleCards />
      <PricingSection />
      <FaqSection />
    </main>
  );
}
