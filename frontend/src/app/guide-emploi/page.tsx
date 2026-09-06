import type { Metadata } from "next"
import GuideClient from "./GuideClient"

export const metadata: Metadata = {
  title: "Guide Gratuit : Trouver un Emploi en 2026 | JobXpress",
  description:
    "Téléchargez notre guide gratuit de 30 pages pour optimiser votre recherche d'emploi. CV, lettres de motivation, IA, entretiens, salaire.",
  alternates: {
    canonical: "https://jobxpress.fr/guide-emploi",
  },
  openGraph: {
    title: "Guide Gratuit : Trouver un Emploi en 2026 | JobXpress",
    description:
      "Téléchargez notre guide gratuit de 30 pages pour optimiser votre recherche d'emploi. CV, lettres de motivation, IA, entretiens, salaire.",
    url: "https://jobxpress.fr/guide-emploi",
    siteName: "jobXpress",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://jobxpress.fr/og-guide-emploi.png",
        width: 1200,
        height: 630,
        alt: "Guide gratuit — Trouver un emploi en 2026 | JobXpress",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guide Gratuit : Trouver un Emploi en 2026 | JobXpress",
    description:
      "Téléchargez notre guide gratuit de 30 pages pour optimiser votre recherche d'emploi.",
    images: ["https://jobxpress.fr/og-guide-emploi.png"],
  },
}

export default function GuideEmploiPage() {
  return <GuideClient />
}
