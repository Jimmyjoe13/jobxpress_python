"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MapPin, 
  Building2, 
  Globe, 
  AlertTriangle, 
  DollarSign,
  ExternalLink,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Calendar
} from "lucide-react"
import { SavedJobItem, updateSavedJobNotes, JobResultItem } from "@/lib/api"
import { useToast } from "@/components/ui/toast"

interface SavedJobCardProps {
  savedJob: SavedJobItem
  onDelete: (id: string) => void
}

export function SavedJobCard({ savedJob, onDelete }: SavedJobCardProps) {
  const { showToast } = useToast()
  const job = savedJob.job_data as JobResultItem
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(savedJob.notes || "")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [currentNotes, setCurrentNotes] = useState(savedJob.notes || "")

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      await updateSavedJobNotes(savedJob.id, notes)
      setCurrentNotes(notes)
      setIsEditingNotes(false)
      showToast("Notes mises à jour", "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur de mise à jour des notes", "error")
    } finally {
      setIsSavingNotes(false)
    }
  }

  const cancelEdit = () => {
    setNotes(currentNotes)
    setIsEditingNotes(false)
  }

  // Format date
  const dateObj = new Date(savedJob.created_at)
  const formattedDate = new Intl.DateTimeFormat('fr-FR', { 
    day: '2-digit', month: 'short', year: 'numeric' 
  }).format(dateObj)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-slate-600 transition-all flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="pr-4">
          <h3 className="font-semibold text-white text-lg leading-tight mb-1">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Building2 className="w-4 h-4" />
            <span>{job.company}</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(savedJob.id)}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
          title="Retirer des favoris"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mb-4">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center gap-1.5" title="Date de sauvegarde">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
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
        {job.salary_warning && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DollarSign className="w-3 h-3" />
            Salaire non précisé
          </span>
        )}
        {job.is_agency && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            Cabinet
          </span>
        )}
      </div>

      {/* spacer to push notes and footer down */}
      <div className="flex-grow"></div>

      {/* Notes Section */}
      <div className="mt-4 bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
        {isEditingNotes ? (
          <div className="p-3">
            <textarea
              autoFocus
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes sur cette offre..."
              className="w-full h-24 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-700/50">
              <button 
                onClick={cancelEdit}
                className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
                disabled={isSavingNotes}
              >
                <X className="w-4 h-4" />
              </button>
              <button 
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="p-1.5 bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-md transition-colors"
              >
                {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="p-3 cursor-pointer group"
            onClick={() => setIsEditingNotes(true)}
          >
            <div className="flex justify-between items-start gap-2">
              <p className={`text-sm ${currentNotes ? "text-slate-300 whitespace-pre-wrap" : "text-slate-500 italic"}`}>
                {currentNotes || "Ajouter une note..."}
              </p>
              <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
        <a 
          href={job.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Voir l&apos;offre
        </a>
      </div>
    </motion.div>
  )
}
