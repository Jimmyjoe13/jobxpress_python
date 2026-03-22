"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, ArrowRight, CheckCircle, Shield, Clock, Play, Search, Sparkles } from "lucide-react"
import { ParticlesBackground, FloatingOrbs } from "@/components/ui/particles"

const trustIndicators = [
  { icon: CheckCircle, text: "Sans carte bancaire" },
  { icon: Shield, text: "5 crédits offerts" },
  { icon: Clock, text: "Zéro débit sans résultat" },
]

const stats = [
  { value: "15k+", label: "Candidatures générées", sub: "depuis le lancement" },
  { value: "92%", label: "Taux de satisfaction", sub: "utilisateurs actifs" },
  { value: "4.9/5", label: "Note moyenne", sub: "Trustpilot" },
  { value: "30s", label: "Pour scorer une offre", sub: "en moyenne" },
]

const searchPlaceholders = [
  "Développeur Fullstack React...",
  "Product Manager Sénior...",
  "Data Scientist Python...",
  "Commercial B2B SaaS...",
]

export function HeroSection() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden">
      {/* Background Elements */}
      <FloatingOrbs />
      <ParticlesBackground count={40} />
      
      {/* Radial Gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-8 backdrop-blur-md"
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">🚀 15 000+ candidatures générées</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-[1.1] tracking-tight text-white">
              Trouvez votre emploi{" "}
              <span className="text-gradient-animated">10x plus vite</span>{" "}
              avec l&apos;IA
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-xl leading-relaxed">
              JobXpress analyse des milliers d&apos;offres en temps réel,{" "}
              <span className="text-white font-medium">score votre compatibilité</span>{" "}
              et rédige des lettres personnalisées —{" "}
              <span className="text-indigo-400">le tout en moins de 30 secondes.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5 mb-12">
              <Link
                href="/register"
                className="group relative w-full sm:w-auto bg-white text-slate-950 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                Analyser mes opportunités gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-semibold text-white border border-slate-700 hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all text-center flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Voir comment ça marche
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {trustIndicators.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                  <item.icon className="w-4 h-4 text-indigo-500" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Visual Interaction */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative lg:block"
          >
            {/* Main Interactive Card */}
            <div className="glass rounded-[2rem] p-1 border border-white/5 shadow-2xl overflow-hidden">
               <div className="bg-slate-950/40 rounded-[1.8rem] p-8 md:p-10">
                  {/* Pseudo Browser Header */}
                  <div className="flex items-center gap-2 mb-8">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="ml-4 flex-grow h-7 bg-slate-900/50 rounded-lg border border-white/5 flex items-center px-3">
                       <span className="text-[10px] text-slate-600 truncate">jobxpress.fr/ai-search-v2</span>
                    </div>
                  </div>

                  {/* AI Search Animation UI */}
                  <div className="space-y-6">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative bg-slate-900/80 border border-white/10 rounded-2xl p-6">
                         <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                               <Search className="w-5 h-5 text-slate-900" />
                            </div>
                            <div className="flex-grow">
                               <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">IA en action</div>
                               <div className="h-6 flex items-center text-white font-medium overflow-hidden">
                                  <AnimatePresence mode="wait">
                                    <motion.span
                                      key={placeholderIndex}
                                      initial={{ y: 20, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: -20, opacity: 0 }}
                                      className="text-indigo-300"
                                    >
                                      {searchPlaceholders[placeholderIndex]}
                                    </motion.span>
                                  </AnimatePresence>
                               </div>
                            </div>
                         </div>
                         <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              className="h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" 
                            />
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 1 }}
                         className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl"
                      >
                         <div className="text-[10px] text-emerald-400 font-bold mb-1 uppercase">Score Match</div>
                         <div className="text-2xl font-bold text-white leading-none">98%</div>
                      </motion.div>
                      <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 1.2 }}
                         className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl"
                      >
                         <div className="text-[10px] text-indigo-400 font-bold mb-1 uppercase">Analyse CV</div>
                         <div className="text-sm font-medium text-white">Optimal</div>
                      </motion.div>
                    </div>

                    <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       transition={{ delay: 1.5 }}
                       className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-white/5"
                    >
                       <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                       </div>
                       <div className="text-xs text-slate-400 italic">
                          &quot;JobyJoba a identifié 4 compétences clés manquantes...&quot;
                       </div>
                    </motion.div>
                  </div>
               </div>
            </div>

            {/* Dashboard preview floating card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.6, duration: 0.8, ease: "easeOut" }}
              className="absolute -bottom-10 -left-10 w-56 h-36 rounded-2xl overflow-hidden border border-indigo-500/20 shadow-2xl z-20 hidden lg:block"
            >
              <Image
                src="/images/hero-dashboard.png"
                alt="Aperçu du dashboard JobXpress"
                fill
                className="object-cover"
                sizes="224px"
              />
              <div className="absolute inset-0 bg-slate-950/40" />
              <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/80 font-medium">Dashboard IA en direct</span>
              </div>
            </motion.div>

            {/* Decorative Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"
            />
          </motion.div>

        </div>

        {/* Bottom Stats */}
        <div className="mt-24 pt-10 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400 tracking-wide font-medium">{stat.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{stat.sub}</div>
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}
