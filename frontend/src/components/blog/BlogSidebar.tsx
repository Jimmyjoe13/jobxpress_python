import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getAllTags } from "@/lib/blog"

interface BlogSidebarProps {
  currentTags?: string[]
}

export function BlogSidebar({ currentTags }: BlogSidebarProps) {
  const allTags = getAllTags()

  return (
    <aside className="space-y-8">
      {/* Newsletter CTA */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-purple-500/5 p-6">
        <h3 className="font-sora font-semibold text-foreground mb-2">
          Restez informé
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Recevez nos derniers articles et conseils pour booster votre carrière.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="votre@email.com"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Adresse email pour la newsletter"
          />
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
          >
            OK
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <h3 className="font-sora font-semibold text-foreground mb-4">Sujets</h3>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={currentTags?.includes(tag) ? "default" : "outline"}
              className="text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h3 className="font-sora font-semibold text-foreground mb-3">
          En savoir plus
        </h3>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/pricing" className="text-muted-foreground hover:text-indigo-400 transition-colors">
              → Voir nos tarifs
            </Link>
          </li>
          <li>
            <Link href="/contact" className="text-muted-foreground hover:text-indigo-400 transition-colors">
              → Nous contacter
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  )
}
