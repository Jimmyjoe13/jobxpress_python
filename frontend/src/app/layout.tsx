import type { Metadata } from "next"
import { Inter, Sora } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://jobxpress.fr"),
  title: {
    default: "jobXpress - Automatisez votre recherche d'emploi avec l'IA",
    template: "%s | jobXpress",
  },
  description: "jobXpress trouve les meilleures offres, analyse leur pertinence et génère des lettres de motivation personnalisées avec l'IA.",
  keywords: [
    "emploi",
    "IA",
    "candidature",
    "lettre de motivation",
    "recherche d'emploi",
    "automatisation",
    "assistant carrière",
    "intelligence artificielle",
  ],
  authors: [{ name: "jobXpress" }],
  creator: "jobXpress",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
