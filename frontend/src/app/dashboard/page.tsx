"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  ExternalLink,
  Star,
  Zap,
  Target,
  Sparkles,
  Search,
  Bookmark,
  CheckCircle2,
  Circle
} from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import { UpgradeBanner } from "@/components/ui/upgrade-banner"
import { 
  getApplicationsV2, 
  type ApplicationV2,
  getDashboardStats,
  type DashboardStats,
  getSubscriptionDetails,
  type SubscriptionDetails
} from "@/lib/api"
import { TrackingBoard } from "@/components/dashboard/tracking-board"
import { QuotaWidget } from "@/components/dashboard/QuotaWidget"
import { EmptyStateDashboard } from "@/components/dashboard/EmptyStateDashboard"
import { getAdminUsageStats } from "@/lib/api"
import { DollarSign, BarChart3, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface UserData {
  firstName: string
  email: string
  userId: string | null
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, type: "tween" },
  },
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [applications, setApplications] = useState<ApplicationV2[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminStats, setAdminStats] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      const minLoadTime = new Promise((resolve) => setTimeout(resolve, 800))

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        await minLoadTime
        setUser({ firstName: "Utilisateur", email: "", userId: null })
        setIsLoading(false)
        return
      }

      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("id", authUser.id)
            .single()

          setUser({
            firstName: profile?.first_name || authUser.user_metadata?.first_name || "Utilisateur",
            email: authUser.email || "",
            userId: authUser.id,
          })

          try {
            const [appRes, statsRes, subRes] = await Promise.all([
              getApplicationsV2(10),
              getDashboardStats(),
              getSubscriptionDetails()
            ])
            setApplications(appRes.applications || [])
            setStats(statsRes)
            setSubscription(subRes)
          } catch (err) {
            console.error("Error loading dashboard data:", err)
            setApplications([])
          }

          // Check if admin and load admin stats
          const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID || '0427c3e2-9b0d-4f1b-a53c-7c012891d4e0' 
          if (authUser.id === adminId) {
            setIsAdmin(true)
            try {
              const adminRes = await getAdminUsageStats(30)
              setAdminStats(adminRes)
            } catch (e) {
              console.error("Admin stats load error:", e)
            }
          }
        } else {
          setUser({ firstName: "Utilisateur", email: "", userId: null })
        }

        await minLoadTime
      } catch (err) {
        console.error("Error loading data:", err)
        setUser({ firstName: "Utilisateur", email: "", userId: null })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const firstName = user?.firstName || "Utilisateur"
  const applicationCount = applications.length

  // Checklist progress
  const checklistItems = [
    { label: "Remplir son profil", done: !!stats?.checklist.has_profile },
    { label: "Importer un CV", done: !!stats?.checklist.has_cv },
    { label: "Lancer une recherche", done: !!stats?.checklist.has_searched },
  ]
  const completedCount = checklistItems.filter(i => i.done).length
  const progressPercent = (completedCount / checklistItems.length) * 100

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30"
    if (score >= 60) return "text-indigo-400 bg-indigo-500/20 border-indigo-500/30"
    if (score >= 40) return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30"
    return "text-slate-400 bg-slate-500/20 border-slate-500/30"
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[calc(100vh-8rem)]"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm mb-3">
          <Zap className="w-3.5 h-3.5" />
          <span>Tableau de bord</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Bonjour, {firstName} 👋</h1>
        <p className="text-slate-400 text-lg">Bienvenue sur votre espace JobXpress</p>
      </motion.div>

      {/* Upgrade Banner for FREE users */}
      <motion.div variants={itemVariants} className="mb-6">
        <UpgradeBanner 
          onDismiss={() => {}}
          variant="auto"
        />
      </motion.div>

      {/* Quota Widgets */}
      <motion.div variants={itemVariants} className="mb-8">
        <QuotaWidget 
          credits={subscription?.credits || 0}
          maxCredits={subscription?.max_credits || 5}
          planName={subscription?.plan_name || "FREE"}
          jobyJobaMessages={subscription?.jobyjoba_messages_limit ? (subscription.jobyjoba_messages_limit - 1) : 0} // Fake current usage for UI demo
          jobyJobaLimit={subscription?.jobyjoba_messages_limit || 10}
          isDailyLimit={subscription?.jobyjoba_is_daily_limit || false}
        />
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div variants={containerVariants} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* New Application Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.01 }}
          className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 3 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25"
            >
              <FileText className="w-7 h-7 text-white" />
            </motion.div>
            <div>
               <h3 className="text-lg font-semibold text-white">Nouvelle candidature</h3>
               <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest leading-none">IA Automatisée</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Lancer une nouvelle recherche d&apos;emploi pilotée par l&apos;IA
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/dashboard/apply"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all text-sm group/btn relative overflow-hidden w-full justify-center"
            >
              <span className="relative z-10">Démarrer maintenant</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform relative z-10" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.01 }}
          className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-4 mb-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: -3 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25"
              >
                <TrendingUp className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold text-white">Performance</h3>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest leading-none">Statut de recherche</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-gradient">
                {stats?.total_applications || 0}
              </span>
              <span className="text-slate-500 text-sm italic">Candidatures</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-indigo-400">
                {stats?.total_saved_jobs || 0}
              </span>
              <span className="text-slate-500 text-sm italic">Favoris</span>
            </div>
          </div>
        </motion.div>

        {/* Onboarding Checklist Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.01 }}
          className="group sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
        >
          <div className="flex items-center justify-between mb-2">
             <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progression profil</div>
             <div className="text-[10px] font-bold text-purple-400">{completedCount} / {checklistItems.length}</div>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              />
          </div>
          
          <div className="space-y-3">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                )}
                <span className={`text-[13px] ${item.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          
          {progressPercent < 100 && (
            <div className="mt-5 pt-4 border-t border-white/5">
              <Link href="/dashboard/profile" className="text-xs text-purple-400 hover:text-purple-300 font-medium hover:underline inline-flex items-center gap-1.5">
                Compléter mon profil <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Recent Applications replace with TrackingBoard */}
      <motion.div
        variants={itemVariants}
        className="mt-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between xl:flex-row flex-col gap-4 xl:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Suivi des candidatures</h2>
                <p className="text-sm text-slate-400">Gérez vos candidatures générées par l&apos;IA</p>
              </div>
            </div>
            {applications.length > 0 && (
              <Link
                href="/dashboard/search"
                className="text-sm px-4 py-2 bg-slate-800 text-indigo-400 hover:text-indigo-300 font-medium rounded-lg transition-colors border border-slate-700 hover:border-indigo-500/30"
              >
                Explorer de nouvelles offres
              </Link>
            )}
          </div>
        </div>

        <div className="p-6 overflow-x-auto min-h-[500px]">
          {applications.length > 0 ? (
            <TrackingBoard
              applications={applications}
              onUpdate={() => {
                // Refresh applications
                getApplicationsV2(10).then(res => setApplications(res.applications || []))
              }}
            />
          ) : (
            <EmptyStateDashboard />
          )}
        </div>
      </motion.div>

      {/* Admin Monitoring Section (si admin) */}
      {isAdmin && adminStats && (
        <motion.div variants={itemVariants} className="mt-12 pt-12 border-t border-slate-800/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Cost Monitoring</h2>
              <p className="text-slate-400 text-sm">Vue globale de l&apos;utilisation des APIs IA (30 jours)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="gradient" className="bg-indigo-500/5 border-indigo-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  COÛT TOTAL ESTIMÉ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-white tracking-tight">${adminStats.total_cost_usd}</div>
                <div className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Basé sur {adminStats.total_calls} appels API
                </div>
              </CardContent>
            </Card>

            {Object.entries(adminStats.by_model || {}).map(([model, data]: [string, any]) => (
              <Card key={model} className="bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    {model}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white tracking-tight">${data.cost}</div>
                  <div className="text-slate-500 text-xs mt-2">{data.calls} requêtes exécutées</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
