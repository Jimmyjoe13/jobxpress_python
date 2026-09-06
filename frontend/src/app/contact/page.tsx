import type { Metadata } from "next"
import ContactClient from "./ContactClient"

export const metadata: Metadata = {
  title: "Contact — Nous écrire",
  description:
    "Contactez l'équipe JobXpress pour toute question technique, commerciale ou partenariat. Réponse sous 24h.",
  keywords: [
    "contact jobxpress",
    "support jobxpress",
    "aide recherche emploi IA",
  ],
  openGraph: {
    title: "JobXpress — Contactez-nous",
    description:
      "Besoin d'aide ou d'un partenariat ? Écrivez-nous, nous répondons sous 24h.",
    url: "https://jobxpress.fr/contact",
    siteName: "JobXpress",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JobXpress - Contact",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobXpress — Contact",
    description: "Équipe JobXpress à votre écoute.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://jobxpress.fr/contact",
  },
}

export default function ContactPage() {
  return <ContactClient />
}
