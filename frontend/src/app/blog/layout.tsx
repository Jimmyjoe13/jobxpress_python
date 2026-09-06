import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Blog — Conseils emploi et IA | jobXpress",
  description:
    "Découvrez nos guides, astuces et conseils pour optimiser votre recherche d'emploi avec l'intelligence artificielle. CV, lettres de motivation, entretiens et plus.",
  alternates: {
    canonical: "https://jobxpress.fr/blog",
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-purple-600/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-sora text-4xl font-bold sm:text-5xl">
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Blog
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Guides, astuces et conseils pour transformer votre recherche
              d&apos;emploi grâce à l&apos;intelligence artificielle.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
