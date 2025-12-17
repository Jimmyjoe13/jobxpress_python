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
} from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import { getMyApplicationsFlat, type Application } from "@/lib/api"

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
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setDataSource] = useState<"api" | "supabase" | "none">("none")

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
            const apiApps = await getMyApplicationsFlat()
            if (apiApps.length > 0) {
              setApplications(apiApps)
              setDataSource("api")
            } else {
              throw new Error("No data from API")
            }
          } catch {
            const { data: candidate } = await supabase
              .from("candidates")
              .select("id")
              .eq("user_id", authUser.id)
              .single()

            if (candidate) {
              const { data: apps } = await supabase
                .from("applications")
                .select("*")
                .eq("candidate_id", candidate.id)
                .order("created_at", { ascending: false })
                .limit(10)

              if (apps) {
                setApplications(apps)
                setDataSource("supabase")
              }
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

      {/* Quick Actions Grid */}
      <motion.div variants={containerVariants} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* New Application Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.01 }}
          className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25"
          >
            <FileText className="w-7 h-7 text-white" />
          </motion.div>
          <h3 className="text-lg font-semibold text-white mb-2">Nouvelle candidature</h3>
          <p className="text-slate-400 text-sm mb-5">
            Lancez une nouvelle recherche d&apos;emploi automatisée avec l&apos;IA
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/dashboard/apply"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all text-sm group/btn relative overflow-hidden"
            >
              <span className="relative z-10">Commencer</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform relative z-10" />
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.01 }}
          className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25"
          >
            <TrendingUp className="w-7 h-7 text-white" />
          </motion.div>
          <h3 className="text-lg font-semibold text-white mb-2">Statistiques</h3>
          <p className="text-slate-400 text-sm mb-4">Suivez vos candidatures</p>
          <div className="flex items-end gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              className="text-4xl font-bold text-gradient"
            >
              {applicationCount}
            </motion.span>
            <span className="text-slate-500 pb-1">candidature{applicationCount > 1 ? "s" : ""}</span>
          </div>
        </motion.div>

        {/* Last Activity Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.01 }}
          className="group sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25"
          >
            <Clock className="w-7 h-7 text-white" />
          </motion.div>
          <h3 className="text-lg font-semibold text-white mb-2">Dernière activité</h3>
          {applications[0] ? (
            <>
              <p className="text-white font-medium truncate mb-1">{applications[0].job_title}</p>
              <p className="text-slate-400 text-sm truncate mb-2">{applications[0].company_name}</p>
              <span className="text-slate-500 text-sm">{formatDate(applications[0].created_at)}</span>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-2">Aucune candidature pour le moment</p>
              <span className="text-sm text-slate-500">Lancez votre première recherche !</span>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Recent Applications */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Dernières candidatures</h2>
                <p className="text-sm text-slate-400">Historique de vos recherches</p>
              </div>
            </div>
            {applications.length > 0 && (
              <a
                href="#"
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline"
              >
                Voir tout
              </a>
            )}
          </div>
        </div>

        <div className="p-6">
          {applications.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {applications.map((app, index) => (
                <motion.div
                  key={app.id}
                  variants={itemVariants}
                  whileHover={{ x: 4 }}
                  custom={index}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all duration-200 group border border-transparent hover:border-slate-700/50 cursor-pointer"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                        {app.job_title}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getScoreColor(app.match_score)}`}
                      >
                        <Star className="w-3 h-3" />
                        {app.match_score}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{app.company_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block text-xs text-slate-500">
                      {formatDate(app.created_at)}
                    </span>
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded-lg font-medium capitalize border border-indigo-500/20">
                      {app.status}
                    </span>
                    {app.job_url && (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6 border border-slate-700/50"
              >
                <Sparkles className="w-10 h-10 text-slate-600" />
              </motion.div>
              <h3 className="text-lg font-semibold text-white mb-2">Aucune candidature</h3>
              <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                Commencez par lancer votre première recherche d&apos;emploi automatisée
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard/apply"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all relative overflow-hidden group"
                >
                  <span className="relative z-10">Lancer une recherche</span>
                  <ArrowRight className="w-4 h-4 relative z-10" />
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
