import React from "react"

/**
 * OgImage - Composant serveur qui génère une image HTML/CSS
 * pour les Open Graph images des articles de blog.
 *
 * NOTE: Ce composant sert principalement à générer le markup HTML/CSS
 * pour les OG images. L'URL d'image OG utilisée dans les metadata
 * est gérée par getOgImageUrl().
 */

interface OgImageProps {
  title: string
  description: string
  tags: string[]
}

const SITE_NAME = "jobXpress"

export function OgImage({ title, description, tags }: OgImageProps) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        color: "#ffffff",
        padding: "60px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.05)",
        }}
      />

      {/* Site name */}
      <div
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "#e94560",
          marginBottom: "24px",
          letterSpacing: "0.5px",
        }}
      >
        {SITE_NAME}
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "48px",
          fontWeight: 700,
          lineHeight: 1.2,
          margin: "0 0 20px 0",
          maxWidth: "900px",
        }}
      >
        {title}
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: "22px",
          lineHeight: 1.5,
          color: "#a0aec0",
          margin: "0 0 32px 0",
          maxWidth: "900px",
        }}
      >
        {description}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              style={{
                padding: "8px 20px",
                borderRadius: "24px",
                background: "rgba(233, 69, 96, 0.2)",
                color: "#e94560",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Retourne l'URL de l'image OG pour un article.
 * Utilise l'image de l'article si elle existe, sinon une image par défaut.
 */
export function getOgImageUrl(
  article: { image?: string | null; slug?: string } | null | undefined
): string {
  if (article?.image) {
    return article.image
  }
  return "/og-image.png"
}
