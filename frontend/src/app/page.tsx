import { Metadata } from "next"
import { Navbar, Footer } from "@/components/layout"
import { HeroSection, FeaturesSection, HowItWorksSection, PricingSection, TestimonialsSection, FAQSection, CtaSection } from "@/components/sections/home"
import StructuredData from "@/components/seo/StructuredData"

// Métadonnées SEO optimisées pour la landing page
export const metadata: Metadata = {
  title: "JobXpress — Recherche d'emploi IA & Candidature Automatisée",
  description:
    "Trouvez votre job 10x plus vite avec JobXpress. Analyse d'offres IA, scoring de compatibilité CV et génération de lettres de motivation personnalisées en 30s.",
  keywords: [
    "recherche emploi IA",
    "candidature automatique",
    "lettre de motivation IA",
    "assistant carrière IA",
    "trouver un emploi rapidement",
    "automatisation candidature",
    "offres d'emploi personnalisées",
    "scoring CV",
    "JobXpress",
  ],
  openGraph: {
    title: "JobXpress — Trouvez votre emploi 10x plus vite avec l'IA",
    description:
      "Analysez des milliers d'offres, scorez votre compatibilité et générez des lettres personnalisées en 30 secondes. Gratuit, sans carte bancaire.",
    url: "https://jobxpress.fr",
    siteName: "JobXpress",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JobXpress - Recherche d'emploi automatisée par IA",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobXpress | Emploi IA — Candidatures en 30s",
    description: "Analyse d'offres, scoring CV et lettres personnalisées en 30s. Gratuit.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://jobxpress.fr",
  },
}

export default function Home() {
  return (
    <div className="min-h-screen mesh-gradient relative overflow-hidden">
      <StructuredData />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}

