"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Star, ArrowRight, X, Zap, AlertTriangle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCredits, type UserCredits } from "@/lib/api"

// ============================================
// TYPES
// ============================================

type BannerVariant = "standard" | "warning" | "critical"

interface UpgradeBannerProps {
  className?: string
  alwaysShow?: boolean  // Show even if user has credits
  onDismiss?: () => void
  variant?: BannerVariant | "auto"  // auto = based on credit count
}

// ============================================
// BANNER CONFIG BY VARIANT
// ============================================

const variantConfig = {
  standard: {
    gradient: "from-indigo-500/10 to-purple-500/10",
    border: "border-indigo-500/20",
    icon: Star,
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
    title: "Débloquez tout le potentiel de JobXpress",
    description: "Passez à Starter pour 100 crédits/mois et accélérez votre recherche d'emploi.",
    ctaText: "Voir les offres",
    pulse: false
  },
  warning: {
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    title: "Crédits presque épuisés !",
    description: "Il ne vous reste que quelques crédits. Rechargez maintenant pour continuer.",
    ctaText: "Recharger",
    pulse: true
  },
  critical: {
    gradient: "from-red-500/10 to-rose-500/10",
    border: "border-red-500/30",
    icon: XCircle,
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    title: "Plus de crédits disponibles",
    description: "Vos crédits sont épuisés. Passez à Starter pour continuer vos recherches.",
    ctaText: "Passer à Starter",
    pulse: true
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UpgradeBanner({ 
  className = "", 
  alwaysShow = false,
  onDismiss,
  variant = "auto"
}: UpgradeBannerProps) {
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  const fetchCredits = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCredits()
      setCredits(data)
    } catch {
      // Silent fail - banner just won't show
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  // Determine visibility
  if (isLoading || isDismissed) return null
  if (!credits) return null
  if (credits.plan !== "FREE" && !alwaysShow) return null
  if (credits.credits > 3 && !alwaysShow && variant === "auto") return null

  // Determine variant
  let effectiveVariant: BannerVariant = "standard"
  if (variant === "auto") {
    if (credits.credits === 0) effectiveVariant = "critical"
    else if (credits.credits <= 2) effectiveVariant = "warning"
    else effectiveVariant = "standard"
  } else {
    effectiveVariant = variant
  }

  const config = variantConfig[effectiveVariant]
  const Icon = config.icon

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          relative rounded-xl p-4 border backdrop-blur-sm
          bg-gradient-to-r ${config.gradient} ${config.border}
          ${config.pulse ? "animate-pulse-subtle" : ""}
          ${className}
        `}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.div 
              className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center shrink-0`}
              animate={config.pulse ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </motion.div>
            <div className="min-w-0">
              <p className="text-white font-medium text-sm sm:text-base truncate">
                {config.title}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm hidden sm:block">
                {config.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard/subscription">
              <Button 
                variant={effectiveVariant === "critical" ? "gradient" : "outline"} 
                size="sm"
                className="text-xs sm:text-sm"
              >
                {config.ctaText}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
            
            {onDismiss && (
              <button 
                onClick={handleDismiss}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/50"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Credits indicator for warning/critical */}
        {effectiveVariant !== "standard" && credits && (
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <div className="flex items-center gap-2">
              <Zap className={`w-3.5 h-3.5 ${config.iconColor}`} />
              <span className="text-xs text-slate-400">
                {credits.credits} crédit{credits.credits !== 1 ? "s" : ""} restant{credits.credits !== 1 ? "s" : ""}
                {credits.next_reset_at && (
                  <> • Reset {new Date(credits.next_reset_at).toLocaleDateString("fr-FR", { 
                    day: "numeric", 
                    month: "short" 
                  })}</>
                )}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================
// COMPACT VERSION FOR SIDEBARS
// ============================================

export function UpgradeBannerCompact({ className = "" }: { className?: string }) {
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCredits()
      .then(setCredits)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading || !credits || credits.plan !== "FREE") return null

  return (
    <Link 
      href="/dashboard/subscription"
      className={`
        block rounded-lg p-3 
        bg-gradient-to-r from-indigo-500/10 to-purple-500/10 
        border border-indigo-500/20 
        hover:border-indigo-500/40 hover:from-indigo-500/15 hover:to-purple-500/15
        transition-all group
        ${className}
      `}
    >
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-indigo-400">Passer à Starter</span>
        <ArrowRight className="w-3.5 h-3.5 text-indigo-400 ml-auto group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-[10px] text-slate-500 mt-1">100 crédits/mois • 9,99€</p>
    </Link>
  )
}
