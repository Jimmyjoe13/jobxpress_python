"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type, duration }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      case "info":
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-emerald-500/10"
      case "error":
        return "border-red-500/30 bg-red-500/10"
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/10"
      case "info":
        return "border-blue-500/30 bg-blue-500/10"
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl
              shadow-xl animate-slide-in-right min-w-[300px] max-w-[400px]
              ${getStyles(toast.type)}
            `}
            style={{
              animation: "toast-enter 0.3s ease-out forwards",
            }}
          >
            {getIcon(toast.type)}
            <p className="flex-1 text-sm text-white">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
