import { FinalCta } from "@/components/landing-page-section/FinalCTA-Section";
import { Hero } from "@/components/landing-page-section/HeroSection";
import { HowItWorks } from "@/components/landing-page-section/HowItWorksSection";
import { Privacy } from "@/components/landing-page-section/PrivacySection";
import { Problem } from "@/components/landing-page-section/ProblemSection";
import { UseCases } from "@/components/landing-page-section/UseCasesSection";

export default function HomePage() {
  return (
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <UseCases />
        <Privacy />
        <FinalCta />
      </main>
  );
}