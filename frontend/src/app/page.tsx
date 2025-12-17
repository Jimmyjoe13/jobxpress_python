"use client"

import { Navbar, Footer } from "@/components/layout"
import { HeroSection, FeaturesSection, HowItWorksSection, CtaSection } from "@/components/sections/home"

export default function Home() {
  return (
    <div className="min-h-screen mesh-gradient">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
