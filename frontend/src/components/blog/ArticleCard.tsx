import Link from "next/link"
import { Calendar, Clock, ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Article } from "@/lib/blog"
import { estimateReadingTime } from "@/lib/blog"

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  const readingTime = estimateReadingTime(article.content)
  const formattedDate = new Date(article.date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Link href={`/blog/${article.slug}`} className="group block">
      <Card
        variant="gradient"
        className="relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 h-full"
      >
        {/* Image placeholder */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-indigo-600/10">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-20">📝</span>
          </div>
        </div>

        <CardHeader className="pb-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-lg leading-tight group-hover:text-indigo-400 transition-colors line-clamp-2">
            {article.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1">
          <CardDescription className="text-sm line-clamp-3">
            {article.description}
          </CardDescription>
        </CardContent>

        <div className="px-6 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readingTime} min de lecture
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
        </div>
      </Card>
    </Link>
  )
}
