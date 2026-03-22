"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  FileText,
  ArrowRight,
  Zap,
  Target,
  Search,
  CheckCircle2,
  Circle,
  ChevronRight,
  Bookmark,
  Plus,
  BarChart3,
  DollarSign,
  Activity,
  X,
} from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import {
  getApplicationsV2,
  type ApplicationV2,
  getDashboardStats,
  type DashboardStats,
  getSubscriptionDetails,
  type SubscriptionDetails,
} from "@/lib/api"
import { TrackingBoard } from "@/components/dashboard/tracking-board"
import { EmptyStateDashboard } from "@/components/dashboard/EmptyStateDashboard"
import { getAdminUsageStats } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface UserData {
  firstName: string
  email: string
  userId: string | null
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, type: "tween" },
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
  const [checklistDismissed, setChecklistDismissed] = useState(false)

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
              getSubscriptionDetails(),
            ])
            setApplications(appRes.applications || [])
            setStats(statsRes)
            setSubscription(subRes)
          } catch (err) {
            console.error("Error loading dashboard data:", err)
            setApplications([])
          }

          const adminId =
            process.env.NEXT_PUBLIC_ADMIN_USER_ID || "0427c3e2-9b0d-4f1b-a53c-7c012891d4e0"
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

  // ─── Derived state ───────────────────────────────────────────────────────────
  const firstName = user?.firstName || "Utilisateur"
  const credits = subscription?.credits ?? 0
  const maxCredits = subscription?.max_credits ?? 5
  const creditPct = Math.min(100, (credits / (maxCredits || 1)) * 100)
  const isLowCredits = credits <= 2
  const planName = subscription?.plan_name || "FREE"
  const totalApps = stats?.total_applications ?? 0
  const totalSaved = stats?.total_saved_jobs ?? 0

  const checklistItems = [
    {
      label: "Compléter mon profil",
      done: !!stats?.checklist.has_profile,
      href: "/dashboard/profile",
    },
    {
      label: "Importer un CV",
      done: !!stats?.checklist.has_cv,
      href: "/dashboard/profile",
    },
    {
      label: "Lancer une recherche",
      done: !!stats?.checklist.has_searched,
      href: "/dashboard/apply",
    },
  ]
  const completedCount = checklistItems.filter((i) => i.done).length
  const progressPct = (completedCount / checklistItems.length) * 100
  const isOnboardingDone = progressPct === 100
  const showChecklist = !isOnboardingDone && !checklistDismissed

  const subtitle = isOnboardingDone
    ? totalApps > 0
      ? `${totalApps} candidature${totalApps > 1 ? "s" : ""} en cours · Bonne continuation !`
      : "Prêt à lancer votre première recherche ?"
    : `Profil complété à ${Math.round(progressPct)}% — encore ${checklistItems.length - completedCount} étape${checklistItems.length - completedCount > 1 ? "s" : ""}`

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HEADER — Greeting + KPIs + CTA primaire
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        {/* Left: greeting */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Bonjour, {firstName} 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{subtitle}</p>
        </div>

        {/* Right: KPI badges + CTA */}
        <div className="flex items-center gap-2 flex-wrap">
          {totalApps > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/70 border border-white/5 text-sm">
              <Target className="w-4 h-4 text-indigo-400" />
              <span className="text-white font-semibold">{totalApps}</span>
              <span className="text-slate-500 hidden xs:inline">candidatures</span>
            </div>
          )}
          {totalSaved > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/70 border border-white/5 text-sm">
              <Bookmark className="w-4 h-4 text-purple-400" />
              <span className="text-white font-semibold">{totalSaved}</span>
              <span className="text-slate-500 hidden xs:inline">favoris</span>
            </div>
          )}
          <Link
            href="/dashboard/apply"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Nouvelle recherche
          </Link>
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. RESOURCE STRIP — Crédits + Plan (compact)
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={itemVariants}>
        <div
          className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-2xl border transition-colors ${
            isLowCredits
              ? "bg-red-500/5 border-red-500/20"
              : "bg-slate-900/50 border-white/5"
          }`}
        >
          {/* Credits bar */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isLowCredits ? "bg-red-500/20" : "bg-indigo-500/15"
              }`}
            >
              <Zap
                className={`w-4 h-4 ${isLowCredits ? "text-red-400" : "text-indigo-400"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500 font-medium">Crédits de recherche</span>
                <span
                  className={`text-xs font-bold tabular-nums ${
                    isLowCredits ? "text-red-400" : "text-slate-300"
                  }`}
                >
                  {credits} / {maxCredits}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${creditPct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isLowCredits ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 bg-white/5 flex-shrink-0" />

          {/* Plan + actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                planName === "FREE"
                  ? "bg-slate-800 text-slate-400 border-slate-700/50"
                  : planName === "PRO"
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                  : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
              }`}
            >
              {planName}
            </span>

            {isLowCredits ? (
              <Link
                href="/dashboard/subscription"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Recharger les crédits
              </Link>
            ) : planName === "FREE" ? (
              <Link
                href="/dashboard/subscription"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium group"
              >
                Passer à Starter — 100 crédits/mois
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. ONBOARDING BANNER (uniquement si incomplet)
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {showChecklist && (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-sm font-semibold text-white">
                    Configurez votre profil
                  </span>
                  <span className="text-xs text-slate-500">
                    {completedCount}/{checklistItems.length} étapes complétées
                  </span>
                </div>
                <button
                  onClick={() => setChecklistDismissed(true)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                  aria-label="Masquer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              </div>

              {/* Steps */}
              <div className="flex flex-col sm:flex-row gap-2">
                {checklistItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.done ? "#" : item.href}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm flex-1 transition-all ${
                      item.done
                        ? "bg-slate-800/30 text-slate-500 cursor-default pointer-events-none"
                        : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-white/5 hover:border-white/10 hover:-translate-y-0.5"
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                    <span className={item.done ? "line-through" : ""}>{item.label}</span>
                    {!item.done && (
                      <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-500 flex-shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. TRACKING BOARD — Focus central
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden"
      >
        {/* Board header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">
                Suivi des candidatures
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {applications.length > 0
                  ? `${applications.length} candidature${applications.length > 1 ? "s" : ""} · Glissez pour changer le statut`
                  : "Démarrez votre première recherche pour remplir ce tableau"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/search"
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-700/40"
            >
              <Search className="w-3.5 h-3.5" />
              Explorer les offres
            </Link>
            <Link
              href="/dashboard/apply"
              className="flex items-center gap-1.5 text-xs text-white font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 transition-colors border border-indigo-500/30"
            >
              <FileText className="w-3.5 h-3.5" />
              Nouvelle candidature
            </Link>
          </div>
        </div>

        {/* Board content */}
        <div className="p-4 sm:p-5 min-h-[480px]">
          {applications.length > 0 ? (
            <TrackingBoard
              applications={applications}
              onUpdate={() => {
                getApplicationsV2(10).then((res) =>
                  setApplications(res.applications || [])
                )
              }}
            />
          ) : (
            <EmptyStateDashboard />
          )}
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. ADMIN MONITORING (visible uniquement admin)
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAdmin && adminStats && (
        <motion.div variants={itemVariants} className="pt-6 border-t border-slate-800/50">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cost Monitoring</h2>
              <p className="text-slate-400 text-xs">
                APIs IA — 30 derniers jours
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="gradient" className="bg-indigo-500/5 border-indigo-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Coût total estimé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white">
                  ${adminStats.total_cost_usd}
                </div>
                <div className="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {adminStats.total_calls} appels API
                </div>
              </CardContent>
            </Card>

            {Object.entries(adminStats.by_model || {}).map(
              ([model, data]: [string, any]) => (
                <Card
                  key={model}
                  className="bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50 transition-colors"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      {model}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">${data.cost}</div>
                    <div className="text-slate-500 text-xs mt-1">{data.calls} requêtes</div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
