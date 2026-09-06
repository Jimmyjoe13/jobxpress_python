import type { Metadata } from "next"
import { getAllArticles } from "@/lib/blog"
import { ArticleCard } from "@/components/blog/ArticleCard"
import { BlogSidebar } from "@/components/blog/BlogSidebar"

export const metadata: Metadata = {
  title: "Blog — Conseils emploi et IA",
  description:
    "Découvrez nos guides, astuces et conseils pour optimiser votre recherche d'emploi avec l'intelligence artificielle. Articles sur le CV, les lettres de motivation et plus.",
  alternates: {
    canonical: "https://jobxpress.fr/blog",
  },
  openGraph: {
    title: "Blog jobXpress — Conseils emploi et IA",
    description:
      "Guides, astuces et conseils pour transformer votre recherche d'emploi grâce à l'intelligence artificielle.",
    url: "https://jobxpress.fr/blog",
    siteName: "jobXpress",
    locale: "fr_FR",
    type: "website",
  },
}

export default function BlogPage() {
  const articles = getAllArticles()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
      {/* Articles grid */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Bientôt de nouveaux articles disponibles.
            </p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block">
        <BlogSidebar />
      </div>
    </div>
  )
}
