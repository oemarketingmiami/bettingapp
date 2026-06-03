import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Capabilities } from "@/components/landing/Capabilities";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Winners } from "@/components/landing/Winners";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="relative min-h-screen text-slate-900 [color-scheme:light]">
      {/* Page-wide soft gradient backdrop so sections pop instead of flat white */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-white">
        <div className="absolute left-1/2 top-[3%] h-[620px] w-[1000px] -translate-x-1/2 rounded-full opacity-80"
          style={{ background: "radial-gradient(closest-side, rgba(37,99,235,0.13), transparent)" }} />
        <div className="absolute right-[-12%] top-[34%] h-[620px] w-[620px] rounded-full opacity-70"
          style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.12), transparent)" }} />
        <div className="absolute left-[-12%] top-[58%] h-[620px] w-[620px] rounded-full opacity-70"
          style={{ background: "radial-gradient(closest-side, rgba(56,189,248,0.12), transparent)" }} />
        <div className="absolute right-[2%] top-[82%] h-[560px] w-[620px] rounded-full opacity-70"
          style={{ background: "radial-gradient(closest-side, rgba(37,99,235,0.11), transparent)" }} />
      </div>

      <LandingHeader />
      <Hero />
      <Capabilities />
      <HowItWorks />
      <Winners />
      <Testimonials />
      <Pricing />
      <Footer />
    </div>
  );
}
