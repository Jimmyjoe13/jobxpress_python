/**
 * Séquence Email Nurturing — JobXpress
 * 
 * 5 emails automatiques pour convertir les leads freemium → Starter.
 * 
 * Ce fichier définit la séquence. L'envoi réel sera géré par Émile (emailing agent)
 * ou un service d'emailing (Brevo, Mailchimp, etc.) une fois la connexion configurée.
 * 
 * Pipeline actuel :
 * 1. Lead capture via /guide-emploi ou /register
 * 2. Stockage en base (table `email_subscribers`)
 * 3. Déclenchement séquence nurturing
 * 4. Suivi ouvertures / clics
 * 5. Conversion → Upgrade Starter
 */

export interface EmailStep {
  id: string
  day: number // Jour relatif à l'inscription (J+0 = inscription)
  subject: string
  previewText: string
  type: "transactional" | "nurture" | "conversion"
  cta?: { text: string; url: string }
}

export const nurturingSequence: EmailStep[] = [
  {
    id: "welcome",
    day: 0,
    subject: "🎉 Bienvenue sur JobXpress ! Votre guide est arrivé",
    previewText: "Voici votre guide gratuit + 5 crédits offerts pour démarrer",
    type: "transactional",
    cta: { text: "Commencer maintenant", url: "https://jobxpress.fr/register" },
  },
  {
    id: "value-day2",
    day: 2,
    subject: "💡 Astuce #1 : optimisez votre CV en 2 minutes",
    previewText: "Les recruteurs passent 6 secondes sur un CV. Voici comment capter leur attention.",
    type: "nurture",
    cta: { text: "Optimiser mon CV avec l'IA", url: "https://jobxpress.fr/register" },
  },
  {
    id: "social-proof-day5",
    day: 5,
    subject: "🚀 Marie a décroché 3 entretiens en 2 semaines",
    previewText: "Découvrez comment elle a utilisé l'IA pour booster sa recherche d'emploi.",
    type: "nurture",
    cta: { text: "Voir son histoire", url: "https://jobxpress.fr/blog/trouver-emploi-rapidement" },
  },
  {
    id: "feature-day8",
    day: 8,
    subject: "⚡ Vous n'avez utilisé que 2 de vos 5 crédits...",
    previewText: "Savez-vous que JobXpress peut générer vos lettres de motivation automatiquement ?",
    type: "nurture",
    cta: { text: "Générer ma première lettre", url: "https://jobxpress.fr/dashboard" },
  },
  {
    id: "conversion-day12",
    day: 12,
    subject: "🔓 Offre spéciale : passez à Starter à -20%",
    previewText: "100 crédits/mois + support prioritaire. Offre valable 48h.",
    type: "conversion",
    cta: { text: "Profiter de l'offre", url: "https://jobxpress.fr/pricing" },
  },
]

/**
 * Templates de contenu pour chaque email (HTML simplifié).
 * Ces templates seront utilisés par l'agent d'emailing (Émile)
 * pour générer le contenu HTML de chaque email.
 */
export const emailTemplates: Record<string, { title: string; body: string; footer: string }> = {
  welcome: {
    title: "Bienvenue sur JobXpress !",
    body: `Merci de vous être inscrit sur JobXpress. Votre guide « Trouver un emploi en 2026 » est en pièce jointe.

En attendant, vous avez déjà 5 crédits gratuits pour :
• Rechercher des offres d'emploi avec l'IA
• Générer des lettres de motivation personnalisées
• Obtenir un scoring de compatibilité sur chaque offre

Commencez dès maintenant — votre prochain emploi pourrait n'être qu'à quelques clics.`,
    footer: "Vous recevez cet email car vous vous êtes inscrit sur jobxpress.fr. Se désinscrire : [unsubscribe]",
  },
  "value-day2": {
    title: "Optimisez votre CV en 2 minutes",
    body: `Les recruteurs passent en moyenne 6 secondes sur un CV. Voici les 3 erreurs les plus fréquentes :

1. Un format qui ne passe pas les filtres ATS (75% des CV sont rejetés par les robots)
2. Une description de postes au lieu de résultats mesurables
3. Pas de mots-clés correspondant à l'offre

Avec JobXpress, notre IA analyse l'offre d'emploi et vous suggère les mots-clés exacts à inclure dans votre CV.

Essayez maintenant — c'est gratuit.`,
    footer: "Vous recevez cet email car vous vous êtes inscrit sur jobxpress.fr. Se désinscrire : [unsubscribe]",
  },
  "social-proof-day5": {
    title: "Comment Marie a trouvé son emploi en 2 semaines",
    body: `Marie, 28 ans, cherchait un poste de Chef de projet digital depuis 3 mois sans réponse.

En utilisant JobXpress :
• Elle a postulé à 12 offres ciblées en 1 heure
• L'IA a généré 12 lettres de motivation personnalisées
• Elle a reçu 3 appels de recruteurs en 2 semaines
• Elle a décroché un CDI à 42K€

La différence ? Chaque candidature était sur-mesure, pas un envoi en masse.

Essayez la même approche — vos 5 crédits gratuits sont toujours disponibles.`,
    footer: "Vous recevez cet email car vous vous êtes inscrit sur jobxpress.fr. Se désinscrire : [unsubscribe]",
  },
  "feature-day8": {
    title: "Le pouvoir des lettres de motivation IA",
    body: `Saviez-vous que JobXpress peut rédiger vos lettres de motivation en 30 secondes ?

Notre IA analyse :
• L'annonce d'emploi (compétences, culture, exigences)
• Votre profil et parcours
• Les meilleures pratiques de rédaction

Résultat : une lettre unique, personnalisée et percutante pour chaque candidature.

Vous avez encore 3 crédits gratuits. Utilisez-les pour générer vos prochaines lettres.`,
    footer: "Vous recevez cet email car vous vous êtes inscrit sur jobxpress.fr. Se désinscrire : [unsubscribe]",
  },
  "conversion-day12": {
    title: "Passez à la vitesse supérieure",
    body: `Vous avez testé JobXpress avec le plan gratuit. Prêt à passer au niveau supérieur ?

Le plan Starter (9,99€/mois) vous offre :
• 100 crédits/mois (20x plus que le gratuit)
• Support prioritaire par email
• Historique complet de vos candidatures
• Reset mensuel automatique

🎯 Offre spéciale : -20% sur le premier mois avec le code WELCOME20

Cette offre expire dans 48 heures.`,
    footer: "Vous recevez cet email car vous vous êtes inscrit sur jobxpress.fr. Se désinscrire : [unsubscribe]",
  },
}
