"use client"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import { motion } from "framer-motion"

type OAuthProvider = 'google' | 'azure'

interface SocialAuthProps {
  /** Texte affiché pour le mode (connexion ou inscription) */
  mode?: 'login' | 'register'
}

/**
 * Composant d'authentification sociale OAuth.
 * Fournit des boutons pour se connecter/s'inscrire via Google et Microsoft.
 * 
 * @example
 * ```tsx
 * <SocialAuth mode="login" />
 * ```
 */
export function SocialAuth({ mode = 'login' }: SocialAuthProps) {
  const [isLoading, setIsLoading] = useState<OAuthProvider | null>(null)
  const { showToast } = useToast()
  const supabase = createClient()

  const actionText = mode === 'login' ? 'Continuer' : "S'inscrire"

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setIsLoading(provider)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // URL de callback configurée dans Supabase
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        const providerName = provider === 'google' ? 'Google' : 'Microsoft'
        showToast(`Erreur de connexion avec ${providerName}`, "error")
        console.error('OAuth error:', error.message)
        setIsLoading(null)
      }
      // Si pas d'erreur, la page va être redirigée vers le provider
    } catch (err) {
      showToast("Une erreur est survenue", "error")
      console.error('OAuth exception:', err)
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-3 w-full">
      {/* Bouton Google */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => handleOAuthLogin('google')}
        disabled={!!isLoading}
        className="w-full py-3.5 px-4 bg-white text-slate-900 font-medium rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading === 'google' ? (
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path 
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
              fill="#4285F4"
            />
            <path 
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
              fill="#34A853"
            />
            <path 
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" 
              fill="#FBBC05"
            />
            <path 
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
              fill="#EA4335"
            />
          </svg>
        )}
        <span>{actionText} avec Google</span>
      </motion.button>

      {/* Bouton Microsoft */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => handleOAuthLogin('azure')}
        disabled={!!isLoading}
        className="w-full py-3.5 px-4 bg-[#2F2F2F] text-white font-medium rounded-xl shadow-sm hover:bg-[#404040] hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading === 'azure' ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 23 23">
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
        )}
        <span>{actionText} avec Microsoft</span>
      </motion.button>
    </div>
  )
}

/**
 * Séparateur "ou" stylisé pour séparer OAuth et formulaire email/password.
 */
export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-700" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-4 bg-slate-800/50 text-slate-500 text-sm">ou</span>
      </div>
    </div>
  )
}
