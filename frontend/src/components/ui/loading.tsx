"use client"

import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-10 h-10"
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizes[size]} text-indigo-500 animate-spin`} />
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  )
}

// Typing dots animation
export function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  )
}

// Pulsing indicator
export function PulsingDot({ color = "indigo" }: { color?: "indigo" | "emerald" | "red" }) {
  const colors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500"
  }

  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[color]} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[color]}`} />
    </span>
  )
}

// Progress bar
interface ProgressBarProps {
  progress: number
  showLabel?: boolean
}

export function ProgressBar({ progress, showLabel = false }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-right text-xs text-slate-500 mt-1">{Math.round(progress)}%</p>
      )}
    </div>
  )
}
