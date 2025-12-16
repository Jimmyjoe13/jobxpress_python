import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "JobXpress - Assistant de Candidature IA",
  description: "Automatisez votre recherche d'emploi avec l'intelligence artificielle. Trouvez les meilleures offres et générez des lettres de motivation personnalisées.",
  keywords: ["emploi", "candidature", "IA", "lettre de motivation", "recherche emploi"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 antialiased">
        {children}
      </body>
    </html>
  )
}
