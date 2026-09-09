"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core'
import { 
  MoreVertical, 
  MapPin, 
  Building2, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  XCircle,
  GripHorizontal,
  Sparkles,
  Loader2,
  Trash2,
  Target,
  FileText,
  Search,
  Filter,
  RotateCcw
} from "lucide-react"
import type { ApplicationV2, TrackingStatus } from "@/lib/api"
import { updateTrackingStatus, deleteApplicationTracker } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TailoringModal } from "@/components/jobs/TailoringModal"

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

/* Mapping statique des couleurs de colonne → classes Tailwind complètes */
const COLUMN_STYLES: Record<string, { border: string; text: string; iconText: string }> = {
  slate: {
    border: 'hover:border-slate-500/30',
    text: 'text-slate-300',
    iconText: 'group-hover:text-slate-400',
  },
  indigo: {
    border: 'hover:border-indigo-500/30',
    text: 'text-slate-300',
    iconText: 'group-hover:text-indigo-400',
  },
  emerald: {
    border: 'hover:border-emerald-500/30',
    text: 'text-slate-300',
    iconText: 'group-hover:text-emerald-400',
  },
  red: {
    border: 'hover:border-red-500/30',
    text: 'text-slate-300',
    iconText: 'group-hover:text-red-400',
  },
}

