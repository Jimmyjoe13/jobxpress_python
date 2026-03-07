"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Loader2, Sparkles, User, Briefcase } from "lucide-react"
import { 
  GlobalChatMessage, 
  getProactiveMessage, 
  getGlobalSession, 
  sendGlobalChatMessage 
} from "@/lib/api"
import { cn } from "@/lib/utils"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<GlobalChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasInit, setHasInit] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Redirection automatique si une recherche est effectuée via le chat
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    
    // Vérifier si le message de l'assistant contient le signal de navigation
    const hasSearchAction = 
      lastMessage?.role === 'assistant' && 
      (lastMessage.content.includes('[ACTION:NAVIGATE_SEARCH]') || 
       lastMessage.tool_calls_executed?.some(t => t.result.includes('[ACTION:NAVIGATE_SEARCH]')))

    if (hasSearchAction) {
      const timer = setTimeout(() => {
        router.push('/dashboard/search')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [messages, router])

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen && !hasInit) {
      initChat()
    }
  }, [isOpen, hasInit])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const initChat = async () => {
    try {
      setIsLoading(true)
      const session = await getGlobalSession()
      
      if (session.messages && session.messages.length > 0) {
        setMessages(session.messages)
      } else {
        // Aucune session, récupérer le message proactif
        const { message } = await getProactiveMessage()
        setMessages([message])
      }
      setHasInit(true)
    } catch (error) {
      console.error("Erreur initialisation chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return

    const userMessage: GlobalChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev.filter(m => !m.quick_replies), userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const { response, quick_replies } = await sendGlobalChatMessage(text)
      
      const assistantMessage: GlobalChatMessage = {
        role: "assistant",
        content: response,
        quick_replies: quick_replies,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Erreur envoi message:", error)
      const errorMessage: GlobalChatMessage = {
        role: "assistant",
        content: "Désolé, je rencontre un problème de connexion. Peux-tu réessayer ?",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-full">
                  <Sparkles className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">JobyJoba</h3>
                  <p className="text-indigo-200 text-xs">Ton coach emploi IA</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  {msg.role !== 'tool' && (
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-br-sm" 
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm"
                    )}>
                      {msg.content}
                    </div>
                  )}

                  {msg.tool_calls_executed && msg.tool_calls_executed.length > 0 && (
                    <div className="mt-2 w-full max-w-[85%] border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-xs mb-2">
                        <Briefcase className="w-3.5 h-3.5" />
                        J'ai effectué une recherche pour toi
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-4 whitespace-pre-wrap">
                        {msg.tool_calls_executed[0].result.replace(/\[ACTION:.*\]/g, '').trim()}
                        {msg.tool_calls_executed[0].result.includes('[ACTION:NAVIGATE_SEARCH]') && (
                          <div className="mt-2 text-indigo-600 dark:text-indigo-400 italic">
                            Redirection vers tes résultats dans un instant...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Replies (seulement sur le dernier message) */}
                  {idx === messages.length - 1 && msg.quick_replies && msg.quick_replies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 w-full">
                      {msg.quick_replies.map((qr, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(qr.label.replace(/^[^\w]+/, '').trim())} // Enlève l'emoji
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full transition-colors whitespace-nowrap"
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2 relative bg-slate-100 dark:bg-slate-800 rounded-full p-1"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pose-moi une question..."
                  className="flex-1 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 p-4 rounded-full shadow-xl transition-all z-50",
          isOpen 
            ? "bg-slate-800 hover:bg-slate-700 text-white" 
            : "bg-indigo-600 hover:bg-indigo-700 text-white"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </>
  )
}
