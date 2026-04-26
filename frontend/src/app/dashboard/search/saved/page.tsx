"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bookmark,
  Loader2,
  AlertTriangle,
  ArrowLeft
} from "lucide-react"
import { SavedJobCard } from "@/components/jobs/saved-job-card"
import { getSavedJobs, deleteSavedJob, SavedJobResponse } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"

export default function SavedJobsPage() {
  const { showToast } = useToast()
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSavedJobs()
  }, [])

  const loadSavedJobs = async () => {
    try {
      setIsLoading(true)
      const data = await getSavedJobs(100)
      setSavedJobs(data.saved_jobs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des favoris")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedJob(id)
      setSavedJobs(prev => prev.filter(job => job.id !== id))
      showToast("Offre retirée des favoris", "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Impossible de retirer cette offre", "error")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/search" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour à la recherche
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Bookmark className="w-8 h-8 text-indigo-400" />
              Mes offres sauvegardées
            </h1>
            <p className="text-slate-400">Retrouvez toutes vos offres favorites au même endroit pour y postuler plus tard.</p>
          </div>
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <span className="text-sm font-medium text-slate-300">
              <span className="text-white text-lg mr-2">{savedJobs.length}</span>
              offre{savedJobs.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border border-slate-800 bg-slate-800/20 rounded-2xl">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-400">Chargement de vos favoris...</p>
        </div>
      ) : savedJobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 px-4 border border-slate-800 bg-slate-800/20 rounded-2xl"
        >
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Bookmark className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Aucun favori pour le moment</h3>
          <p className="text-slate-400 mb-6">Sauvegardez des offres depuis la recherche rapide pour les retrouver ici.</p>
          <Link
            href="/dashboard/search"
            className="inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            Aller à la recherche
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          <AnimatePresence>
            {savedJobs.map((savedJob) => (
              <SavedJobCard
                key={savedJob.id}
                savedJob={savedJob}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
