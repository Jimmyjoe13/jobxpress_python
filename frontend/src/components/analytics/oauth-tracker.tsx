"use client"

// Tracker OAuth pour GA4.
//
// Pourquoi ce composant : l'authentification OAuth (Google/Microsoft) repasse par
// une route serveur (/auth/callback) qui n'a pas accès à gtag. Ce composant
// s'exécute à l'arrivée sur le dashboard, lit le marqueur posé par le callback
// (?oauth=1 + cookie jxp_oauth) et émet l'événement sign_up ou login.
//
// Le cookie et le paramètre d'URL sont consommés (supprimés) pour éviter
// les doubles comptages au fil des navigations.

import { useEffect, useRef } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { track } from "@/lib/analytics"

interface OAuthCookiePayload {
  is_new: boolean
  provider: string
}

function readOAuthCookie(): OAuthCookiePayload | null {
  const match = document.cookie.match(/(?:^|;\s*)jxp_oauth=([^;]+)/)
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match[1])) as OAuthCookiePayload
  } catch {
    return null
  }
}

function deleteOAuthCookie(): void {
  document.cookie = "jxp_oauth=; path=/; max-age=0; samesite=lax"
}

export function OAuthTracker() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  // Empêche le double envoi si le composant est re-monté dans la même session
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    if (searchParams.get("oauth") !== "1") return
    handled.current = true

    const payload = readOAuthCookie()
    const params = new URLSearchParams(searchParams.toString())
    params.delete("oauth")
    const query = params.toString()

    // Nettoie l'URL (retire oauth=1) sans re-render du serveur
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    deleteOAuthCookie()

    if (!payload) return

    const method = payload.provider === "azure" ? "microsoft" : payload.provider
    if (payload.is_new) {
      track("sign_up", { method })
    } else {
      track("login", { method })
    }
  }, [searchParams, pathname, router])

  return null
}
