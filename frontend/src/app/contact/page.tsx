"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { 
  Sparkles, 
  Mail, 
  MapPin,
  Phone,
  Send,
  Menu,
  X,
  MessageSquare
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

const subjects = [
  { value: "general", label: "Question générale" },
  { value: "support", label: "Support technique" },
  { value: "sales", label: "Ventes & Partenariats" },
  { value: "feedback", label: "Retour d'expérience" },
  { value: "other", label: "Autre" },
]

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "support@jobxpress.com",
    href: "mailto:support@jobxpress.com",
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: "+33 1 23 45 67 89",
    href: "tel:+33123456789",
  },
  {
    icon: MapPin,
    label: "Adresse",
    value: "42 Rue de l'Innovation\n75001 Paris, France",
    href: null,
  },
]

export default function ContactPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Reset form
    setFormData({ name: "", email: "", subject: "", message: "" })
    setIsSubmitting(false)
    
    // You could add a toast notification here
    alert("Message envoyé avec succès !")
  }

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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300">Nous sommes là pour vous aider</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Contactez-</span>
              <span className="text-gradient">nous</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
              Une question, une suggestion ou besoin d&apos;aide ? 
              Notre équipe vous répond sous 24h.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== CONTACT CONTENT ========== */}
      <section className="pb-20 md:pb-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-3"
            >
              <Card variant="gradient" className="p-8">
                <CardContent className="p-0">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <Input
                        label="Nom complet"
                        placeholder="Jean Dupont"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="jean@exemple.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    
                    <Select
                      label="Sujet"
                      options={subjects}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                    
                    <Textarea
                      label="Message"
                      placeholder="Comment pouvons-nous vous aider ?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      required
                    />
                    
                    <Button 
                      type="submit" 
                      variant="gradient" 
                      size="lg" 
                      className="w-full sm:w-auto"
                      isLoading={isSubmitting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer le message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 space-y-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Nos coordonnées</h2>
              
              {contactInfo.map((info, index) => (
                <Card key={index} variant="default" className="p-6">
                  <CardContent className="p-0 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <info.icon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">{info.label}</p>
                      {info.href ? (
                        <a 
                          href={info.href} 
                          className="text-white hover:text-indigo-400 transition-colors whitespace-pre-line"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-white whitespace-pre-line">{info.value}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Response Time */}
              <Card variant="glass" className="p-6">
                <CardContent className="p-0 text-center">
                  <p className="text-slate-400 text-sm mb-2">Temps de réponse moyen</p>
                  <p className="text-3xl font-bold text-gradient">&lt; 24h</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
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
