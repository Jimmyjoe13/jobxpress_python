import type { Metadata } from "next"
import TestimonialsClient from "./TestimonialsClient"

export const metadata: Metadata = {
  title: "Témoignages — Ce que disent nos utilisateurs | JobXpress",
  description:
    "Découvrez les témoignages de 2 847+ candidats qui ont utilisé JobXpress pour trouver leur emploi. Notes, avant/après, résultats.",
  keywords: [
    "témoignages jobxpress",
    "avis jobxpress",
    "avis utilisateurs jobxpress",
    "recherche emploi IA avis",
    "lettre motivation IA témoignage",
    "jobxpress review",
  ],
  openGraph: {
    title: "Témoignages — Ce que disent nos utilisateurs | JobXpress",
    description:
      "Découvrez les témoignages de 2 847+ candidats qui ont utilisé JobXpress pour trouver leur emploi.",
    url: "https://jobxpress.fr/testimonials",
    siteName: "JobXpress",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JobXpress — Témoignages de nos utilisateurs",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Témoignages — Ce que disent nos utilisateurs | JobXpress",
    description:
      "Découvrez les témoignages de 2 847+ candidats qui ont utilisé JobXpress pour trouver leur emploi.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://jobxpress.fr/testimonials",
  },
}

export default function TestimonialsPage() {
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Témoignages JobXpress",
    description:
      "Témoignages et avis de candidats ayant utilisé JobXpress pour leur recherche d'emploi.",
    url: "https://jobxpress.fr/testimonials",
    mainEntity: {
      "@type": "AggregateRating",
      itemReviewed: {
        "@type": "SoftwareApplication",
        name: "JobXpress",
        url: "https://jobxpress.fr",
      },
      ratingValue: "4.8",
      bestRating: "5",
      ratingCount: "2847",
      reviewCount: "1200",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      <TestimonialsClient />
    </>
  )
}
