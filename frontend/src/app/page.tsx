import { Metadata } from "next"
import { Navbar, Footer } from "@/components/layout"
import { HeroSection, FeaturesSection, HowItWorksSection, CtaSection } from "@/components/sections/home"
import StructuredData from "@/components/seo/StructuredData"

// Métadonnées SEO complètes pour la landing page
export const metadata: Metadata = {
  title: "jobXpress | Boostez votre Recherche d'Emploi avec l'IA",
  description:
    "Automatisez vos candidatures, générez des lettres de motivation personnalisées et trouvez le job de vos rêves 10x plus vite avec notre assistant IA.",
  keywords: [
    "IA emploi",
    "recherche job",
    "lettre de motivation IA",
    "assistant carrière",
    "automatisation candidature",
    "lettre de motivation",
    "trouver un travail rapidement",
    "deepseek",
  ],
  openGraph: {
    title: "jobXpress - L'IA au service de votre carrière",
    description:
      "Postulez intelligemment. Laissez notre IA gérer la partie fastidieuse de votre recherche d'emploi.",
    url: "https://rocket-jobxpress.netlify.app",
    siteName: "jobXpress",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "jobXpress - Assistant IA pour la recherche d'emploi",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "jobXpress | Assistant Emploi IA",
    description: "10x plus de candidatures en 2x moins de temps.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://rocket-jobxpress.netlify.app",
  },
}

export default function Home() {
  return (
    <div className="min-h-screen mesh-gradient">
      <StructuredData />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
      <Footer />
    </div>
  )
}

