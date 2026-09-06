import type { Metadata } from "next"
import CareersClient from "./CareersClient"

export const metadata: Metadata = {
  title: "Carrières — Rejoignez JobXpress",
  description:
    "Découvrez les postes ouverts chez JobXpress. Nous recrutons des talents passionnés par l'IA et la recherche d'emploi.",
  keywords: [
    "carrières jobxpress",
    "recrutement jobxpress",
    "emploi jobxpress",
    "travailler chez jobxpress",
    "postes ouverts jobxpress",
  ],
  openGraph: {
    title: "Carrières — Rejoignez JobXpress",
    description:
      "Découvrez les postes ouverts chez JobXpress. Nous recrutons des talents passionnés par l'IA et la recherche d'emploi.",
    url: "https://jobxpress.fr/careers",
    siteName: "JobXpress",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JobXpress — Rejoignez l'équipe",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carrières — Rejoignez JobXpress",
    description:
      "Découvrez les postes ouverts chez JobXpress. Nous recrutons des talents passionnés par l'IA et la recherche d'emploi.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://jobxpress.fr/careers",
  },
}

export default function CareersPage() {
  const careersSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Carrières — Rejoignez JobXpress",
    description:
      "Découvrez les postes ouverts chez JobXpress. Nous recrutons des talents passionnés par l'IA et la recherche d'emploi.",
    url: "https://jobxpress.fr/careers",
    publisher: {
      "@type": "Organization",
      name: "JobXpress",
      url: "https://jobxpress.fr",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(careersSchema) }}
      />
      <CareersClient />
    </>
  )
}
