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
    "name": "jobXpress",
    "url": "https://jobxpress.fr",
    "description": "Automatisez votre recherche d'emploi avec l'IA",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://jobxpress.fr/dashboard/apply?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
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
    </>
  );
}
