/**
 * Framework A/B Testing pour CTAs — JobXpress
 * 
 * Système léger de test A/B côté client pour optimiser les taux de conversion.
 * 
 * Comment ça marche :
 * 1. À la première visite, un variant est assigné aléatoirement (50/50)
 * 2. L'assignment est stocké en localStorage pour cohérence
 * 3. Un event est envoyé à l'API pour tracking (quand l'API sera prête)
 * 
 * Utilisation :
 *   const { variant, trackClick } = useABTest("cta-homepage")
 *   <Button onClick={trackClick}>{variant === "A" ? "Commencer" : "Essayer gratuitement"}</Button>
 */

"use client"

import { useState, useEffect, useCallback } from "react"

type Variant = "A" | "B"

interface ABTestConfig {
  testName: string
  variantA: string
  variantB: string
}

/**
 * Hook principal pour les tests A/B.
 * Retourne le variant assigné et une fonction de tracking.
 */
export function useABTest(config: ABTestConfig) {
  const [variant, setVariant] = useState<Variant>("A")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const storageKey = `ab_${config.testName}`
    let assigned = localStorage.getItem(storageKey) as Variant | null

    if (!assigned || (assigned !== "A" && assigned !== "B")) {
      // Assignment aléatoire 50/50
      assigned = Math.random() < 0.5 ? "A" : "B"
      localStorage.setItem(storageKey, assigned)
    }

    setVariant(assigned)
    setIsLoaded(true)

    // Track impression
    trackEvent(config.testName, assigned, "impression")
  }, [config.testName])

  const trackClick = useCallback(() => {
    trackEvent(config.testName, variant, "click")
  }, [config.testName, variant])

  const text = variant === "A" ? config.variantA : config.variantB

  return { variant, text, trackClick, isLoaded }
}

/**
 * Envoie un événement A/B test à l'API.
 * Pour l'instant, log en console. Sera connecté à l'API backend plus tard.
 */
function trackEvent(testName: string, variant: Variant, event: "impression" | "click") {
  const payload = {
    test: testName,
    variant,
    event,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.pathname : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  }

  // Console log pour debugging
  console.log(`[AB Test] ${testName} | Variant ${variant} | ${event}`, payload)

  // TODO: Envoyer à l'API quand elle sera prête
  // fetch("/api/ab-test", { method: "POST", body: JSON.stringify(payload) })
}

/**
 * Configuration des tests A/B actifs.
 */
export const abTests = {
  "cta-homepage": {
    testName: "cta-homepage",
    variantA: "Commencer gratuitement",
    variantB: "Essayer JobXpress — c'est gratuit",
  },
  "cta-pricing": {
    testName: "cta-pricing",
    variantA: "S'abonner à Starter",
    variantB: "Commencer à 9,99€/mois",
  },
  "cta-guide": {
    testName: "cta-guide",
    variantA: "Recevoir le guide gratuit",
    variantB: "Télécharger le guide (gratuit)",
  },
  "hero-subtitle": {
    testName: "hero-subtitle",
    variantA: "L'IA qui trouve pour vous les meilleures offres d'emploi et rédige vos lettres de motivation.",
    variantB: "Postulez 10x plus vite grâce à l'intelligence artificielle. Offres ciblées + lettres sur-mesure.",
  },
} as const
