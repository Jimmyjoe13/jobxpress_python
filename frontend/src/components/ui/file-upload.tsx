"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"
import { Upload, File, X } from "lucide-react"

export interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: Record<string, string[]>
  maxSize?: number
  className?: string
  label?: string
  error?: string
  currentFile?: File | null
  onFileRemove?: () => void
}

export function FileUpload({
  onFileSelect,
  accept = {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  label = "Déposez votre CV ici",
  error,
  currentFile,
  onFileRemove,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
      setIsDragging(false)
    },
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept,
    maxSize,
    multiple: false,
  })

  return (
    <div className={cn("w-full", className)}>
      {currentFile ? (
        <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <File className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">{currentFile.name}</p>
              <p className="text-sm text-gray-500">
                {(currentFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {onFileRemove && (
            <button
              type="button"
              onClick={onFileRemove}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all",
            isDragActive || isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50",
            error && "border-red-500 bg-red-50"
          )}
        >
          <input {...getInputProps()} />
          <Upload
            className={cn(
              "w-12 h-12 mb-4",
              isDragActive || isDragging ? "text-blue-600" : "text-gray-400"
            )}
          />
          <p className="text-lg font-medium text-gray-700 mb-1">{label}</p>
          <p className="text-sm text-gray-500">
            ou cliquez pour sélectionner un fichier
          </p>
          <p className="text-xs text-gray-400 mt-2">
            PDF, DOC, DOCX (max. 10 MB)
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
