/**
 * Composant StructuredData - Données structurées JSON-LD pour le SEO
 * 
 * Ce composant injecte des données structurées Schema.org dans la page
 * pour permettre à Google d'afficher des "rich snippets" dans les résultats.
 */

export default function StructuredData() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "JobXpress",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "url": "https://jobxpress.fr",
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": "0",
      "highPrice": "24.99",
      "priceCurrency": "EUR",
      "offerCount": "3",
      "description": "Plans Freemium (gratuit), Starter (9,99€/mois) et Pro (24,99€/mois)"
    },
    "description": "Assistant intelligent pour la recherche d'emploi et l'automatisation de candidatures avec IA. Générez des lettres de motivation personnalisées et trouvez les meilleures offres.",
    "featureList": [
      "Recherche d'emploi multi-sources",
      "Génération automatique de lettres de motivation",
      "Analyse IA des offres",
      "Scoring de compatibilité CV"
    ],
    "screenshot": "https://jobxpress.fr/og-image.png",
    "softwareVersion": "1.0",
    "operatingSystem": "Web (Navigateur)"
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "JobXpress",
    "url": "https://jobxpress.fr",
    "logo": "https://jobxpress.fr/og-image.png",
    "description": "Plateforme SaaS d'automatisation de la recherche d'emploi propulsée par l'IA",
    "foundingDate": "2026",
    "sameAs": [
      "https://www.linkedin.com/company/jobxpress",
      "https://twitter.com/jobxpress"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@jobxpress.com",
      "contactType": "customer service",
      "availableLanguage": ["French"]
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "JobXpress",
    "url": "https://jobxpress.fr",
    "description": "Recherche d'emploi automatisée par l'IA — candidatures en 30 secondes",
    "inLanguage": "fr",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://jobxpress.fr/dashboard/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Comment trouver un emploi avec JobXpress",
    "description": "Trouvez votre prochain emploi 10x plus vite grâce à l'IA de JobXpress en 3 étapes simples.",
    "totalTime": "PT5M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Créez votre profil en 30 secondes",
        "text": "Renseignez votre poste cible et uploadez votre CV. L'IA s'occupe du reste.",
        "url": "https://jobxpress.fr/register"
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "L'IA analyse des milliers d'offres",
        "text": "Notre moteur scrute les meilleures sources et score chaque offre selon votre profil en temps réel."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Recevez vos candidatures prêtes à envoyer",
        "text": "Obtenez vos meilleures opportunités avec des lettres de motivation personnalisées, prêtes à l'envoi."
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "JobXpress est-il vraiment gratuit ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oui, le plan Freemium est gratuit pour toujours avec 5 crédits par semaine. Aucune carte bancaire requise."
        }
      },
      {
        "@type": "Question",
        "name": "Quelle est la différence avec Indeed ou LinkedIn ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "JobXpress utilise l'IA pour analyser, scorer et générer automatiquement vos lettres de motivation personnalisées, ce que Indeed et LinkedIn ne font pas."
        }
      },
      {
        "@type": "Question",
        "name": "Comment fonctionne le système de crédits ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Chaque recherche IA et chaque lettre de motivation générée consomme 1 crédit. Le plan gratuit offre 5 crédits par semaine, sans limite de durée."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
