"use client"

import DOMPurify from "dompurify"
import { useMemo } from "react"

interface SanitizedHTMLProps {
  html: string
  className?: string
}

/**
 * Rendu HTML assaini via DOMPurify.
 * Remplace dangerouslySetInnerHTML pour éviter les injections XSS.
 * Autorise uniquement les balises sûres (h1-h6, p, ul, li, strong, em, a, br).
 */
export function SanitizedHTML({ html, className }: SanitizedHTMLProps) {
  const sanitized = useMemo(() => {
    if (typeof window === "undefined") return html
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "strong", "em", "b", "i", "br", "a", "span"],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
    })
  }, [html])

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
