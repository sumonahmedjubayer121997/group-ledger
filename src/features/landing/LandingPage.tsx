import { Faq } from "./sections/Faq";
import { Features } from "./sections/Features";
import { FinalCta } from "./sections/FinalCta";
import { Footer } from "./sections/Footer";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { Nav } from "./sections/Nav";
import { ProofStrip } from "./sections/ProofStrip";
import { SplitDemo } from "./sections/SplitDemo";

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => (
  <div className="min-h-screen overflow-x-clip bg-lp-paper font-inter text-lp-ink antialiased">
    <Nav onGetStarted={onGetStarted} />
    <main>
      <Hero onGetStarted={onGetStarted} />
      <ProofStrip />
      <HowItWorks />
      <SplitDemo />
      <Features />
      <Faq />
      <FinalCta onGetStarted={onGetStarted} />
    </main>
    <Footer onGetStarted={onGetStarted} />
  </div>
);
