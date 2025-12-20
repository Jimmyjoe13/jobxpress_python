"use client"

import { useEffect, useState, useCallback } from "react"
import { Coins, Loader2, RefreshCw, Star, Crown, Zap } from "lucide-react"
import { getCredits, UserCredits } from "@/lib/api"
import Link from "next/link"

interface CreditsBadgeProps {
  className?: string
  showPlan?: boolean
  showUpgrade?: boolean
  onCreditsChange?: (credits: number) => void
}

// Configuration des couleurs par plan
const planStyles = {
  FREE: {
    badge: "bg-slate-700 text-slate-400",
    label: "Freemium",
    icon: Zap,
    iconColor: "text-slate-400"
  },
  STARTER: {
    badge: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    label: "Starter",
    icon: Star,
    iconColor: "text-cyan-400"
  },
  PRO: {
    badge: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    label: "Pro",
    icon: Crown,
    iconColor: "text-purple-400"
  }
}

export function CreditsBadge({ 
  className = "", 
  showPlan = false,
  showUpgrade = false,
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

  const plan = credits.plan as keyof typeof planStyles
  const planConfig = planStyles[plan] || planStyles.FREE
  const PlanIcon = planConfig.icon

  const isLow = credits.credits <= 2
  const isEmpty = credits.credits === 0
  const canUpgrade = plan === "FREE" && showUpgrade

  return (
    <div className="flex items-center gap-2">
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
          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${planConfig.badge}`}>
            <PlanIcon className={`w-3 h-3 ${planConfig.iconColor}`} />
            {planConfig.label}
          </span>
        )}
      </div>

      {/* Bouton Upgrade pour les utilisateurs FREE */}
      {canUpgrade && (
        <Link 
          href="/dashboard/subscription"
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-full transition-colors"
        >
          <Star className="w-3 h-3" />
          Upgrade
        </Link>
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

// Badge de plan standalone (pour les pages profil, etc.)
export function PlanBadge({ plan }: { plan: string }) {
  const planConfig = planStyles[plan as keyof typeof planStyles] || planStyles.FREE
  const PlanIcon = planConfig.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${planConfig.badge}`}>
      <PlanIcon className={`w-4 h-4 ${planConfig.iconColor}`} />
      {planConfig.label}
    </span>
  )
}
