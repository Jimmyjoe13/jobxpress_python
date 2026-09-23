import Link from "next/link"
import { ArrowRight, CalendarDays, Clock } from "lucide-react"
import { getAllArticles, estimateReadingTime } from "@/lib/blog"

/**
 * Bloc "Derniers articles" sur la home : maillage interne home -> blog.
 * Composant serveur (pas de JS client) pour un HTML complet côté crawler.
 * Sélection : les 3 articles les plus récents du cocon.
 */
const RECENT = getAllArticles().slice(0, 3)

export function BlogTeaserSection() {
  return (
    <section className="py-20 md:py-28 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-4">
            Blog
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            Conseils pour ta recherche d&apos;emploi
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Guides et méthodes gratuits, écrits par l&apos;équipe JobXpress.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {RECENT.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group flex flex-col p-7 rounded-3xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/40 backdrop-blur-sm transition-all duration-300"
            >
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-4">
                <CalendarDays className="w-3.5 h-3.5" />
                <time dateTime={article.date}>
                  {new Date(article.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {estimateReadingTime(article.content)} min
                </span>
                {article.tags[0] ? (
                  <span className="ml-auto px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                    {article.tags[0]}
                  </span>
                ) : null}
              </div>
              <h3 className="text-white font-bold text-lg mb-3 leading-snug group-hover:text-indigo-300 transition-colors">
                {article.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
                {article.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-indigo-400 text-sm font-semibold">
                Lire l&apos;article
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold hover:bg-indigo-500/20 transition-colors"
          >
            Voir tous les articles du blog
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
