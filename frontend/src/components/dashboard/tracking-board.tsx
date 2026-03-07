"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MoreVertical, 
  MapPin, 
  Building2, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  XCircle,
  GripHorizontal
} from "lucide-react"
import type { ApplicationV2, TrackingStatus } from "@/lib/api"
import { updateTrackingStatus } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface TrackingBoardProps {
  applications: ApplicationV2[]
  onUpdate: () => void
}

const COLUMNS: { id: TrackingStatus, label: string, color: string, icon: any }[] = [
  { id: 'SAVED', label: 'À postuler', color: 'slate', icon: Clock },
  { id: 'APPLIED', label: 'Envoyée', color: 'indigo', icon: CheckCircle2 },
  { id: 'INTERVIEW_SCHEDULED', label: 'Entretien Prévu', color: 'emerald', icon: CalendarDays },
  { id: 'REJECTED', label: 'Refusée', color: 'red', icon: XCircle },
]

export function TrackingBoard({ applications, onUpdate }: TrackingBoardProps) {
  const { showToast } = useToast()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleStatusChange = async (appId: string, newStatus: TrackingStatus) => {
    try {
      setUpdatingId(appId)
      await updateTrackingStatus(appId, newStatus)
      showToast("Statut mis à jour avec succès", "success")
      onUpdate() // Refresh list
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inattendue"
      showToast(message, "error")
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusColor = (status: TrackingStatus | undefined) => {
    switch (status) {
      case 'SAVED': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      case 'APPLIED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      case 'INTERVIEW_SCHEDULED': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'INTERVIEWED': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'OFFER_RECEIVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'ACCEPTED': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'WITHDRAWN': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  // Group by status
  const groupedApps = COLUMNS.reduce((acc, col) => {
    acc[col.id] = applications.filter(app => {
      // Default to SAVED if no status, unless it's completed, then APPLIED. But we will just use tracking_status if it exists
      const st = app.tracking_status || (app.status === 'completed' ? 'APPLIED' : 'SAVED')
      return st === col.id || (col.id === 'REJECTED' && ['REJECTED', 'WITHDRAWN'].includes(st)) || (col.id === 'INTERVIEW_SCHEDULED' && ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED'].includes(st))
    })
    return acc
  }, {} as Record<string, ApplicationV2[]>)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <div key={column.id} className="flex flex-col min-w-[300px]">
          {/* Column Header */}
          <div className={`flex items-center justify-between p-3 mb-4 rounded-xl border bg-${column.color}-500/10 border-${column.color}-500/20`}>
            <div className="flex items-center gap-2">
              <column.icon className={`w-4 h-4 text-${column.color}-400`} />
              <h3 className={`font-semibold text-${column.color}-400`}>{column.label}</h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-${column.color}-500/20 text-${column.color}-300`}>
              {groupedApps[column.id]?.length || 0}
            </span>
          </div>

          {/* Cards Container */}
          <div className="flex flex-col gap-3 min-h-[200px] p-2 rounded-xl bg-slate-800/20 border border-slate-800/50">
            <AnimatePresence>
              {groupedApps[column.id]?.map((app) => (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative p-4 rounded-xl bg-slate-800 border ${updatingId === app.id ? 'opacity-50 pointer-events-none' : ''} border-slate-700/50 hover:border-indigo-500/30 transition-all group`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-white text-sm line-clamp-2 pr-6">
                      {app.final_choice?.title || app.job_title}
                    </h4>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                        {COLUMNS.map(c => (
                          <DropdownMenuItem 
                            key={c.id}
                            onClick={() => handleStatusChange(app.id, c.id)}
                            className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                          >
                            Déplacer vers {c.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate">{app.final_choice?.company || "Entreprise inconnue"}</span>
                    </div>
                    {app.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{app.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-700/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                      {new Date(app.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(app.tracking_status || (app.status === 'completed' ? 'APPLIED' : 'SAVED'))}`}>
                      {app.status === 'completed' && !app.tracking_status ? 'Générée' : 'En cours'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {groupedApps[column.id]?.length === 0 && (
              <div className="flex flex-col items-center justify-center p-6 text-center h-full text-slate-500">
                <GripHorizontal className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-sm">Glisser ici<br/>(Bientôt disponible)</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
