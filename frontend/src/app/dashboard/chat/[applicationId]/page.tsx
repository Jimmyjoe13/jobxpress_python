"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageSquare,
  Sparkles,
  AlertCircle,
  User
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

interface ChatSession {
  session_id: string
  application_id: string
  messages: ChatMessage[]
  remaining_messages: number
  status: string
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

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.applicationId as string
  
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingMessages, setRemainingMessages] = useState(10)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchSession = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        setError("Non authentifié")
        setIsLoading(false)
        return
      }

      const res = await fetch(
        `${API_URL}/api/v2/chat/session/${applicationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.ok) {
        const data: ChatSession = await res.json()
        setSession(data)
        setMessages(data.messages)
        setRemainingMessages(data.remaining_messages)
      } else if (res.status === 404) {
        setError("Session non trouvée. Acceptez d'abord l'offre JobyJoba depuis vos notifications.")
      } else {
        const data = await res.json()
        setError(data.detail || "Erreur lors du chargement")
      }
    } catch (err) {
      setError("Erreur de connexion au serveur")
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const sendMessage = async () => {
    if (!inputValue.trim() || isSending || remainingMessages <= 0) return

    const userMessage = inputValue.trim()
    setInputValue("")
    setIsSending(true)
    setError(null)

    // Ajouter immédiatement le message utilisateur
    const tempUserMsg: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const token = await getAuthToken()
      if (!token) throw new Error("Non authentifié")

      const res = await fetch(`${API_URL}/api/v2/chat/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage,
          application_id: applicationId
        })
      })

      if (res.ok) {
        const data = await res.json()
        
        // Ajouter la réponse de l'assistant
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, assistantMsg])
        setRemainingMessages(data.remaining_messages)
      } else {
        const data = await res.json()
        setError(data.detail || "Erreur lors de l'envoi")
        // Retirer le message utilisateur en cas d'erreur
        setMessages(prev => prev.slice(0, -1))
      }
    } catch (err) {
      setError("Erreur de connexion")
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Session non disponible</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl"
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">JobyJoba</h1>
              <p className="text-xs text-slate-400">Ton coach emploi IA</p>
            </div>
          </div>
        </div>
        
        {/* Remaining messages */}
        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
          remainingMessages <= 2 
            ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
        }`}>
          {remainingMessages} message{remainingMessages !== 1 ? 's' : ''} restant{remainingMessages !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-500' 
                      : 'bg-gradient-to-br from-purple-500 to-indigo-500'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-tr-sm'
                      : 'bg-slate-700 text-slate-100 rounded-tl-sm'
                  }`}>
                    <div 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Typing indicator */}
          {isSending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-slate-700 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700/50">
          {remainingMessages > 0 ? (
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pose ta question à JobyJoba..."
                disabled={isSending}
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={isSending || !inputValue.trim()}
                className="px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 mb-3">
                🎉 Tu as utilisé tous tes messages ! Cette session est terminée.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl"
              >
                Retour au dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
