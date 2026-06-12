import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { Features } from "@/components/landing/Features";
import { LeadForm } from "@/components/landing/LeadForm";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingHeader />
      <Hero />
      <LiveDemo />
      <Features />
      <LeadForm />
      <Footer />
    </div>
  );
}
