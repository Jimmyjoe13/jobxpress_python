"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { 
  Sparkles, 
  Search, 
  Brain, 
  FileText, 
  Mail, 
  ArrowRight, 
  CheckCircle, 
  Zap,
  Shield,
  Clock,
  Star,
  Menu,
  X,
  ChevronRight,
  Play
} from "lucide-react"

export default function Home() {
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
              <a href="#features" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                Fonctionnalités
              </a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                Comment ça marche
              </a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                Tarifs
              </a>
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
                <a href="#features" className="text-slate-300 hover:text-white transition-colors font-medium py-2">
                  Fonctionnalités
                </a>
                <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors font-medium py-2">
                  Comment ça marche
                </a>
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

      {/* ========== HERO SECTION ========== */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-8 animate-fade-in">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-slate-300">Propulsé par l&apos;Intelligence Artificielle</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up leading-tight">
              <span className="text-white">Votre recherche d&apos;emploi,</span>
              <br />
              <span className="text-gradient-animated">automatisée.</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '100ms' }}>
              JobXpress trouve les meilleures offres, analyse leur pertinence et génère 
              des lettres de motivation personnalisées. <span className="text-white font-semibold">En quelques minutes.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link 
                href="/dashboard/apply" 
                className="group w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Lancer ma recherche
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#how-it-works" 
                className="group w-full sm:w-auto px-8 py-4 rounded-full text-lg font-semibold text-white border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Voir la démo
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Gratuit pour commencer</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>Données sécurisées</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>Résultats en 5 min</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '400ms' }}>
            {[
              { value: "10K+", label: "Candidatures générées" },
              { value: "85%", label: "Taux de matching" },
              { value: "< 5min", label: "Temps moyen" },
              { value: "4.9/5", label: "Satisfaction" },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="text-2xl sm:text-3xl font-bold text-gradient mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="py-20 md:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-4">
              Fonctionnalités
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Une solution complète pour automatiser et optimiser votre recherche d&apos;emploi
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            {[
              {
                icon: Search,
                title: "Recherche Multi-Sources",
                description: "Agrégation d'offres depuis Google Jobs, Active Jobs DB et plus encore.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: Brain,
                title: "Analyse IA Avancée",
                description: "Scoring intelligent basé sur vos compétences et votre expérience.",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: FileText,
                title: "Lettres Personnalisées",
                description: "Génération automatique de lettres de motivation adaptées à chaque offre.",
                gradient: "from-indigo-500 to-purple-500"
              },
              {
                icon: Mail,
                title: "Livraison Email",
                description: "Recevez vos candidatures complètes directement dans votre boîte mail.",
                gradient: "from-emerald-500 to-teal-500"
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="feature-card group animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`icon-container bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                <div className="mt-4 flex items-center text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  En savoir plus <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-20 md:py-32 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold text-sm uppercase tracking-wider mb-4">
              Comment ça marche
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
              3 étapes simples
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              De votre profil à vos candidatures en quelques minutes
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Complétez votre profil",
                description: "Renseignez vos informations, le poste recherché et uploadez votre CV.",
                icon: FileText,
                color: "from-indigo-500 to-blue-600"
              },
              {
                step: "2",
                title: "L'IA analyse et recherche",
                description: "Notre moteur parcourt des milliers d'offres et sélectionne les plus pertinentes.",
                icon: Brain,
                color: "from-purple-500 to-pink-600"
              },
              {
                step: "3",
                title: "Recevez vos candidatures",
                description: "Obtenez vos lettres de motivation personnalisées et les meilleures opportunités.",
                icon: Mail,
                color: "from-emerald-500 to-teal-600"
              },
            ].map((item, i) => (
              <div key={i} className="relative animate-slide-up" style={{ animationDelay: `${i * 150}ms` }}>
                {/* Connection Line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-600 to-transparent" />
                )}
                
                <div className="relative text-center">
                  {/* Step Icon */}
                  <div className="relative inline-flex mb-6">
                    <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-2xl shadow-indigo-500/20`}>
                      <item.icon className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                      {item.step}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-20 md:py-32 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 mb-6 backdrop-blur-sm">
            <Star className="w-4 h-4 text-yellow-300" />
            <span className="text-white/90 text-sm font-medium">Rejoignez des milliers de candidats satisfaits</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à booster votre recherche d&apos;emploi ?
          </h2>
          
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Commencez gratuitement et recevez vos premières candidatures personnalisées en moins de 5 minutes.
          </p>
          
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-full text-lg font-bold shadow-2xl hover:shadow-white/20 transition-all hover:scale-105"
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5" />
          </Link>
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
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">Conditions</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
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
