import { Calendar, Clock, User, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { Article } from "@/lib/blog"
import { estimateReadingTime } from "@/lib/blog"

interface ArticleHeaderProps {
  article: Article
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const readingTime = estimateReadingTime(article.content)
  const formattedDate = new Date(article.date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          Accueil
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/blog" className="hover:text-foreground transition-colors">
          Blog
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground truncate max-w-[200px]">{article.title}</span>
      </nav>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {article.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-sora bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent leading-tight mb-4">
        {article.title}
      </h1>

      {/* Description */}
      <p className="text-lg text-muted-foreground mb-6 max-w-3xl">
        {article.description}
      </p>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
        <span className="flex items-center gap-1.5">
          <User className="h-4 w-4" />
          {article.author}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {formattedDate}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {readingTime} min de lecture
        </span>
      </div>
    </div>
  )
}
