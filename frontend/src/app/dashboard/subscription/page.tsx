"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  CreditCard,
  Zap,
  Star,
  Crown,
  Check,
  ArrowRight,
  ExternalLink,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { getSubscriptionDetails, type SubscriptionDetails, type AvailablePlan } from "@/lib/api"

// ============================================
// CONSTANTS
// ============================================

const planStyles = {
  FREE: {
    gradient: "from-slate-500 to-slate-600",
    badge: "bg-slate-700 text-slate-400",
    border: "border-slate-700/50",
    icon: Zap,
    iconColor: "text-slate-400"
  },
  STARTER: {
    gradient: "from-indigo-500 to-purple-600",
    badge: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
    border: "border-indigo-500/50",
    icon: Star,
    iconColor: "text-indigo-400"
  },
  PRO: {
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    border: "border-amber-500/50",
    icon: Crown,
    iconColor: "text-amber-400"
  }
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

// ============================================
// SKELETON LOADER
// ============================================

function SubscriptionSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-slate-700/50 rounded-lg" />
      <div className="h-4 w-64 bg-slate-700/30 rounded" />
      
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-slate-700/50 rounded-2xl" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-slate-700/50 rounded" />
            <div className="h-4 w-48 bg-slate-700/30 rounded" />
          </div>
        </div>
        <div className="h-4 w-full bg-slate-700/30 rounded-full" />
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <div className="h-12 w-12 bg-slate-700/50 rounded-xl mb-4" />
            <div className="h-6 w-24 bg-slate-700/50 rounded mb-2" />
            <div className="h-8 w-20 bg-slate-700/50 rounded mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-4 w-full bg-slate-700/30 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// PLAN CARD COMPONENT
// ============================================

interface PlanCardProps {
  plan: AvailablePlan
  planKey: string
  upgradeUrl: string | null
}

function PlanCard({ plan, planKey, upgradeUrl }: PlanCardProps) {
  const style = planStyles[planKey as keyof typeof planStyles] || planStyles.FREE
  const PlanIcon = style.icon
  const isProComingSoon = planKey === "PRO"
  
  const features = [
    { text: `${plan.credits} crédits/${plan.reset_days === 7 ? 'semaine' : 'mois'}`, highlight: true },
    { text: `${plan.jobyjoba_messages} messages JobyJoba${plan.jobyjoba_daily_limit ? '/jour' : '/session'}` },
    { text: plan.custom_context ? "Contexte personnalisé" : "Contexte standard" },
    { text: plan.reset_days === 7 ? "Reset hebdomadaire" : "Reset mensuel" },
  ]

  return (
    <motion.div
      variants={itemVariants}
      whileHover={!plan.is_current && !isProComingSoon ? { y: -4, scale: 1.01 } : {}}
      className={`
        relative rounded-2xl p-6 transition-all duration-300
        ${plan.is_current 
          ? `bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-2 ${style.border} shadow-xl` 
          : isProComingSoon
            ? "bg-slate-800/30 border border-slate-700/30 opacity-70"
            : "bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10"
        }
      `}
    >
      {/* Current Plan Badge */}
      {plan.is_current && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg bg-gradient-to-r ${style.gradient}`}>
            <Check className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">Plan actuel</span>
          </div>
        </motion.div>
      )}

      {/* Coming Soon Badge */}
      {isProComingSoon && !plan.is_current && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-orange-500">
            <Clock className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">Bientôt</span>
          </div>
        </motion.div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-6 pt-2">
        <div className={`
          inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3
          bg-gradient-to-br ${style.gradient} shadow-lg
        `}>
          <PlanIcon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold text-white">{plan.price}€</span>
          <span className="text-slate-400 text-sm">
            {plan.price === 0 ? "pour toujours" : "/mois"}
          </span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <div className={`mt-0.5 rounded-full p-0.5 ${plan.is_current ? style.badge : "bg-slate-700/50"}`}>
              <Check className={`w-3.5 h-3.5 ${feature.highlight ? "text-emerald-400" : "text-slate-400"}`} />
            </div>
            <span className={`text-sm ${feature.highlight ? "text-white font-medium" : "text-slate-300"}`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      {plan.is_current ? (
        <Button 
          variant="outline" 
          className="w-full opacity-60 cursor-default"
          disabled
        >
          <Check className="w-4 h-4 mr-2" />
          Votre plan actuel
        </Button>
      ) : isProComingSoon ? (
        <Button 
          variant="outline" 
          className="w-full opacity-50 cursor-not-allowed"
          disabled
        >
          <Clock className="w-4 h-4 mr-2" />
          Bientôt disponible
        </Button>
      ) : plan.is_upgrade && upgradeUrl ? (
        <a href={upgradeUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="gradient" className="w-full group">
            <span>Passer à {plan.name}</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </a>
      ) : (
        <Link href="/pricing">
          <Button variant="outline" className="w-full">
            Voir les détails
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </motion.div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getSubscriptionDetails()
      setSubscription(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  if (isLoading) {
    return <SubscriptionSkeleton />
  }

  if (error || !subscription) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Erreur de chargement</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button variant="outline" onClick={fetchSubscription}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </motion.div>
      </div>
    )
  }

  const currentPlan = subscription.plan as keyof typeof planStyles
  const style = planStyles[currentPlan] || planStyles.FREE
  const PlanIcon = style.icon

  // Calculate time until reset
  const getTimeUntilReset = () => {
    if (!subscription.next_reset_at) return null
    const resetDate = new Date(subscription.next_reset_at)
    const now = new Date()
    const diffMs = resetDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return "Aujourd'hui"
    if (diffDays === 1) return "Demain"
    return `Dans ${diffDays} jours`
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm mb-3">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Gestion d'abonnement</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Votre abonnement</h1>
        <p className="text-slate-400">Gérez votre plan et suivez vos crédits</p>
      </motion.div>

      {/* Current Subscription Card */}
      <motion.div variants={itemVariants}>
        <Card variant="gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg`}>
                <PlanIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-white">Plan {subscription.plan_name}</span>
                <p className="text-sm text-slate-400 font-normal mt-0.5">
                  {subscription.price === 0 ? "Gratuit" : `${subscription.price}€/mois`}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credits Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Crédits utilisés</span>
                <span className="text-sm font-medium text-white">
                  {subscription.credits} / {subscription.max_credits}
                </span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${subscription.credits_progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${style.gradient}`}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">
                  {subscription.reset_period_days === 7 ? "Reset hebdomadaire" : "Reset mensuel"}
                </span>
                {getTimeUntilReset() && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeUntilReset()}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs">Crédits</span>
                </div>
                <span className="text-xl font-bold text-white">{subscription.credits}</span>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Maximum</span>
                </div>
                <span className="text-xl font-bold text-white">{subscription.max_credits}</span>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs">JobyJoba</span>
                </div>
                <span className="text-xl font-bold text-white">
                  {subscription.jobyjoba_messages_limit}
                  <span className="text-xs font-normal text-slate-400">
                    /{subscription.jobyjoba_is_daily_limit ? "jour" : "session"}
                  </span>
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Reset</span>
                </div>
                <span className="text-xl font-bold text-white">
                  {subscription.reset_period_days}
                  <span className="text-xs font-normal text-slate-400"> jours</span>
                </span>
              </div>
            </div>

            {/* Upgrade CTA for FREE users */}
            {subscription.can_upgrade && subscription.upgrade_url && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Passez à Starter</p>
                      <p className="text-sm text-slate-400">100 crédits/mois pour seulement 9,99€</p>
                    </div>
                  </div>
                  <a href={subscription.upgrade_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="gradient" size="sm">
                      Passer à Starter
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Available Plans */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Tous les plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(subscription.available_plans).map(([key, plan]) => (
            <PlanCard 
              key={key} 
              plan={plan} 
              planKey={key}
              upgradeUrl={subscription.upgrade_url}
            />
          ))}
        </div>
      </motion.div>

      {/* FAQ Link */}
      <motion.div variants={itemVariants} className="text-center pt-4">
        <p className="text-slate-400 text-sm mb-2">Des questions sur nos plans ?</p>
        <Link href="/pricing" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium inline-flex items-center gap-1 transition-colors">
          Voir la page tarifs complète
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </motion.div>
  )
}
