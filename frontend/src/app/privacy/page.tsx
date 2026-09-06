import type { Metadata } from "next"
import PrivacyClient from "./PrivacyClient"

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description:
    "Comment JobXpress collecte, utilise et protège vos données personnelles. Conforme au RGPD. Droit de suppression et d'accès garanti.",
  keywords: [
    "confidentialité jobxpress",
    "données personnelles",
    "rgpd",
    "politique vie privée",
  ],
  openGraph: {
    title: "JobXpress — Politique de Confidentialité",
    description:
      "Vos données sont protégées. Conformité RGPD complète.",
    url: "https://jobxpress.fr/privacy",
    siteName: "JobXpress",
    locale: "fr_FR",
    type: "website",
  },
  alternates: {
    canonical: "https://jobxpress.fr/privacy",
  },
}

export default function PrivacyPage() {
  return <PrivacyClient />
}
