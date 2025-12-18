"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, Coins, X } from "lucide-react"
import Link from "next/link"

interface NoCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  creditsNeeded?: number
}

export function NoCreditsModal({ 
  isOpen, 
  onClose, 
  creditsNeeded = 1 
}: NoCreditsModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-white text-center mb-2">
                Crédits insuffisants
              </h2>

              {/* Description */}
              <p className="text-slate-400 text-center mb-6">
                Cette action nécessite <strong className="text-white">{creditsNeeded} crédit{creditsNeeded > 1 ? 's' : ''}</strong>. 
                Vos crédits gratuits seront rechargés chaque semaine, ou passez au plan Pro pour en obtenir plus.
              </p>

              {/* Credits info */}
              <div className="flex items-center justify-center gap-2 p-3 bg-slate-800/50 rounded-xl mb-6">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-slate-300">
                  <strong className="text-white">Plan Gratuit:</strong> 5 crédits/semaine
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Fermer
                </button>
                <Link
                  href="/pricing"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl text-center hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                >
                  Voir les plans
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
