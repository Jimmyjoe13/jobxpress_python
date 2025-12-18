"use client"

import { FileText, Download, Trash2, Upload, CheckCircle, Clock, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import { FileUpload } from "@/components/ui/file-upload"
import { Button } from "@/components/ui/button"

interface CVSectionProps {
  cvUrl: string | null
  cvUploadedAt: string | null
  isUploading: boolean
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
}

export function CVSection({
  cvUrl,
  cvUploadedAt,
  isUploading,
  onUpload,
  onRemove
}: CVSectionProps) {
  // Formater la date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateStr))
    } catch {
      return null
    }
  }

  // Extraire le nom du fichier de l'URL
  const getFileName = (url: string | null) => {
    if (!url) return "CV"
    const parts = url.split('/')
    const fullName = parts[parts.length - 1]
    // Enlever le UUID du début si présent
    const cleanName = fullName.replace(/^[a-f0-9-]{36}_/, '')
    return decodeURIComponent(cleanName) || "CV.pdf"
  }

  const handleFileSelect = async (file: File) => {
    await onUpload(file)
  }

  return (
    <div className="space-y-6">
      {/* CV Actuel */}
      {cvUrl ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {/* Card CV existant */}
          <div className="flex-1 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {getFileName(cvUrl)}
                </p>
                {cvUploadedAt && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Uploadé le {formatDate(cvUploadedAt)}</span>
                  </div>
                )}
                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir
                  </a>
                  <a
                    href={cvUrl}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>
                  <button
                    onClick={onRemove}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Remplacer */}
          <div className="sm:w-64">
            <p className="text-sm text-slate-400 mb-2">Remplacer le CV</p>
            <FileUpload
              onFileSelect={handleFileSelect}
              label="Nouveau CV"
              accept=".pdf,.doc,.docx"
            />
          </div>
        </motion.div>
      ) : (
        /* Pas de CV */
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FileUpload
            onFileSelect={handleFileSelect}
            label="Déposez votre CV ici"
            accept=".pdf,.doc,.docx"
          />
          <p className="text-sm text-slate-500 mt-3 text-center">
            Ce CV sera utilisé par défaut pour vos futures candidatures
          </p>
        </motion.div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400">
          <p>
            <strong className="text-slate-300">Conseil :</strong> Utilisez un CV au format PDF pour une meilleure compatibilité.
            Notre IA analysera le contenu de votre CV pour générer des lettres de motivation personnalisées.
          </p>
        </div>
      </div>
    </div>
  )
}
