import articlesData from "@/content/blog/articles.json"

export interface Article {
  slug: string
  title: string
  description: string
  content: string
  author: string
  date: string
  tags: string[]
  image: string | null
}

/**
 * Convertit du Markdown simple en HTML.
 * Gère les titres, paragraphes, listes, gras, italique, liens et blocs de code.
 */
export function markdownToHtml(md: string): string {
  let html = md

  // Blocs de code
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
  // Code inline
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

  // Titres
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>")
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>")

  // Listes à puces
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>")
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")

  // Gras et italique
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")

  // Liens
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Paragraphes (les lignes non vides qui ne sont pas déjà en balisage)
  const lines = html.split("\n\n")
  html = lines
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ""
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<p") ||
        trimmed.startsWith("<blockquote")
      ) {
        return trimmed
      }
      // Remplacer les simples retours à la ligne par <br />
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`
    })
    .join("\n\n")

  return html
}

/**
 * Calcule le temps de lecture estimé en minutes (basé sur ~200 mots/minute).
 */
export function estimateReadingTime(text: string): number {
  const words = text.replace(/[#*_`\-[\]()]/g, "").split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

/**
 * Récupère tous les articles triés par date décroissante.
 */
export function getAllArticles(): Article[] {
  return (articlesData as Article[]).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

/**
 * Récupère un article par son slug.
 */
export function getArticleBySlug(slug: string): Article | undefined {
  return (articlesData as Article[]).find((article) => article.slug === slug)
}

/**
 * Récupère tous les slugs d'articles (pour la génération statique).
 */
export function getAllArticleSlugs(): string[] {
  return (articlesData as Article[]).map((article) => article.slug)
}

/**
 * Récupère tous les tags uniques.
 */
export function getAllTags(): string[] {
  const tags = new Set<string>()
  ;(articlesData as Article[]).forEach((article) => {
    article.tags.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags)
}
