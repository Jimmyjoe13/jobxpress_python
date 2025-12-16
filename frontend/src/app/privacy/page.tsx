"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { 
  Sparkles, 
  Menu,
  X,
  Shield
} from "lucide-react"
import { motion } from "framer-motion"

export default function PrivacyPage() {
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
              <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
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
                <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors font-medium py-2">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Vos données sont protégées</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Politique de </span>
              <span className="text-gradient">Confidentialité</span>
            </h1>
            
            <p className="text-lg text-slate-400">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== CONTENT ========== */}
      <section className="pb-20 md:pb-32 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 md:p-12"
          >
            <article className="prose prose-invert prose-slate max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-white">
              
              <h2>1. Introduction</h2>
              <p>
                Chez JobXpress, nous prenons la protection de vos données personnelles très au sérieux. 
                Cette politique de confidentialité explique comment nous collectons, utilisons, stockons 
                et protégeons vos informations lorsque vous utilisez notre plateforme de recherche d&apos;emploi 
                automatisée.
              </p>

              <h2>2. Données que nous collectons</h2>
              <p>Nous collectons les types de données suivants :</p>
              <ul>
                <li><strong>Informations d&apos;identification :</strong> nom, prénom, adresse email</li>
                <li><strong>Données professionnelles :</strong> CV, lettres de motivation, expériences</li>
                <li><strong>Données de recherche :</strong> critères de recherche d&apos;emploi, préférences</li>
                <li><strong>Données techniques :</strong> adresse IP, type de navigateur, cookies</li>
              </ul>

              <h2>3. Utilisation des données</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul>
                <li>Fournir nos services de recherche d&apos;emploi automatisée</li>
                <li>Générer des lettres de motivation personnalisées</li>
                <li>Améliorer la pertinence des offres proposées</li>
                <li>Communiquer avec vous concernant votre compte</li>
                <li>Analyser et améliorer nos services</li>
              </ul>

              <h2>4. Protection des données</h2>
              <p>
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles 
                appropriées pour protéger vos données contre tout accès non autorisé, modification, 
                divulgation ou destruction. Cela inclut le chiffrement des données sensibles, 
                des contrôles d&apos;accès stricts et des audits de sécurité réguliers.
              </p>

              <h2>5. Partage des données</h2>
              <p>
                Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos 
                informations avec des tiers uniquement dans les cas suivants :
              </p>
              <ul>
                <li>Avec votre consentement explicite</li>
                <li>Pour fournir nos services (ex: envoi d&apos;emails)</li>
                <li>Pour respecter nos obligations légales</li>
                <li>Pour protéger nos droits et notre sécurité</li>
              </ul>

              <h2>6. Vos droits</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul>
                <li><strong>Accès :</strong> obtenir une copie de vos données</li>
                <li><strong>Rectification :</strong> corriger vos données inexactes</li>
                <li><strong>Suppression :</strong> demander l&apos;effacement de vos données</li>
                <li><strong>Portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Opposition :</strong> vous opposer au traitement de vos données</li>
              </ul>

              <h2>7. Cookies</h2>
              <p>
                Nous utilisons des cookies essentiels pour le fonctionnement de notre plateforme 
                et des cookies analytiques pour améliorer nos services. Vous pouvez gérer vos 
                préférences de cookies à tout moment via les paramètres de votre navigateur.
              </p>

              <h2>8. Conservation des données</h2>
              <p>
                Nous conservons vos données aussi longtemps que votre compte est actif ou que 
                nécessaire pour vous fournir nos services. Vous pouvez demander la suppression 
                de votre compte et de vos données à tout moment.
              </p>

              <h2>9. Contact</h2>
              <p>
                Pour toute question concernant cette politique de confidentialité ou pour exercer 
                vos droits, contactez-nous à :{" "}
                <a href="mailto:privacy@jobxpress.com" className="text-indigo-400 hover:text-indigo-300">
                  privacy@jobxpress.com
                </a>
              </p>

            </article>
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
              <Link href="/privacy" className="text-white transition-colors">Confidentialité</Link>
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
