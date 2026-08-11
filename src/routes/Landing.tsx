import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandlordPitch } from "@/components/landing/LandlordPitch";
import { TrustStats } from "@/components/landing/TrustStats";
import { PricingSection } from "@/components/landing/PricingSection";
import { Faq } from "@/components/landing/Faq";
import { CtaBand } from "@/components/landing/CtaBand";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <LandlordPitch />
        <TrustStats />
        <PricingSection />
        <Faq />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
