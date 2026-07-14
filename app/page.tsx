import { LandingPage } from "@/components/marketing/landing/landing-page";

export default function Home() {
  return (
    <main className="max-w-[100vw] overflow-x-clip md:fixed md:inset-0 md:max-w-none md:overflow-y-auto md:overscroll-y-contain">
      <LandingPage />
    </main>
  );
}
