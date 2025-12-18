"use client"

import { useEffect, useState, useCallback } from "react"
import { Coins, Loader2, RefreshCw } from "lucide-react"
import { getCredits, UserCredits } from "@/lib/api"

interface CreditsBadgeProps {
  className?: string
  showPlan?: boolean
  onCreditsChange?: (credits: number) => void
}

export function CreditsBadge({ 
  className = "", 
  showPlan = false,
  onCreditsChange 
}: CreditsBadgeProps) {
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchCredits = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await getCredits()
      setCredits(data)
      onCreditsChange?.(data.credits)
    } catch {
      setError(true)
      setCredits(null)
    } finally {
      setLoading(false)
    }
  }, [onCreditsChange])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        <span className="text-sm text-slate-500">...</span>
      </div>
    )
  }

  if (error || !credits) {
    return (
      <button 
        onClick={fetchCredits}
        className={`flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full hover:bg-red-500/20 transition-colors ${className}`}
      >
        <RefreshCw className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400">Réessayer</span>
      </button>
    )
  }

  const isLow = credits.credits <= 1
  const isEmpty = credits.credits === 0

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all
        ${isEmpty 
          ? "bg-red-500/10 border border-red-500/30" 
          : isLow 
            ? "bg-amber-500/10 border border-amber-500/30" 
            : "bg-indigo-500/10 border border-indigo-500/30"
        } ${className}`}
    >
      <Coins className={`w-4 h-4 ${
        isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-indigo-400"
      }`} />
      <span className={`text-sm font-medium ${
        isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-indigo-400"
      }`}>
        {credits.credits} crédit{credits.credits !== 1 ? "s" : ""}
      </span>
      {showPlan && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          credits.plan === "PRO" 
            ? "bg-purple-500/20 text-purple-400" 
            : "bg-slate-700 text-slate-400"
        }`}>
          {credits.plan}
        </span>
      )}
    </div>
  )
}

// Version compacte pour les headers
export function CreditsIndicator({ credits }: { credits: number }) {
  const isLow = credits <= 1
  const isEmpty = credits === 0

  return (
    <div className="flex items-center gap-1.5">
      <Coins className={`w-4 h-4 ${
        isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-indigo-400"
      }`} />
      <span className={`text-sm font-medium ${
        isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-white"
      }`}>
        {credits}
      </span>
    </div>
  )
}
