"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Inbox, 
  Search, 
  MessageSquare, 
  ChevronRight, 
  Calendar, 
  Building2, 
  Sparkles,
  ExternalLink,
  ClipboardCheck,
  Target,
  AlertCircle
} from "lucide-react"
import { getApplicationsV2, type ApplicationV2 } from "@/lib/api"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function InboxPage() {
  const [applications, setApplications] = useState<ApplicationV2[]>([])
  const [selectedApp, setSelectedApp] = useState<ApplicationV2 | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        const apps = await getApplicationsV2(50)
        // On ne garde que les candidatures terminées (qui ont un dossier IA)
        const completedApps = apps.filter(app => app.status === "COMPLETED")
        setApplications(completedApps)
        if (completedApps.length > 0) {
          setSelectedApp(completedApps[0])
        }
      } catch (err) {
        console.error("Erreur chargement Inbox:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredApps = applications.filter(app => 
    app.final_choice?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Inbox className="w-8 h-8 text-indigo-400" />
            Inbox IA
          </h1>
          <p className="text-slate-400 mt-1">Vos dossiers de préparation personnalisés par notre intelligence artificielle.</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden border border-slate-800 rounded-2xl bg-slate-900/50 backdrop-blur-sm">
        {/* Sidebar Liste */}
        <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-900/40">
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Filtrer par entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredApps.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-500">Aucun dossier trouvé.</p>
              </div>
            ) : (
              filteredApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full text-left p-4 border-b border-slate-800/50 transition-all hover:bg-slate-800/30 ${
                    selectedApp?.id === app.id ? "bg-indigo-500/10 border-l-4 border-l-indigo-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-white truncate pr-2">
                      {app.final_choice?.company || "Entreprise"}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap mt-1">
                      {format(new Date(app.created_at), "dd MMM", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-2">{app.job_title}</p>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Score: {app.final_choice?.match_score}%
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Content View */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden bg-slate-900/20">
          <AnimatePresence mode="wait">
            {selectedApp ? (
              <motion.div 
                key={selectedApp.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Header Dossier */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white leading-tight">
                        {selectedApp.final_choice?.company}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-indigo-400" />
                          {selectedApp.job_title}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Généré le {format(new Date(selectedApp.created_at), "PPP", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {selectedApp.final_choice?.url && (
                      <a 
                        href={selectedApp.final_choice.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all border border-slate-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Lien Offre
                      </a>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-600/20">
                      <Sparkles className="w-4 h-4" />
                      Actions
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="max-w-3xl mx-auto space-y-8">
                    {/* Badge Info */}
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-4">
                      <div className="mt-1">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-indigo-300">Dossier de préparation stratégique</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Ce dossier a été généré sur-mesure par GPT-5 Pro en analysant votre CV et les prérequis spécifiques de cette offre. Utilisez-le pour préparer vos entretiens et adapter votre discours.
                        </p>
                      </div>
                    </div>

                    {/* Contenu HTML injecté (Dossier IA) */}
                    <div 
                      className="prose prose-invert prose-indigo max-w-none 
                        prose-h3:text-indigo-400 prose-h3:text-lg prose-h3:font-bold prose-h3:mb-3 prose-h3:mt-8
                        prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                        prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-2
                        prose-li:text-slate-300
                      "
                      dangerouslySetInnerHTML={{ __html: selectedApp.cover_letter_html || "<p>Aucun contenu généré.</p>" }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 p-12 text-center">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">Sélectionnez un dossier</h3>
                <p className="max-w-xs mx-auto">
                  Choisissez une entreprise dans la liste de gauche pour consulter vos conseils stratégiques.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Fallback if something is selected */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 bg-slate-900">
           {selectedApp ? (
             <div className="space-y-6">
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="text-indigo-400 text-sm flex items-center gap-1 mb-4"
                >
                  ← Retour à la liste
                </button>
                <h2 className="text-2xl font-bold text-white">{selectedApp.final_choice?.company}</h2>
                <div 
                  className="prose prose-invert text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedApp.cover_letter_html || "" }}
                />
             </div>
           ) : (
             <div className="text-center py-12">
               <p className="text-slate-500">Sélectionnez une candidature pour voir les détails.</p>
             </div>
           )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  )
}
