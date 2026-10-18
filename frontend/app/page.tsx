import { Footer } from "@/components/Footer";
import { FinalCta } from "@/components/landing-page/FinalCTA-Section";
import { Hero } from "@/components/landing-page/HeroSection";
import { HowItWorks } from "@/components/landing-page/HowItWorksSection";
import { Privacy } from "@/components/landing-page/PrivacySection";
import { Problem } from "@/components/landing-page/ProblemSection";
import { UseCases } from "@/components/landing-page/UseCasesSection";

export default function HomePage() {
  return (
    <>
      <main >
        <Hero />
        <Problem />
        <HowItWorks />
        <UseCases />
        <Privacy />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}