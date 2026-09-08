"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Link as LinkIcon, 
  FileText, 
  Sparkles, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { importExternalJob, type JobImportResponse } from "@/lib/api"
import { useToast } from "@/components/ui/toast"

interface ImportJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (imported: JobImportResponse) => void
}

export function ImportJobModal({ isOpen, onClose, onSuccess }: ImportJobModalProps) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<"url" | "text">("url")
  const [url, setUrl] = useState("")
  const [rawText, setRawText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (activeTab === "url" && !url.trim()) {
      setError("Veuillez saisir une URL d'offre valide.")
      return
    }

    if (activeTab === "text" && rawText.trim().length < 50) {
      setError("Le texte de l'annonce est trop court (minimum 50 caractères).")
      return
    }

    setIsLoading(true)

    try {
      const payload = activeTab === "url" ? { url: url.trim() } : { raw_text: rawText.trim() }
      const res = await importExternalJob(payload)

      showToast(`Offre importée : ${res.title} chez ${res.company}`, "success")
      onSuccess(res)
      handleClose()
    } catch (err: any) {
      console.error("Erreur import offre:", err)
      const msg = err.detail || err.message || "Échec de l'importation de l'offre."
      setError(msg)

      // Si erreur anti-robot, suggérer de basculer sur l'onglet texte
      if (activeTab === "url" && (msg.includes("bloque") || msg.includes("protégé") || msg.includes("connexion"))) {
        setActiveTab("text")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setUrl("")
    setRawText("")
    setError(null)
    setIsLoading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, type: "tween" }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Importer une offre
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  0 crédit
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ajoutez n&apos;importe quelle offre externe pour la suivre et préparer votre candidature.
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex p-1 bg-slate-800/80 rounded-xl my-5 border border-slate-700/50">
            <button
              type="button"
              onClick={() => { setActiveTab("url"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "url"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Lien de l&apos;offre (URL)
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("text"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "text"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Texte de l&apos;annonce
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleImport} className="space-y-4">
            {activeTab === "url" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 block">
                  Collez l&apos;URL de l&apos;offre d&apos;emploi :
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://www.linkedin.com/jobs/view/... ou Indeed, WTTJ..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-800/60 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all pr-10"
                    autoFocus
                  />
                  <ExternalLink className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Compatible avec LinkedIn, Welcome to the Jungle, Indeed, France Travail, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 block">
                  Collez le texte ou la description de l&apos;offre :
                </label>
                <textarea
                  rows={6}
                  placeholder="Copiez-collez ici le titre, l'entreprise, les missions et prérequis de l'annonce..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-800/60 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none transition-all resize-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500">
                  Idéal si l&apos;annonce est protégée derrière un login ou un captcha.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="text-slate-400 hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extraction IA en cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ajouter au Kanban (Gratuit)</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
