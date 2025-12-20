"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  Star, 
  Check, 
  ArrowRight, 
  Clock, 
  Zap,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { type UserCredits } from "@/lib/api"

// ============================================
// TYPES
// ============================================

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  credits?: UserCredits | null
  title?: string
  description?: string
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.95, y: 20 }
}

const starterFeatures = [
  "100 crédits par mois",
  "Reset mensuel automatique",
  "Support prioritaire",
  "Historique complet de vos candidatures"
]

// ============================================
// MAIN COMPONENT
// ============================================

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  credits,
  title = "Plus de crédits disponibles",
  description = "Vos crédits hebdomadaires sont épuisés. Passez à Starter pour continuer vos recherches d'emploi !"
}: UpgradeModalProps) {
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  // Calculate time until reset
  const getTimeUntilReset = () => {
    if (!credits?.next_reset_at) return null
    const resetDate = new Date(credits.next_reset_at)
    const now = new Date()
    const diffMs = resetDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return "aujourd'hui"
    if (diffDays === 1) return "demain"
    return `dans ${diffDays} jours`
  }

  const timeUntilReset = getTimeUntilReset()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with animation */}
            <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent" />
              
              {/* Animated icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative inline-flex mb-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-red-400" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
                >
                  0
                </motion.div>
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2 relative">
                {title}
              </h2>
              <p className="text-slate-400 text-sm relative">
                {description}
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-4">
              {/* Starter Plan Card */}
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Plan Starter</p>
                    <p className="text-sm">
                      <span className="text-indigo-400 font-bold">9,99€</span>
                      <span className="text-slate-400">/mois</span>
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {starterFeatures.map((feature, idx) => (
                    <motion.li 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="flex items-start gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <a 
                  href="https://buy.stripe.com/7sYaEY5UdavdaDU0gZ3F601" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="gradient" className="w-full group">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Passer à Starter
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </div>

              {/* Alternative actions */}
              <div className="flex items-center justify-between gap-4">
                {timeUntilReset && (
                  <Link
                    href="/dashboard"
                    onClick={onClose}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Attendre le reset ({timeUntilReset})</span>
                  </Link>
                )}
                
                <Link
                  href="/dashboard/subscription"
                  onClick={onClose}
                  className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors ml-auto"
                >
                  Voir tous les plans
                </Link>
              </div>
            </div>

            {/* Footer note */}
            <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-800">
              <p className="text-[11px] text-slate-500 text-center">
                Annulez à tout moment • Paiement sécurisé par Stripe
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// HOOK FOR EASY USAGE
// ============================================

import { useState, useCallback } from "react"

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [credits, setCredits] = useState<UserCredits | null>(null)

  const open = useCallback((creditsData?: UserCredits) => {
    if (creditsData) setCredits(creditsData)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const checkAndOpen = useCallback((creditsData: UserCredits) => {
    if (creditsData.plan === "FREE" && creditsData.credits === 0) {
      setCredits(creditsData)
      setIsOpen(true)
      return true
    }
    return false
  }, [])

  return {
    isOpen,
    credits,
    open,
    close,
    checkAndOpen,
    UpgradeModalComponent: (
      <UpgradeModal 
        isOpen={isOpen} 
        onClose={close} 
        credits={credits}
      />
    )
  }
}
