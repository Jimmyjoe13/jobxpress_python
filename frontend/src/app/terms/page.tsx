"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { 
  Sparkles, 
  Menu,
  X,
  FileText
} from "lucide-react"
import { motion } from "framer-motion"

export default function TermsPage() {
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-300">Document légal</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Conditions </span>
              <span className="text-gradient">d&apos;Utilisation</span>
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
              
              <h2>1. Acceptation des conditions</h2>
              <p>
                En accédant et en utilisant la plateforme JobXpress, vous acceptez d&apos;être lié 
                par les présentes Conditions d&apos;Utilisation. Si vous n&apos;acceptez pas ces conditions, 
                veuillez ne pas utiliser notre service.
              </p>

              <h2>2. Description du service</h2>
              <p>
                JobXpress est une plateforme de recherche d&apos;emploi automatisée utilisant 
                l&apos;intelligence artificielle pour :
              </p>
              <ul>
                <li>Rechercher des offres d&apos;emploi correspondant à votre profil</li>
                <li>Analyser la pertinence des offres par rapport à votre CV</li>
                <li>Générer des lettres de motivation personnalisées</li>
                <li>Vous envoyer les résultats par email</li>
              </ul>

              <h2>3. Inscription et compte</h2>
              <p>Pour utiliser nos services, vous devez :</p>
              <ul>
                <li>Être âgé d&apos;au moins 18 ans</li>
                <li>Fournir des informations exactes et complètes</li>
                <li>Maintenir la confidentialité de vos identifiants</li>
                <li>Nous informer de toute utilisation non autorisée</li>
              </ul>
              <p>
                Vous êtes responsable de toutes les activités effectuées sous votre compte.
              </p>

              <h2>4. Utilisation acceptable</h2>
              <p>Vous vous engagez à ne pas :</p>
              <ul>
                <li>Utiliser le service à des fins illégales</li>
                <li>Tenter d&apos;accéder aux systèmes sans autorisation</li>
                <li>Transmettre des virus ou codes malveillants</li>
                <li>Usurper l&apos;identité d&apos;une autre personne</li>
                <li>Utiliser des robots ou scripts automatisés</li>
                <li>Revendre ou redistribuer nos services</li>
              </ul>

              <h2>5. Propriété intellectuelle</h2>
              <p>
                Tout le contenu de JobXpress (logos, textes, images, code) est protégé par 
                les droits de propriété intellectuelle. Vous ne pouvez pas reproduire, modifier 
                ou distribuer ce contenu sans notre autorisation écrite préalable.
              </p>
              <p>
                Vous conservez tous les droits sur le contenu que vous soumettez (CV, lettres), 
                mais nous accordez une licence pour l&apos;utiliser dans le cadre de nos services.
              </p>

              <h2>6. Tarification et paiement</h2>
              <p>
                Notre service propose différents plans tarifaires. En souscrivant à un plan payant :
              </p>
              <ul>
                <li>Vous acceptez les prix affichés au moment de l&apos;achat</li>
                <li>Les paiements sont traités de manière sécurisée</li>
                <li>Les abonnements sont renouvelés automatiquement</li>
                <li>Vous pouvez annuler à tout moment depuis votre compte</li>
              </ul>

              <h2>7. Limitation de responsabilité</h2>
              <p>
                JobXpress fournit son service &quot;tel quel&quot;. Nous ne garantissons pas :
              </p>
              <ul>
                <li>L&apos;obtention d&apos;un emploi suite à l&apos;utilisation du service</li>
                <li>L&apos;exactitude des offres d&apos;emploi agrégées</li>
                <li>La disponibilité continue et sans interruption</li>
              </ul>
              <p>
                Notre responsabilité est limitée au montant payé pour le service.
              </p>

              <h2>8. Résiliation</h2>
              <p>
                Nous nous réservons le droit de suspendre ou résilier votre compte en cas de 
                violation de ces conditions, sans préavis. Vous pouvez également supprimer 
                votre compte à tout moment depuis vos paramètres.
              </p>

              <h2>9. Modifications des conditions</h2>
              <p>
                Nous pouvons modifier ces conditions à tout moment. Les modifications prennent 
                effet dès leur publication. Nous vous informerons des changements significatifs 
                par email. Votre utilisation continue du service vaut acceptation des nouvelles conditions.
              </p>

              <h2>10. Droit applicable</h2>
              <p>
                Ces conditions sont régies par le droit français. Tout litige sera soumis 
                à la compétence exclusive des tribunaux de Paris.
              </p>

              <h2>11. Contact</h2>
              <p>
                Pour toute question concernant ces conditions, contactez-nous à :{" "}
                <a href="mailto:legal@jobxpress.com" className="text-indigo-400 hover:text-indigo-300">
                  legal@jobxpress.com
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
              <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link href="/terms" className="text-white transition-colors">Conditions</Link>
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
