"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Zap, Sparkles, Star, ArrowRight } from "lucide-react"

const PAYMENTS = {
  STARTER_MONTHLY: "https://buy.stripe.com/7sYaEY5UdavdaDU0gZ3F601",
  STARTER_ANNUAL: "https://buy.stripe.com/dRm6oIbex9r913k4xf3F602",
  PRO_MONTHLY: "https://buy.stripe.com/28E28saat8n5aDUgfX3F603",
  PRO_ANNUAL: "https://buy.stripe.com/28EaEYciB46P3bs0gZ3F604",
}

const plans = [
  {
    id: "FREE",
    name: "Freemium",
    priceMonthly: "0",
    priceAnnual: "0",
    description: "Pour tester la puissance de l'IA",
    features: [
      "5 crédits par semaine (reset lazy)",
      "Recherche d'offres standard",
      "Génération de lettre simple",
      "Assistant JobyJoba (10 msg/sess)",
      "Suivi Kanban basique"
    ],
    cta: "Essayer gratuitement",
    href: "/register",
    popular: false,
    icon: Zap,
    color: "slate"
  },
  {
    id: "STARTER",
    name: "Starter",
    priceMonthly: "9.99",
    priceAnnual: "8.33", // (99.99 / 12)
    fullPriceAnnual: "99.99",
    description: "Idéal pour booster sa recherche",
    features: [
      "100 crédits par mois",
      "Génération de lettres optimisées",
      "Analyse de pertinence Job-CV",
      "Assistant JobyJoba (10 msg/sess)",
      "Suivi Kanban avancé",
      "Support prioritaire"
    ],
    cta: "Choisir Starter",
    href: PAYMENTS.STARTER_MONTHLY,
    popular: true,
    icon: Star,
    color: "indigo"
  },
  {
    id: "PRO",
    name: "Pro",
    priceMonthly: "24.99",
    priceAnnual: "20.83", // (249.99 / 12)
    fullPriceAnnual: "249.99",
    description: "Candidature 100% pilotée par IA",
    features: [
      "300 crédits par mois",
      "JobyJoba Pro (20 msg/JOUR)",
      "Contexte personnalisé débloqué",
      "Matching prédictif avancé",
      "Accès aux nouvelles fonctionnalités",
      "Account Manager dédié"
    ],
    cta: "Passer en Pro",
    href: PAYMENTS.PRO_MONTHLY,
    popular: false,
    icon: Sparkles,
    color: "purple"
  }
]

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            Un plan pour chaque <span className="text-gradient">ambition</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto"
          >
            Démarrez gratuitement et passez à la vitesse supérieure quand vous êtes prêt. 
            Aucun engagement, annulez quand vous le souhaitez.
          </motion.p>

          {/* Pricing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={cn(
              "text-sm transition-colors",
              !isAnnual ? "text-white font-semibold" : "text-slate-500"
            )}>
              Mensuel
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-slate-800 border border-slate-700 p-1 transition-all hover:border-indigo-500/50"
            >
              <motion.div 
                className="w-5 h-5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"
                animate={{ x: isAnnual ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm transition-colors",
                isAnnual ? "text-white font-semibold" : "text-slate-500"
              )}>
                Annuel
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                -20% Eco
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => {
            const currentPrice = isAnnual ? plan.priceAnnual : plan.priceMonthly
            const currentHref = plan.id === "FREE" 
              ? plan.href 
              : (isAnnual 
                  ? (plan.id === "STARTER" ? PAYMENTS.STARTER_ANNUAL : PAYMENTS.PRO_ANNUAL) 
                  : (plan.id === "STARTER" ? PAYMENTS.STARTER_MONTHLY : PAYMENTS.PRO_MONTHLY))

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className={cn(
                  "relative flex flex-col p-8 rounded-3xl border transition-all duration-300",
                  plan.popular 
                    ? "bg-slate-800/40 border-indigo-500/50 shadow-2xl shadow-indigo-500/10 backdrop-blur-sm" 
                    : "bg-slate-900/50 border-white/5 hover:border-white/10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                    Recommandé
                  </div>
                )}

                <div className="mb-8">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                    plan.color === "indigo" ? "bg-indigo-500/10 text-indigo-400" : 
                    plan.color === "purple" ? "bg-purple-500/10 text-purple-400" : "bg-slate-500/10 text-slate-400"
                  )}>
                    <plan.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
                </div>

                <div className="mb-8 h-[60px]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{currentPrice}€</span>
                    <span className="text-slate-500 text-sm">/ mois</span>
                  </div>
                  <AnimatePresence mode="wait">
                    {isAnnual && plan.id !== "FREE" && (
                      <motion.p 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="text-emerald-400/80 text-[11px] font-medium mt-1"
                      >
                        Facturé {plan.fullPriceAnnual}€/an
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                      <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-500" />
                      </div>
                      <span className="opacity-80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={currentHref}
                  className={cn(
                    "group w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                    plan.popular
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </motion.div>
            )
          })}
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900/50 border border-white/5 text-slate-400 text-xs backdrop-blur-sm">
            <Zap className="w-4 h-4 text-amber-500" />
            <p>
              Règle <span className="text-white font-bold">&quot;No cure, no pay&quot;</span> : Vos crédits ne sont débités que si l&apos;IA identifie des opportunités réelles.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
