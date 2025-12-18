"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bell, 
  X, 
  Check, 
  ExternalLink, 
  Sparkles,
  MessageSquare,
  Loader2
} from "lucide-react"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Notification {
  id: string
  type: string
  title: string
  message?: string
  application_id?: string
  action_url?: string
  action_label?: string
  read: boolean
  created_at: string
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  } catch {
    return null
  }
}

export function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const res = await fetch(`${API_URL}/api/v2/notifications?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (err) {
      console.error("Error fetching notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    
    // Polling toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      await fetch(`${API_URL}/api/v2/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const acceptJobyJoba = async (notification: Notification) => {
    try {
      setAcceptingId(notification.id)
      const token = await getAuthToken()
      if (!token) return

      const res = await fetch(
        `${API_URL}/api/v2/notifications/${notification.id}/accept-jobyjoba`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (res.ok) {
        // Rediriger vers le chat
        if (notification.application_id) {
          window.location.href = `/dashboard/chat/${notification.application_id}`
        }
      } else {
        const data = await res.json()
        alert(data.detail || "Erreur lors de l'activation")
      }
    } catch (err) {
      console.error("Error accepting JobyJoba:", err)
    } finally {
      setAcceptingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes}min`
    if (hours < 24) return `Il y a ${hours}h`
    return `Il y a ${days}j`
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-indigo-500 rounded-full text-xs font-bold text-white flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white">Notifications</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune notification</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 transition-colors ${
                          notif.read ? 'bg-slate-800' : 'bg-slate-800/50 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            notif.type === 'offer_jobyjoba' 
                              ? 'bg-purple-500/20' 
                              : 'bg-emerald-500/20'
                          }`}>
                            {notif.type === 'offer_jobyjoba' ? (
                              <MessageSquare className="w-5 h-5 text-purple-400" />
                            ) : (
                              <Sparkles className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-white text-sm">
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <button
                                  onClick={() => markAsRead(notif.id)}
                                  className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
                                  title="Marquer comme lu"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-500">
                                {formatDate(notif.created_at)}
                              </span>
                              
                              {/* Action Button */}
                              {notif.type === 'offer_jobyjoba' && !notif.read ? (
                                <button
                                  onClick={() => acceptJobyJoba(notif)}
                                  disabled={acceptingId === notif.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                                >
                                  {acceptingId === notif.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                  {notif.action_label || "Débloquer"}
                                </button>
                              ) : notif.action_url ? (
                                <Link
                                  href={notif.action_url}
                                  onClick={() => {
                                    markAsRead(notif.id)
                                    setIsOpen(false)
                                  }}
                                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                  Voir
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
