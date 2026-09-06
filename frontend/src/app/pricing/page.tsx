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
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "JobXpress est-il vraiment gratuit ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, le plan Freemium est gratuit pour toujours. Vous bénéficiez de 5 crédits par semaine sans limite de durée. Aucune carte bancaire n'est requise pour commencer.",
        },
      },
      {
        "@type": "Question",
        name: "Combien coûte un abonnement JobXpress ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "JobXpress propose 3 plans : Freemium (gratuit, 5 crédits/semaine), Starter à 9,99€/mois (100 crédits/mois) et Pro à 24,99€/mois (300 crédits/mois). Sans engagement, annulez à tout moment.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je annuler mon abonnement à tout moment ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, vous pouvez annuler votre abonnement à tout moment depuis votre espace client. Aucun engagement n'est requis. L'annulation prend effet à la fin de la période de facturation en cours.",
        },
      },
      {
        "@type": "Question",
        name: "Quelle est la différence entre le plan Starter et le plan Pro ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Le plan Starter offre 100 crédits/mois et l'accès au coach JobyJoba (10 messages/session). Le plan Pro offre 300 crédits/mois, un contexte personnalisé pour JobyJoba et 20 messages/jour. Les deux plans incluent la recherche d'emploi IA et la génération de lettres de motivation.",
        },
      },
      {
        "@type": "Question",
        name: "Comment fonctionne le système de crédits ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chaque recherche d'emploi IA et chaque lettre de motivation générée consomme 1 crédit. Le plan gratuit offre 5 crédits par semaine, le Starter 100 par mois et le Pro 300 par mois. Les crédits non utilisés ne sont pas reportés.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PricingClient />
    </>
  );
}
