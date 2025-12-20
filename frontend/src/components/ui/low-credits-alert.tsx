"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, ArrowRight, X, Zap } from "lucide-react"
import { getCredits, type UserCredits } from "@/lib/api"

// ============================================
// TYPES
// ============================================

interface LowCreditsAlertProps {
  className?: string
  threshold?: number  // Show alert when credits <= threshold (default: 2)
  onDismiss?: () => void
  dismissible?: boolean
  compact?: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LowCreditsAlert({ 
  className = "", 
  threshold = 2,
  onDismiss,
  dismissible = true,
  compact = false
}: LowCreditsAlertProps) {
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  const fetchCredits = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCredits()
      setCredits(data)
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  // Don't show if:
  // - Still loading
  // - Dismissed
  // - No credits data
  // - User has enough credits
  // - User is not on FREE plan
  if (isLoading || isDismissed || !credits) return null
  if (credits.plan !== "FREE") return null
  if (credits.credits > threshold) return null

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const isCritical = credits.credits === 0

  // Compact version
  if (compact) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm
            ${isCritical 
              ? "bg-red-500/10 border border-red-500/30 text-red-400" 
              : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
            }
            ${className}
          `}
        >
          {isCritical ? (
            <Zap className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span className="font-medium">
            {isCritical 
              ? "Plus de crédits !" 
              : `${credits.credits} crédit${credits.credits !== 1 ? "s" : ""} restant${credits.credits !== 1 ? "s" : ""}`
            }
          </span>
          <Link 
            href="/dashboard/subscription"
            className="ml-auto flex items-center gap-1 hover:underline"
          >
            Recharger
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Full version
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`
          relative rounded-xl p-4 border
          ${isCritical 
            ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30" 
            : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30"
          }
          ${className}
        `}
      >
        <div className="flex items-start gap-3">
          <motion.div 
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center shrink-0
              ${isCritical ? "bg-red-500/20" : "bg-amber-500/20"}
            `}
            animate={isCritical ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {isCritical ? (
              <Zap className="w-5 h-5 text-red-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold mb-1 ${isCritical ? "text-red-400" : "text-amber-400"}`}>
              {isCritical 
                ? "Plus de crédits disponibles" 
                : `Plus que ${credits.credits} crédit${credits.credits !== 1 ? "s" : ""}`
              }
            </p>
            <p className="text-sm text-slate-400">
              {isCritical 
                ? "Passez à Starter pour continuer vos recherches d'emploi."
                : "Pensez à recharger pour ne pas interrompre vos recherches."
              }
            </p>
            <div className="mt-3">
              <Link 
                href="/dashboard/subscription"
                className={`
                  inline-flex items-center gap-1.5 text-sm font-medium transition-colors
                  ${isCritical 
                    ? "text-red-400 hover:text-red-300" 
                    : "text-amber-400 hover:text-amber-300"
                  }
                `}
              >
                {isCritical ? "Passer à Starter" : "Voir les options"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {dismissible && (
            <button 
              onClick={handleDismiss}
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/50 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar showing credits */}
        {credits.max_credits && (
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Crédits restants</span>
              <span className={isCritical ? "text-red-400" : "text-amber-400"}>
                {credits.credits}/{credits.max_credits}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(credits.credits / credits.max_credits) * 100}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${isCritical ? "bg-red-500" : "bg-amber-500"}`}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================
// INLINE VERSION (for inside forms)
// ============================================

export function LowCreditsInline({ credits }: { credits: UserCredits | null }) {
  if (!credits || credits.plan !== "FREE" || credits.credits > 2) return null

  const isCritical = credits.credits === 0

  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg text-xs
      ${isCritical 
        ? "bg-red-500/10 text-red-400" 
        : "bg-amber-500/10 text-amber-400"
      }
    `}>
      {isCritical ? (
        <Zap className="w-3.5 h-3.5" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5" />
      )}
      <span>
        {isCritical 
          ? "Plus de crédits !" 
          : `${credits.credits} crédit${credits.credits !== 1 ? "s" : ""} restant${credits.credits !== 1 ? "s" : ""}`
        }
      </span>
      <Link 
        href="/dashboard/subscription"
        className="ml-auto hover:underline font-medium"
      >
        Recharger →
      </Link>
    </div>
  )
}
