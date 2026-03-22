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
    "name": "jobXpress",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "url": "https://jobxpress.fr",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock",
      "description": "Version gratuite disponible"
    },
    "description": "Assistant intelligent pour la recherche d'emploi et l'automatisation de candidatures avec IA. Générez des lettres de motivation personnalisées et trouvez les meilleures offres.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1000",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "Recherche d'emploi multi-sources",
      "Génération automatique de lettres de motivation",
      "Analyse IA des offres",
      "Scoring de compatibilité"
    ]
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "jobXpress",
    "url": "https://jobxpress.fr",
    "logo": "https://jobxpress.fr/og-image.png",
    "description": "Plateforme SaaS d'automatisation de la recherche d'emploi propulsée par l'IA",
    "sameAs": []
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "JobXpress",
    "url": "https://jobxpress.fr",
    "description": "Recherche d'emploi automatisée par l'IA — candidatures en 30 secondes",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://jobxpress.fr/dashboard/apply?q={search_term_string}",
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
        "name": "L'IA analyse 50 000+ offres",
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
    </>
  );
}
