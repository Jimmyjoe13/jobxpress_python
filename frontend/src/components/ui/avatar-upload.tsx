"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, X, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  firstName: string
  isUploading?: boolean
  onUpload: (file: File) => Promise<void>
  onRemove?: () => Promise<void>
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "w-20 h-20 text-2xl",
  md: "w-28 h-28 text-3xl",
  lg: "w-36 h-36 text-4xl"
}

const buttonSizeClasses = {
  sm: "p-1.5 -bottom-0.5 -right-0.5",
  md: "p-2 bottom-0 right-0",
  lg: "p-2.5 bottom-1 right-1"
}

export function AvatarUpload({
  currentAvatarUrl,
  firstName,
  isUploading = false,
  onUpload,
  onRemove,
  size = "md"
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    // Validation
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 5 MB")
      return
    }

    // Preview locale
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    await onUpload(file)
    setPreviewUrl(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const displayUrl = previewUrl || currentAvatarUrl
  const initial = firstName?.charAt(0)?.toUpperCase() || "U"

  return (
    <div className="flex flex-col items-center">
      {/* Avatar Container */}
      <div 
        className="relative group"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <motion.div 
          className={`
            ${sizeClasses[size]} 
            rounded-full 
            bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 
            flex items-center justify-center 
            font-bold text-white 
            overflow-hidden 
            shadow-lg shadow-indigo-500/30
            ring-4 ring-transparent
            transition-all duration-300
            ${isDragOver ? 'ring-indigo-500 scale-105' : 'group-hover:ring-indigo-500/50 group-hover:scale-[1.02]'}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"
              >
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </motion.div>
            ) : displayUrl ? (
              <motion.img 
                key="image"
                src={displayUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            ) : (
              <motion.span
                key="initial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {initial}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Upload Button */}
        <motion.button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`
            absolute ${buttonSizeClasses[size]}
            bg-indigo-600 rounded-full text-white 
            shadow-lg shadow-indigo-500/50
            hover:bg-indigo-700 hover:scale-110
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Camera className="w-4 h-4" />
        </motion.button>

        {/* Remove Button (si avatar existant) */}
        {currentAvatarUrl && onRemove && !isUploading && (
          <motion.button
            type="button"
            onClick={onRemove}
            className="absolute -top-1 -left-1 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-3 h-3" />
          </motion.button>
        )}

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Label */}
      <p className="text-sm text-slate-400 mt-3">
        {isDragOver ? "Déposez l'image ici" : "Cliquez ou glissez pour changer"}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        JPEG, PNG, WebP • Max 5MB
      </p>
    </div>
  )
}
