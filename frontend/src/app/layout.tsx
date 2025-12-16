import type { Metadata } from "next"
import { ToastProvider } from "@/components/ui/toast"
import "./globals.css"

export const metadata: Metadata = {
  title: "JobXpress - Automatisez votre recherche d'emploi avec l'IA",
  description: "JobXpress trouve les meilleures offres pour vous, analyse leur pertinence et génère des lettres de motivation personnalisées en quelques minutes.",
  keywords: ["emploi", "IA", "candidature", "lettre de motivation", "recherche d'emploi", "automatisation"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