/* Mapping des couleurs pour les items du dropdown */
const DROPDOWN_ICON_COLORS: Record<string, string> = {
  slate: 'text-slate-400',
  indigo: 'text-indigo-400',
  emerald: 'text-emerald-400',
  red: 'text-red-400',
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

// -------------------------------------------------------------
// Composant Droppable (Colonne)
// -------------------------------------------------------------
function DroppableColumn({ 
  column, 
  children, 
  count 
}: { 
  column: typeof COLUMNS[0], 
  children: React.ReactNode,
  count: number 
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col min-w-[300px]">
      {/* Column Header */}
      <div className={`group flex items-center justify-between p-3 mb-4 rounded-xl border bg-card/50 border-border transition-colors ${COLUMN_STYLES[column.color]?.border || ''}`}>
        <div className="flex items-center gap-2">
          <column.icon className={`w-4 h-4 text-muted-foreground transition-colors ${COLUMN_STYLES[column.color]?.iconText || ''}`} />
          <h3 className={`font-semibold ${COLUMN_STYLES[column.color]?.text || ''} group-hover:text-foreground transition-colors`}>{column.label}</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
          {count}
        </span>
      </div>

      {/* Cards Container (Droppable Zone) */}
      <div 
        ref={setNodeRef}
        className={`flex flex-col gap-3 min-h-[300px] p-2 rounded-2xl border transition-all duration-150 ${
          isOver 
            ? 'ring-2 ring-indigo-500/50 bg-indigo-500/5 border-indigo-500/50' 
            : 'bg-slate-950/20 border-white/5'
        }`}
      >
        <AnimatePresence>
          {children}
        </AnimatePresence>
        
        {count === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center h-[200px] text-slate-600 border border-dashed border-white/5 rounded-2xl pointer-events-none">
            <GripHorizontal className="w-10 h-10 mb-2 opacity-5" />
            <span className="text-xs font-medium italic opacity-40">Vide</span>
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Composant Draggable (Carte) avec wrapper Drag
// -------------------------------------------------------------
function DraggableCard({ 
  app, 
  column,
  updatingId, 
  handleStatusChange,
  onDeleteClick,
  onOpenTailoring
}: { 
  app: ApplicationV2, 
  column: typeof COLUMNS[0],
  updatingId: string | null,
  handleStatusChange: (id: string, st: TrackingStatus) => void,
  onDeleteClick: () => void,
  onOpenTailoring: (tab: "ats" | "cv" | "job") => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
    data: app
  })

  const atsScore = app.final_choice?.ats_analysis?.match_score ?? app.final_choice?.score
  const hasTailoredCV = !!app.final_choice?.tailored_cv
  const isReadyToApply = Boolean(atsScore && atsScore >= 60 && hasTailoredCV)

  return (
    <div 
      ref={setNodeRef} 
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="relative touch-none"
      {...attributes} 
      {...listeners}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className={`relative p-5 rounded-2xl bg-slate-900/80 border ${updatingId === app.id ? 'border-indigo-500/50' : 'border-white/5'} hover:border-indigo-500/30 transition-all group overflow-hidden`}
      >
        {/* Poignée visible sur mobile/touch en haut à gauche */}
        <div className="absolute top-2.5 left-2.5 opacity-30 md:opacity-0 group-hover:md:opacity-30 transition-opacity">
          <GripHorizontal className="w-5 h-5 text-slate-500" />
        </div>

        {updatingId === app.id && (
            <div className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
        )}

        <div className="flex justify-between items-start mb-3 pl-4 md:pl-0">
          <h4 
            onClick={() => onOpenTailoring('ats')}
            className="font-bold text-white text-sm line-clamp-2 pr-6 leading-snug cursor-pointer hover:text-indigo-400 transition-colors"
            title="Ouvrir la préparation candidature"
          >
            {app.final_choice?.title || app.job_title}
          </h4>
          
          <div 
            className="absolute top-4 right-4" 
            onPointerDown={(e) => e.stopPropagation()} // Évite de déclencher le drag en voulant ouvrir le menu
          >
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 bg-slate-900 border-white/10 p-2 rounded-xl">
                <div className="px-3 py-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Outils Candidature</div>
                <DropdownMenuItem
                  onClick={() => onOpenTailoring('ats')}
                  className="text-slate-300 hover:text-white hover:bg-indigo-500/10 cursor-pointer flex items-center gap-3 rounded-lg mb-1"
                >
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  Diagnostic ATS (1 crédit)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onOpenTailoring('cv')}
                  className="text-slate-300 hover:text-white hover:bg-indigo-500/10 cursor-pointer flex items-center gap-3 rounded-lg mb-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  CV Adapté Sur-Mesure (5 cr.)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onOpenTailoring('job')}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center gap-3 rounded-lg mb-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Détails de l'offre
                </DropdownMenuItem>

                <div className="h-px bg-white/10 my-1 mx-2" />
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Changer le statut</div>
                {COLUMNS.map(c => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => handleStatusChange(app.id, c.id)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer flex items-center gap-3 rounded-lg mb-1 last:mb-0"
                  >
                    <c.icon className={`w-3.5 h-3.5 ${DROPDOWN_ICON_COLORS[c.color] || 'text-muted-foreground'}`} />
                    {c.label}
                  </DropdownMenuItem>
                ))}
                <div className="h-px bg-white/10 my-1 mx-2" />
                <DropdownMenuItem 
                  onClick={() => onDeleteClick()}
                  className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer flex items-center gap-3 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-2 mb-4 pl-4 md:pl-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[180px]">{app.final_choice?.company || "Calculé via IA..."}</span>
          </div>
          {app.location && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{app.location}</span>
            </div>
          )}

          {/* Quick Tailoring & ATS Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            {atsScore ? (
              <button
                onClick={() => onOpenTailoring('ats')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                title="Voir le diagnostic ATS"
              >
                <Target className="w-3 h-3" />
                <span>ATS {atsScore}%</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenTailoring('ats')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 hover:text-white transition-colors"
                title="Lancer le diagnostic ATS (1 crédit)"
              >
                <Target className="w-3 h-3 text-indigo-400" />
                <span>ATS (1 cr.)</span>
              </button>
            )}

            {hasTailoredCV ? (
              <button
                onClick={() => onOpenTailoring('cv')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                title="Voir le CV adapté"
              >
                <Sparkles className="w-3 h-3" />
                <span>CV Prêt</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenTailoring('cv')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 hover:text-white transition-colors"
                title="Générer un CV adapté sur-mesure (5 crédits)"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>CV (5 cr.)</span>
              </button>
            )}
          </div>
          
          {/* Action Link (Lien vers l'offre) */}
          {(app.final_choice?.url || (app as any).url) && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <a 
                href={app.final_choice?.url || (app as any).url}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider group"
              >
                Voir l&apos;offre originale
                <Sparkles className="w-3 h-3 group-hover:animate-pulse" />
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
              isReadyToApply
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border-white/5"
            }`}>
              {isReadyToApply ? "✓ Prêt à postuler" : "En préparation"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {new Date(app.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-widest ${getStatusColor(app.tracking_status || (app.status === 'completed' ? 'APPLIED' : 'SAVED'))}`}>
            {app.tracking_status ? column.label : 'IA Généré'}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

// -------------------------------------------------------------
// Composant DragOverlay pour la carte fantôme
// -------------------------------------------------------------
function CardPreview({ app, column }: { app: ApplicationV2, column: typeof COLUMNS[0] }) {
  // Une simple div stylisée comme la carte originale, sans interactions (ni framer-motion, ni dropdown actif)
  return (
    <div className="relative p-5 rounded-2xl bg-slate-900 border border-indigo-500 shadow-2xl shadow-black/50 overflow-hidden w-full cursor-grabbing transform scale-105 opacity-90 rotate-2">
      <div className="flex justify-between items-start mb-3 pl-4 md:pl-0">
        <h4 className="font-bold text-white text-sm line-clamp-2 pr-6 leading-snug">
          {app.final_choice?.title || app.job_title}
        </h4>
        <MoreVertical className="w-4 h-4 text-slate-600 mt-2" />
      </div>

      <div className="space-y-2 mb-4 pl-4 md:pl-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate max-w-[180px]">{app.final_choice?.company || "Calculé via IA..."}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold tracking-wider">
            <Clock className="w-3 h-3" />
            {new Date(app.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border uppercase tracking-widest ${getStatusColor(app.tracking_status || (app.status === 'completed' ? 'APPLIED' : 'SAVED'))}`}>
          {column.label}
        </span>
      </div>
    </div>
  )
}


// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
export function TrackingBoard({ applications, onUpdate }: TrackingBoardProps) {
  const { showToast } = useToast()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showCelebrate, setShowCelebrate] = useState(false)
  const [localApps, setLocalApps] = useState<ApplicationV2[]>(applications)
  const [activeApp, setActiveApp] = useState<ApplicationV2 | null>(null)

  const [appToDelete, setAppToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [selectedTailoringApp, setSelectedTailoringApp] = useState<ApplicationV2 | null>(null)
  const [tailoringTab, setTailoringTab] = useState<"ats" | "cv" | "job">("ats")

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [scoreFilter, setScoreFilter] = useState<"all" | "high" | "medium" | "none">("all")
  const [cvFilter, setCvFilter] = useState<"all" | "ready" | "pending">("all")

  // Sensors configuration (Desktop: distance 8px / Mobile: long press 250ms)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  // Sync state when props change, ONLY if we are not currently updating
  useEffect(() => {
    if (!updatingId) {
      setLocalApps(applications)
    }
  }, [applications, updatingId])

  const handleStatusChange = async (appId: string, newStatus: TrackingStatus) => {
    try {
      setUpdatingId(appId)
      await updateTrackingStatus(appId, newStatus)
      
      // Celebrate if it's a positive move
      if (['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED'].includes(newStatus)) {
        setShowCelebrate(true)
        setTimeout(() => setShowCelebrate(false), 2000)
      }
      
      showToast("Statut mis à jour avec succès", "success")
      onUpdate() // Refresh list
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inattendue"
      showToast(message, "error")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async () => {
    if (!appToDelete) return
    setIsDeleting(true)
    try {
      await deleteApplicationTracker(appToDelete)
      showToast("Candidature supprimée de votre suivi", "success")
      setLocalApps(prev => prev.filter(app => app.id !== appToDelete))
      onUpdate()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de supprimer la carte."
      showToast(message, "error")
    } finally {
      setIsDeleting(false)
      setAppToDelete(null)
    }
  }

  // --- DND HANDLERS ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const found = localApps.find(app => app.id === active.id)
    if (found) setActiveApp(found)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveApp(null)
    const { active, over } = event
    
    // Annuler si pas déposé ou si déposé dans la même colonne (car tri pas nécessaire)
    if (!over) return

    const newStatus = over.id as TrackingStatus
    const appId = active.id as string

    // Ignorer si pas de changement de colonne 
    // (Pour connaître son statut actuel, on le recherche dans nos localApps)
    const appData = localApps.find(a => a.id === appId)
    if (!appData) return
    const currentStatus = appData.tracking_status || (appData.status === 'completed' ? 'APPLIED' : 'SAVED')
    
    // Attention: certains statuts sont groupés dans INTERVIEW_SCHEDULED ou REJECTED
    // Si la colonne cible est là où l'app se trouve déjà logiquement, on ne fait rien.
    const getVirtualColumn = (st: string) => {
      if (['REJECTED', 'WITHDRAWN'].includes(st)) return 'REJECTED'
      if (['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED'].includes(st)) return 'INTERVIEW_SCHEDULED'
      if (st === 'APPLIED') return 'APPLIED'
      return 'SAVED'
    }

    if (getVirtualColumn(currentStatus) === newStatus) return

    // 1. Optimistic Update : Met à jour PENDANT que l'API est appelée
    setLocalApps(prev => prev.map(app => 
      app.id === appId 
        ? { ...app, tracking_status: newStatus } 
        : app
    ))

    // 2. Appel API réel
    try {
      setUpdatingId(appId)
      await updateTrackingStatus(appId, newStatus)

      // Célébrer si positif
      if (['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED'].includes(newStatus)) {
        setShowCelebrate(true)
        setTimeout(() => setShowCelebrate(false), 2000)
      }
      onUpdate() // Synchro propre base de données
    } catch (err) {
      // Rollback
      setLocalApps(applications)
      showToast("Erreur lors du déplacement", "error")
    } finally {
      setUpdatingId(null)
    }
  }

  // Filtered applications based on search query, score, and cv status
  const filteredApps = localApps.filter(app => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const title = (app.final_choice?.title || app.job_title || "").toLowerCase()
      const company = (app.final_choice?.company || "").toLowerCase()
      const loc = (app.location || "").toLowerCase()
      if (!title.includes(q) && !company.includes(q) && !loc.includes(q)) {
        return false
      }
    }

    const score = app.final_choice?.ats_analysis?.match_score ?? app.final_choice?.score
    if (scoreFilter === "high" && (score === undefined || score < 80)) return false
    if (scoreFilter === "medium" && (score === undefined || score < 60 || score >= 80)) return false
    if (scoreFilter === "none" && score !== undefined && score !== null && score > 0) return false

    const hasCV = !!app.final_choice?.tailored_cv
    if (cvFilter === "ready" && !hasCV) return false
    if (cvFilter === "pending" && hasCV) return false

    return true
  })

  const hasActiveFilters = searchQuery.trim() !== "" || scoreFilter !== "all" || cvFilter !== "all"

  const handleResetFilters = () => {
    setSearchQuery("")
    setScoreFilter("all")
    setCvFilter("all")
  }

  // Group filtered applications by status locally
  const groupedApps = COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredApps.filter(app => {
      const st = app.tracking_status || (app.status === 'completed' ? 'APPLIED' : 'SAVED')
      return st === col.id || (col.id === 'REJECTED' && ['REJECTED', 'WITHDRAWN'].includes(st)) || (col.id === 'INTERVIEW_SCHEDULED' && ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED'].includes(st))
    })
    return acc
  }, {} as Record<string, ApplicationV2[]>)

  // Trouver la colonne source pour le DragOverlay
  const activeColumn = activeApp ? COLUMNS.find(c => {
      const st = activeApp.tracking_status || (activeApp.status === 'completed' ? 'APPLIED' : 'SAVED')
      return st === c.id || (c.id === 'REJECTED' && ['REJECTED', 'WITHDRAWN'].includes(st)) || (c.id === 'INTERVIEW_SCHEDULED' && ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED'].includes(st))
  }) : null


  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="relative">
        {/* Celebration Overlay */}
        <AnimatePresence>
          {showCelebrate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="flex flex-col items-center">
                 <Sparkles className="w-24 h-24 text-yellow-400 animate-pulse" />
                 <motion.span 
                   animate={{ y: [0, -20, 0] }}
                   className="text-white font-bold text-3xl mt-4 drop-shadow-lg"
                 >
                   BRAVO ! 🎉
                 </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── KANBAN SEARCH & FILTER TOOLBAR ─── */}
        <div className="mb-5 p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par intitulé, entreprise, lieu..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                title="Effacer"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* ATS Score Filter */}
            <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase">ATS</span>
              <button
                onClick={() => setScoreFilter("all")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  scoreFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setScoreFilter("high")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  scoreFilter === "high" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Score ATS supérieur ou égal à 80%"
              >
                ≥ 80%
              </button>
              <button
                onClick={() => setScoreFilter("medium")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  scoreFilter === "medium" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Score ATS entre 60% et 79%"
              >
                60-79%
              </button>
              <button
                onClick={() => setScoreFilter("none")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  scoreFilter === "none" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Candidatures sans diagnostic ATS"
              >
                À faire
              </button>
            </div>

            {/* CV Tailoring Filter */}
            <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase">CV</span>
              <button
                onClick={() => setCvFilter("all")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  cvFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setCvFilter("ready")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  cvFilter === "ready" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Avec CV adapté généré"
              >
                Adapté ✨
              </button>
              <button
                onClick={() => setCvFilter("pending")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  cvFilter === "pending" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Sans CV adapté"
              >
                Sans CV
              </button>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 transition-colors"
                title="Réinitialiser tous les filtres"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser</span>
              </button>
            )}

            <span className="text-[11px] text-slate-500 ml-auto hidden sm:inline font-medium">
              {filteredApps.length} / {localApps.length} opportunité{localApps.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Empty Search / Filter Notice */}
        {filteredApps.length === 0 && localApps.length > 0 && (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center mb-6">
            <Filter className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-white">Aucune candidature ne correspond à vos filtres</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Essayez d'ajuster votre recherche ou de réinitialiser les filtres.</p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Effacer les filtres
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <DroppableColumn 
              key={column.id} 
              column={column} 
              count={groupedApps[column.id]?.length || 0}
            >
              {groupedApps[column.id]?.map((app) => (
                <DraggableCard 
                  key={app.id} 
                  app={app} 
                  column={column} 
                  updatingId={updatingId}
                  handleStatusChange={handleStatusChange} 
                  onDeleteClick={() => setAppToDelete(app.id)}
                  onOpenTailoring={(tab) => {
                    setSelectedTailoringApp(app)
                    setTailoringTab(tab)
                  }}
                />
              ))}
            </DroppableColumn>
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeApp && activeColumn ? <CardPreview app={activeApp} column={activeColumn} /> : null}
      </DragOverlay>

      {/* Tailoring & ATS Modal */}
      <TailoringModal
        isOpen={!!selectedTailoringApp}
        onClose={() => setSelectedTailoringApp(null)}
        application={selectedTailoringApp}
        initialTab={tailoringTab}
        onSuccess={onUpdate}
      />

      <AnimatePresence>
        {appToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setAppToDelete(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
            >
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-2">
                  Supprimer la carte
                </h2>
                <p className="text-slate-400 mb-6 font-normal text-sm">
                  Voulez-vous vraiment supprimer cette carte ? Cette action est définitive.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setAppToDelete(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DndContext>
  )
}
