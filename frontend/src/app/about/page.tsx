import type { Metadata } from "next"
import AboutClient from "./AboutClient"

export const metadata: Metadata = {
  title: "À propos — Notre mission | JobXpress",
  description:
    "Découvrez l'histoire de JobXpress, comment nous utilisons l'IA pour révolutionner la recherche d'emploi en France.",
  keywords: [
    "à propos jobxpress",
    "mission jobxpress",
    "histoire jobxpress",
    "recherche emploi IA",
    "equipe jobxpress",
  ],
  openGraph: {
    title: "À propos de JobXpress — Notre mission",
    description:
      "Découvrez l'histoire de JobXpress, comment nous utilisons l'IA pour révolutionner la recherche d'emploi en France.",
    url: "https://jobxpress.fr/about",
    siteName: "JobXpress",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JobXpress - À propos de nous",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobXpress — À propos",
    description:
      "Découvrez comment JobXpress utilise l'IA pour révolutionner la recherche d'emploi en France.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://jobxpress.fr/about",
  },
}

export default function AboutPage() {
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "À propos de JobXpress",
    description:
      "Découvrez l'histoire de JobXpress, comment nous utilisons l'IA pour révolutionner la recherche d'emploi en France.",
    url: "https://jobxpress.fr/about",
    mainEntity: {
      "@type": "Organization",
      name: "JobXpress",
      url: "https://jobxpress.fr",
      foundingDate: "2026",
      founder: {
        "@type": "Person",
        name: "Jimmy Khotsombat",
      },
      description:
        "JobXpress automatise 90% du processus de recherche d'emploi grâce à l'intelligence artificielle.",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <AboutClient />
    </>
  )
}
