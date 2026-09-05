"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  MapPin, 
  Building2, 
  Globe, 
  AlertTriangle, 
  DollarSign,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Loader2
} from "lucide-react"
import { JobResultItem, saveJob } from "@/lib/api"
import { useToast } from "@/components/ui/toast"

interface QuickSearchJobCardProps {
  job: JobResultItem
  isInitiallySaved?: boolean
  onSavedComplete?: () => void
}

export function QuickSearchJobCard({ 
  job, 
  isInitiallySaved = false,
  onSavedComplete
}: QuickSearchJobCardProps) {
  const { showToast } = useToast()
  const [isSaved, setIsSaved] = useState(isInitiallySaved)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaved) return // Already saved, or handle unsave if needed (though unsave requires job.id from saved_jobs which we might not have)
    
    setIsSaving(true)
    try {
      await saveJob({
        job_data: job,
        notes: "",
        source: "search"
      })
      setIsSaved(true)
      showToast("Offre sauvegardée avec succès", "success")
      if (onSavedComplete) onSavedComplete()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur lors de la sauvegarde", "error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 rounded-xl border transition-all
        hover:border-slate-600 bg-slate-800/50 border-slate-700
      `}
    >
      {/* Save action */}
      <button
        onClick={handleSave}
        disabled={isSaved || isSaving}
        className={`
          absolute top-4 right-4 w-8 h-8 rounded-full border flex items-center justify-center transition-all bg-slate-800
          ${isSaved 
            ? "border-emerald-500 text-emerald-500" 
            : "border-slate-600 text-slate-400 hover:text-white hover:border-slate-400"
          }
        `}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSaved ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
      </button>

      {/* Header */}
      <div className="pr-12">
        <h3 className="font-semibold text-white text-lg leading-tight mb-1">
          {job.title}
        </h3>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Building2 className="w-4 h-4" />
          <span>{job.company}</span>
        </div>
      </div>

      {/* Location & Details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-slate-500">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>{job.location}</span>
        </div>
        {job.date_posted && (
          <span className="text-slate-600">• {job.date_posted}</span>
        )}
        {job.source && (
          <span className="text-slate-600 text-xs">via {job.source}</span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        {job.is_remote && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Globe className="w-3 h-3" />
            Remote
          </span>
        )}
        {job.work_type && job.work_type !== "Full Remote" && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {job.work_type}
          </span>
        )}
        {job.salary ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            <DollarSign className="w-3 h-3" />
            {job.salary}
          </span>
        ) : job.salary_warning ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DollarSign className="w-3 h-3" />
            Salaire non précisé
          </span>
        ) : null}
        {job.is_agency && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            Cabinet
          </span>
        )}
      </div>

      {/* External link */}
      <a 
        href={job.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mt-4 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Voir l&apos;offre
      </a>
    </motion.div>
  )
}
