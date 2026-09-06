"use client"

import { useEffect, useState } from "react"

interface ArticleContentProps {
  html: string
}

/**
 * Composant client qui rend le HTML du contenu d'un article.
 * Le rendu du HTML nécessite dangerouslySetInnerHTML,
 * ce qui requiert un composant client.
 */
export function ArticleContent({ html }: ArticleContentProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="animate-pulse space-y-4"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-full" /><div className="h-4 bg-muted rounded w-5/6" /></div>
  }

  return (
    <div
      className="prose prose-invert prose-lg max-w-none
        prose-headings:font-sora prose-headings:text-foreground
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-indigo-400
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-purple-300
        prose-p:text-muted-foreground prose-p:leading-relaxed
        prose-strong:text-foreground
        prose-li:text-muted-foreground
        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-background/50 prose-pre:border prose-pre:border-border prose-pre:rounded-lg
        prose-ul:my-4 prose-li:my-1
        [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
