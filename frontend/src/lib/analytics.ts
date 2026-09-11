// Helper analytics centralisé — GA4 (gtag)
//
// Pourquoi ce fichier :
//   - centralise les appels gtag pour garder des noms d'événements cohérents
//     avec ceux déclarés comme "événements clés" dans la propriété GA4 ;
//   - guarde contre l'absence de window/gtag (SSR, tests) pour ne jamais planter ;
//   - expose un typage propre de window.gtag.
//
// Événements clés déclarés côté GA4 (properties/553599961) :
//   sign_up, login, cv_adapted, ats_check, purchase

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * Envoie un événement GA4. No-op si gtag n'est pas disponible (SSR, adblock).
 * @param eventName nom de l'événement (doit matcher GA4 pour les conversions)
 * @param params paramètres additionnels (method, credits, plan, ...)
 */
export function track(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return
  try {
    window.gtag("event", eventName, params)
  } catch {
    // Un échec de tracking ne doit jamais casser le parcours utilisateur.
  }
}

/**
 * Associe des propriétés persistantes à l'utilisateur (scope USER côté GA4).
 * À appeler à la connexion / quand le plan est connu.
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return
  try {
    window.gtag("set", "user_properties", properties)
  } catch {
    // silencieux
  }
}
