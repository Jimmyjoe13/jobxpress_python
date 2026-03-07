"use client"

import { motion } from "framer-motion"
import { Zap, MessageSquare, Plus } from "lucide-react"
import Link from "next/link"

interface QuotaWidgetProps {
  credits: number
  maxCredits: number
  planName: string
  jobyJobaMessages: number
  jobyJobaLimit: number
  isDailyLimit: boolean
}

export function QuotaWidget({ 
  credits = 0, 
  maxCredits = 5, 
  planName = "FREE",
  jobyJobaMessages = 0,
  jobyJobaLimit = 10,
  isDailyLimit = false
}: QuotaWidgetProps) {
  
  const creditPercentage = Math.min(100, (credits / (maxCredits || 1)) * 100)
  const chatPercentage = Math.min(100, (jobyJobaMessages / (jobyJobaLimit || 1)) * 100)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Credits Quota */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/20 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Crédits de recherche</div>
              <div className="text-white font-bold">{credits} / {maxCredits}</div>
            </div>
          </div>
          {credits < 2 && (
            <Link 
              href="/dashboard/upgrade" 
              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              title="Recharger"
            >
              <Plus className="w-4 h-4" />
            </Link>
          )}
        </div>
        
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${creditPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${creditPercentage < 20 ? 'bg-red-500' : 'bg-indigo-500'}`}
          />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">Plan {planName}</span>
          <span className="text-slate-400 font-medium">{Math.round(creditPercentage)}% restant</span>
        </div>
      </div>

      {/* Chat Quota */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 hover:border-purple-500/20 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Messages JobyJoba</div>
              <div className="text-white font-bold">{jobyJobaMessages} / {jobyJobaLimit}</div>
            </div>
          </div>
          <div className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 border border-white/5">
            {isDailyLimit ? "Quotidien" : "Mensuel"}
          </div>
        </div>
        
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${100 - chatPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${chatPercentage > 80 ? 'bg-orange-500' : 'bg-purple-500'}`}
          />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">IA Conversationnelle</span>
          <span className="text-slate-400 font-medium">Reset {isDailyLimit ? "demain" : "prochain mois"}</span>
        </div>
      </div>
    </div>
  )
}
