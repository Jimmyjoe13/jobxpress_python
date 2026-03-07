"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles, 
  User, 
  Briefcase,
  Search,
  FileText,
  Zap,
  Trash2,
  ArrowRight
} from "lucide-react"
import { 
  GlobalChatMessage, 
  getProactiveMessage, 
  getGlobalSession, 
  sendGlobalChatMessageStream,
  clearGlobalSession
} from "@/lib/api"
import { cn } from "@/lib/utils"

const SUGGESTIONS = [
  { label: "🔍 Trouve un job", icon: Search },
  { label: "📄 Corrige mon CV", icon: FileText },
  { label: "💡 Conseils entretien", icon: Zap },
  { label: "📉 État du marché", icon: Briefcase },
]

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<GlobalChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasInit, setHasInit] = useState(false)
  const [showNotification, setShowNotification] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Auto-expand on first dashboard visit
  useEffect(() => {
    if (pathname === '/dashboard' && !localStorage.getItem('chat_auto_expanded')) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        localStorage.setItem('chat_auto_expanded', 'true')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen && !hasInit) {
      initChat()
    }
    if (isOpen) {
      setShowNotification(false)
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
        // Restaurer le contexte des outils pour le dernier message assistant
        const updatedMessages = [...session.messages]
        const lastIndex = updatedMessages.length - 1
        if (updatedMessages[lastIndex].role === 'assistant' && session.tool_calls_executed) {
          updatedMessages[lastIndex] = {
            ...updatedMessages[lastIndex],
            tool_calls_executed: session.tool_calls_executed
          }
        }
        setMessages(updatedMessages)
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

  const handleClearChat = async () => {
    try {
      setIsClearing(true)
      await clearGlobalSession()
      const { message } = await getProactiveMessage()
      setMessages([message])
    } catch (error) {
      console.error("Erreur lors de l'effacement:", error)
    } finally {
      setIsClearing(false)
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
      // Ajouter un message assistant vide pour le streaming
      const assistantMessage: GlobalChatMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])

      let fullContent = ""
      let finalMetadata: any = null
      const stream = sendGlobalChatMessageStream(text)
      
      for await (const chunk of stream) {
        if (chunk.c) {
          fullContent += chunk.c
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = fullContent
            }
            return updated
          })
        }
        
        if (chunk.m) {
          finalMetadata = chunk.m
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.quick_replies = chunk.m.quick_replies
              lastMsg.tool_calls_executed = chunk.m.tool_calls_executed
            }
            return updated
          })
        }
      }

      // Action post-stream déclenchée LOCALEMENT par ce message uniquement
      const hasSearchAction = 
        fullContent.includes('[ACTION:NAVIGATE_SEARCH]') || 
        finalMetadata?.tool_calls_executed?.some((t: any) => t.result.includes('[ACTION:NAVIGATE_SEARCH]'))

      if (hasSearchAction) {
        const searchTool = finalMetadata?.tool_calls_executed?.find(
          (t: any) => t.tool_call?.function?.name === "search_jobs"
        )
        let query = ""
        if (searchTool?.tool_call?.function?.arguments) {
          try {
            const args = typeof searchTool.tool_call.function.arguments === 'string' 
              ? JSON.parse(searchTool.tool_call.function.arguments)
              : searchTool.tool_call.function.arguments
            const q = encodeURIComponent(args.job_title || "")
            const l = encodeURIComponent(args.location || "France")
            query = `?q=${q}&l=${l}`
          } catch (e) {}
        }
        setTimeout(() => {
          router.push(`/dashboard/search${query}`)
        }, 2500)
      }

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
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-6 w-[400px] h-[650px] max-h-[85vh] flex flex-col bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                   <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10">
                    <Sparkles className="w-6 h-6 text-indigo-100" />
                   </div>
                   <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-indigo-600 rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-white">JobyJoba</h3>
                  <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                     <p className="text-indigo-100/80 text-[10px] uppercase font-bold tracking-widest">En ligne</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClearChat}
                  disabled={isClearing || messages.length <= 1}
                  className="p-2 hover:bg-white/20 text-white/80 hover:text-white rounded-xl transition-all disabled:opacity-50"
                  title="Effacer la conversation"
                >
                  {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 text-white/80 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-950/20">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  {msg.role !== 'tool' && (
                    <div className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-none font-medium" 
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-white/10 dark:border-slate-700/50 rounded-tl-none"
                    )}>
                      {msg.content}
                      {isLoading && idx === messages.length - 1 && msg.role === 'assistant' && (
                        <motion.span 
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 align-middle"
                        />
                      )}
                    </div>
                  )}

                  {msg.tool_calls_executed && msg.tool_calls_executed.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 w-full max-w-[90%] border border-indigo-500/10 bg-indigo-500/5 rounded-2xl p-4 overflow-hidden relative group"
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Briefcase className="w-12 h-12 text-indigo-500" />
                      </div>
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-2">
                        <Search className="w-3.5 h-3.5" />
                        RÉSULTATS DE RECHERCHE IA
                      </div>
                      <div className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {msg.tool_calls_executed[0].result.replace(/\[ACTION:.*\]/g, '').trim()}
                        {msg.tool_calls_executed[0].result.includes('[ACTION:NAVIGATE_SEARCH]') && (
                          <div className="mt-3 pt-3 border-t border-indigo-500/10 flex items-center justify-between">
                            <span className="text-indigo-400 font-medium italic">Navigation en cours...</span>
                            <div className="w-8 h-1 bg-indigo-500/20 rounded-full overflow-hidden">
                               <motion.div 
                                 animate={{ x: [-40, 40] }}
                                 transition={{ repeat: Infinity, duration: 1 }}
                                 className="w-1/2 h-full bg-indigo-500"
                               />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Quick Replies */}
                  {idx === messages.length - 1 && msg.quick_replies && msg.quick_replies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 w-full">
                      {msg.quick_replies.map((qr, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSend(qr.label.replace(/^[^\w]+/, '').trim())}
                          className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-2xl transition-all shadow-sm font-medium flex items-center gap-2"
                        >
                          <span className="text-indigo-500">•</span>
                          {qr.label}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 shadow-sm">
                    <div className="flex gap-1.5">
                      <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Contextual Suggestions for empty/start state */}
              {messages.length < 2 && !isLoading && (
                 <div className="pt-4 grid grid-cols-1 gap-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Suggestions Rapides</p>
                    {SUGGESTIONS.map((s, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSend(s.label.replace(/^[^\w]+/, '').trim())}
                        className="flex items-center group/item gap-3 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition-all text-left shadow-sm"
                      >
                         <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center transition-transform group-hover/item:scale-110">
                            <s.icon className="w-5 h-5 text-indigo-500" />
                         </div>
                         <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                            <div className="text-[10px] text-slate-500 italic">Demandez à Joby...</div>
                         </div>
                         <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                      </button>
                    ))}
                 </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2 relative bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl px-2 py-1.5 border border-slate-200/50 dark:border-white/5 focus-within:border-indigo-500/30 transition-all"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pose ton CV ou demande un job..."
                  className="flex-1 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/20 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 p-5 rounded-3xl shadow-2xl transition-all z-50 group",
          isOpen 
            ? "bg-slate-800 hover:bg-slate-700 text-white" 
            : "bg-indigo-600 hover:bg-indigo-700 text-white"
        )}
      >
        {/* Pulsing Aura */}
        {!isOpen && (
           <motion.div 
             animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
             transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
             className="absolute inset-0 bg-indigo-500 rounded-3xl pointer-events-none"
           />
        )}
        
        {/* Notification Badge */}
        {!isOpen && showNotification && (
           <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white z-10">
              1
           </div>
        )}

        <div className="relative z-10">
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
                className="flex items-center gap-3"
              >
                <MessageCircle className="w-7 h-7" />
                <span className="hidden group-hover:inline-block font-bold text-sm pr-2">Discute avec Joby</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </>
  )
}
