"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Sparkles, ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { SocialAuth, AuthDivider } from "@/components/auth/social-auth"

/**
 * Composant qui gère les erreurs OAuth depuis les paramètres URL.
 * Doit être enveloppé dans Suspense pour la génération statique Next.js.
 */
function OAuthErrorHandler({ onError }: { onError: (message: string) => void }) {
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError === 'oauth_failed') {
      onError("La connexion via le fournisseur a échoué. Veuillez réessayer.")
      showToast("Échec de la connexion OAuth", "error")
    }
  }, [searchParams, showToast, onError])

  return null
}

// Liens Stripe pour les plans payants
const STRIPE_LINKS: Record<string, string> = {
  starter: "https://buy.stripe.com/7sYaEY5UdavdaDU0gZ3F601"
}

/**
 * Composant interne qui gère la redirection post-connexion vers Stripe.
 * Doit être enveloppé dans Suspense pour la génération statique Next.js.
 */
function PaymentRedirectHandler({ onPaymentParams }: { 
  onPaymentParams: (plan: string | null, redirect: boolean) => void 
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const plan = searchParams.get('plan')
    const redirect = searchParams.get('redirect') === 'payment'
    onPaymentParams(plan, redirect)
  }, [searchParams, onPaymentParams])

  return null
}

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Paramètres de redirection vers Stripe après connexion
  const [planFromUrl, setPlanFromUrl] = useState<string | null>(null)
  const [redirectToPayment, setRedirectToPayment] = useState(false)

  const handlePaymentParams = (plan: string | null, redirect: boolean) => {
    setPlanFromUrl(plan)
    setRedirectToPayment(redirect)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Supabase n'est pas configuré.")
      showToast("Supabase n'est pas configuré", "error")
      setIsLoading(false)
      return
    }

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError("Email ou mot de passe incorrect")
        showToast("Identifiants incorrects", "error")
        return
      }

      showToast("Connexion réussie !", "success")
      
      // Redirection vers Stripe si paiement en attente
      if (redirectToPayment && planFromUrl && STRIPE_LINKS[planFromUrl]) {
        showToast("Redirection vers le paiement...", "info")
        window.location.href = STRIPE_LINKS[planFromUrl]
        return
      }
      
      router.push("/dashboard")
    } catch {
      setError("Une erreur est survenue")
      showToast("Une erreur est survenue", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-gradient flex">
      {/* Gestionnaire d'erreurs OAuth avec Suspense pour SSG */}
      <Suspense fallback={null}>
        <OAuthErrorHandler onError={setError} />
      </Suspense>
      
      {/* Gestionnaire des paramètres de paiement */}
      <Suspense fallback={null}>
        <PaymentRedirectHandler onPaymentParams={handlePaymentParams} />
      </Suspense>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à l&apos;accueil
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white mb-2">Bon retour !</h1>
              <p className="text-slate-400">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>

            <div className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Authentification sociale */}
              <SocialAuth mode="login" />

              <AuthDivider />

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Connexion...
                  </>
                ) : (
                  <>
                    <span className="relative z-10">Se connecter</span>
                    {/* Shine effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </>
                )}
              </motion.button>

              {/* Register Link */}
              <p className="text-center text-slate-400">
                Pas encore de compte ?{" "}
                <Link
                  href="/register"
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Créer un compte
                </Link>
              </p>
            </form>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{
            y: [0, -15, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={{
            y: [0, 15, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 right-20 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative z-10 text-center p-12 max-w-lg"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-28 h-28 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
          >
            <Sparkles className="w-14 h-14 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Automatisez votre recherche d&apos;emploi
          </h2>
          <p className="text-white/80 text-lg leading-relaxed">
            Laissez l&apos;IA trouver les meilleures opportunités et générer vos lettres de motivation
            personnalisées.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
