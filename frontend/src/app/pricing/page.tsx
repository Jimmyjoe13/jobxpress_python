"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { 
  Sparkles, 
  Check, 
  Zap, 
  Star,
  Menu,
  X,
  ArrowRight
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Gratuit",
    price: "0€",
    period: "pour toujours",
    description: "Parfait pour découvrir JobXpress",
    features: [
      "5 candidatures par mois",
      "Recherche de base",
      "Lettres de motivation simples",
      "Support par email",
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    popular: false,
  },
  {
    name: "Pro",
    price: "19€",
    period: "/mois",
    description: "Pour les chercheurs d'emploi sérieux",
    features: [
      "Candidatures illimitées",
      "IA avancée pour le matching",
      "Lettres personnalisées premium",
      "Analyse de CV détaillée",
      "Support prioritaire 24/7",
      "Statistiques avancées",
    ],
    cta: "Essayer Pro gratuitement",
    href: "/register?plan=pro",
    popular: true,
  },
  {
    name: "Entreprise",
    price: "49€",
    period: "/mois",
    description: "Pour les équipes et recruteurs",
    features: [
      "Tout du plan Pro",
      "Accès API complet",
      "Gestion d'équipe",
      "Onboarding personnalisé",
      "Account manager dédié",
      "SLA garanti 99.9%",
    ],
    cta: "Contacter les ventes",
    href: "/contact",
    popular: false,
  },
]

export default function PricingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen mesh-gradient">
      {/* ========== HEADER ========== */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'py-3 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800' 
            : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group relative z-10">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-white">Job</span>
                <span className="text-gradient">Xpress</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 relative z-10">
              <Link href="/#features" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                Fonctionnalités
              </Link>
              <Link href="/#how-it-works" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                Comment ça marche
              </Link>
              <Link href="/pricing" className="text-white transition-colors text-sm font-medium">
                Tarifs
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4 relative z-10">
              <Link 
                href="/login" 
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium px-4 py-2"
              >
                Connexion
              </Link>
              <Link 
                href="/register" 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/40 transition-all hover:scale-105"
              >
                Commencer gratuitement
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-300 hover:text-white relative z-10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t border-slate-700/50 animate-slide-up">
              <nav className="flex flex-col gap-4">
                <Link href="/#features" className="text-slate-300 hover:text-white transition-colors font-medium py-2">
                  Fonctionnalités
                </Link>
                <Link href="/#how-it-works" className="text-slate-300 hover:text-white transition-colors font-medium py-2">
                  Comment ça marche
                </Link>
                <Link href="/pricing" className="text-white transition-colors font-medium py-2">
                  Tarifs
                </Link>
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-700/50">
                  <Link href="/login" className="text-center py-3 text-slate-300 hover:text-white border border-slate-700 rounded-xl">
                    Connexion
                  </Link>
                  <Link 
                    href="/register" 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-center font-semibold"
                  >
                    Commencer gratuitement
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-20">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-slate-300">Tarification simple et transparente</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Choisissez votre </span>
              <span className="text-gradient">plan</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
              Commencez gratuitement et évoluez selon vos besoins. 
              Annulez à tout moment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== PRICING CARDS ========== */}
      <section className="pb-20 md:pb-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`
                  relative rounded-2xl p-8 
                  ${plan.popular 
                    ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20' 
                    : 'bg-slate-800/50 border border-slate-700/50'
                  }
                `}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg">
                      <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                      <span className="text-sm font-semibold text-white">Populaire</span>
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-1 ${plan.popular ? 'bg-indigo-500/20' : 'bg-slate-700/50'}`}>
                        <Check className={`w-4 h-4 ${plan.popular ? 'text-indigo-400' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href={plan.href}>
                  <Button 
                    variant={plan.popular ? "gradient" : "outline"} 
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* FAQ Teaser */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <p className="text-slate-400">
              Des questions ? {" "}
              <Link href="/contact" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                Contactez-nous
              </Link>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">JobXpress</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8 text-sm text-slate-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Conditions</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>

            {/* Copyright */}
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} JobXpress. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
