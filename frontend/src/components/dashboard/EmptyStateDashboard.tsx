"use client"

import { motion } from "framer-motion"
import { Sparkles, ArrowRight, Play, Search, FileText } from "lucide-react"
import Link from "next/link"

export function EmptyStateDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-slate-900/40 rounded-3xl border border-white/5 border-dashed">
      <div className="relative mb-8">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20"
        >
          <Sparkles className="w-10 h-10 text-indigo-400" />
        </motion.div>
        
        {/* Floating Icons */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -top-4 -right-4 p-2 bg-slate-800 rounded-xl border border-white/10 shadow-lg"
        >
          <Search className="w-4 h-4 text-purple-400" />
        </motion.div>
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute -bottom-4 -left-4 p-2 bg-slate-800 rounded-xl border border-white/10 shadow-lg"
        >
          <FileText className="w-4 h-4 text-emerald-400" />
        </motion.div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-3">Votre succès commence ici</h3>
      <p className="text-slate-400 max-w-md mb-10 leading-relaxed text-lg font-medium">
        Vous n&apos;avez pas encore de candidatures actives. 
        Laissez l&apos;IA s&apos;occuper de la partie répétitive pour vous.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-lg">
        <Link
          href="/dashboard/apply"
          className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all hover:-translate-y-1"
        >
          Lancer ma première recherche
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        
        <Link
          href="#how-it-works"
          className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-800 text-white font-semibold rounded-2xl border border-slate-700 hover:bg-slate-750 transition-all"
        >
          <Play className="w-5 h-5 fill-white/20" />
          Démo rapide
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl px-4">
          <div className="text-left p-4 rounded-xl bg-slate-900/50 border border-white/5">
             <div className="text-indigo-400 font-bold mb-1">1. Configurez</div>
             <p className="text-[11px] text-slate-500">Importez votre CV et vos critères de recherche en 1 min.</p>
          </div>
          <div className="text-left p-4 rounded-xl bg-slate-900/50 border border-white/5">
             <div className="text-purple-400 font-bold mb-1">2. Sélectionnez</div>
             <p className="text-[11px] text-slate-500">L&apos;IA filtre les offres et vous propose les meilleurs matchs.</p>
          </div>
          <div className="text-left p-4 rounded-xl bg-slate-900/50 border border-white/5">
             <div className="text-emerald-400 font-bold mb-1">3. Postulez</div>
             <p className="text-[11px] text-slate-500">Obtenez une lettre optimisée et suivez votre candidature.</p>
          </div>
      </div>
    </div>
  )
}
