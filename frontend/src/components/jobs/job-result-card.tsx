"use client"

import { motion } from "framer-motion"
import { 
  MapPin, 
  Building2, 
  Globe, 
  AlertTriangle, 
  DollarSign,
  ExternalLink,
  Check
} from "lucide-react"
import { JobResultItem } from "@/lib/api"

interface JobResultCardProps {
  job: JobResultItem
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}

export function JobResultCard({ 
  job, 
  selected, 
  onToggle, 
  disabled = false 
}: JobResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      onClick={() => !disabled && onToggle()}
      className={`
        relative p-4 rounded-xl border transition-all cursor-pointer
        ${selected 
          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10" 
          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {/* Checkbox indicator */}
      <div className={`
        absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
        ${selected 
          ? "bg-indigo-500 border-indigo-500" 
          : "border-slate-600 bg-slate-800"
        }
      `}>
        {selected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Header */}
      <div className="pr-10">
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

      {/* External link */}
      <a 
        href={job.url} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mt-3 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Voir l&apos;offre
      </a>
    </motion.div>
  )
}

// Version skeleton pour le loading
export function JobResultCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 animate-pulse">
      <div className="h-6 bg-slate-700 rounded w-3/4 mb-2" />
      <div className="h-4 bg-slate-700/50 rounded w-1/2 mb-3" />
      <div className="flex gap-2">
        <div className="h-6 bg-slate-700/50 rounded w-16" />
        <div className="h-6 bg-slate-700/50 rounded w-20" />
      </div>
    </div>
  )
}
