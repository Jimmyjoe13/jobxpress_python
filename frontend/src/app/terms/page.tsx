import type { Metadata } from "next"
import TermsClient from "./TermsClient"

export const metadata: Metadata = {
  title: "Conditions d'Utilisation",
  description:
    "Conditions d'utilisation de la plateforme JobXpress. Règles d'inscription, tarification, propriété intellectuelle et droits applicables.",
  keywords: [
    "conditions utilisation jobxpress",
    "cgv jobxpress",
    "mentions légales",
  ],
  openGraph: {
    title: "JobXpress — Conditions d'Utilisation",
    description:
      "Lisez les conditions d'utilisation de JobXpress : règles, tarification, propriété intellectuelle.",
    url: "https://jobxpress.fr/terms",
    siteName: "JobXpress",
    locale: "fr_FR",
    type: "website",
  },
  alternates: {
    canonical: "https://jobxpress.fr/terms",
  },
}

export default function TermsPage() {
  return <TermsClient />
}
