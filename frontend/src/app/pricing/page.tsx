import type { Metadata } from "next"
import PricingClient from "./PricingClient"

export const metadata: Metadata = {
  title: "Tarifs — Plans Freemium, Starter et Pro",
  description:
    "Découvrez les tarifs JobXpress : plan gratuit avec 5 crédits/semaine, Starter à 9,99€/mois (100 crédits) et Pro à 24,99€/mois (300 crédits). Commencez gratuitement.",
  keywords: [
    "tarif jobxpress",
    "prix recherche emploi IA",
    "plan candidature automatique",
    "abonnement lettre motivation IA",
    "emploi IA pas cher",
  ],
  openGraph: {
    title: "JobXpress — Tarifs : commencez gratuitement",
    description:
      "Plan gratuit illimité (5 crédits/sem), Starter 9,99€/mois, Pro 24,99€/mois. Sans engagement, annulez à tout moment.",
    url: "https://jobxpress.fr/pricing",
    siteName: "JobXpress",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JobXpress - Tarifs et plans",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobXpress — Tarifs",
    description: "Plan gratuit + Starter 9,99€/mois. Sans engagement.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://jobxpress.fr/pricing",
  },
}

export default function PricingPage() {
  return <PricingClient />
}
