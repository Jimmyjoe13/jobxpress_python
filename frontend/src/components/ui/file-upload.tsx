"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, X, CheckCircle } from "lucide-react"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  currentFile?: File | null
  label?: string
  accept?: string
  maxSize?: number
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  currentFile,
  label = "Déposez votre CV ici",
  accept = ".pdf,.doc,.docx",
  maxSize = 10 * 1024 * 1024, // 10MB
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null)

      if (rejectedFiles.length > 0) {
        setError("Fichier non valide. Utilisez PDF, DOC ou DOCX (max 10MB)")
        return
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize,
    multiple: false,
  })

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setError(null)
    onFileRemove?.()
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
          ${isDragActive 
            ? "border-indigo-500 bg-indigo-500/10" 
            : currentFile 
              ? "border-emerald-500/50 bg-emerald-500/5" 
              : "border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50"
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center text-center">
          {currentFile ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-white font-medium truncate max-w-[200px]">
                  {currentFile.name}
                </span>
              </div>
              <span className="text-sm text-slate-500 mb-4">
                {formatSize(currentFile.size)}
              </span>
              <button
                onClick={handleRemove}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Supprimer
              </button>
            </>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                isDragActive 
                  ? "bg-indigo-500/20 scale-110" 
                  : "bg-slate-800"
              }`}>
                <Upload className={`w-8 h-8 ${isDragActive ? "text-indigo-400" : "text-slate-500"}`} />
              </div>
              <p className="text-white font-medium mb-1">{label}</p>
              <p className="text-sm text-slate-500 mb-4">
                ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-slate-600">
                PDF, DOC, DOCX • Max 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
