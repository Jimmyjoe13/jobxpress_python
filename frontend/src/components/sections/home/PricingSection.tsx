"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Zap, Sparkles, Star } from "lucide-react"

const plans = [
  {
    name: "Freemium",
    price: "0",
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
    name: "Starter",
    price: "9.99",
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
    href: "/dashboard/upgrade?plan=STARTER",
    popular: true,
    icon: Star,
    color: "indigo"
  },
  {
    name: "Pro",
    price: "24.99",
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
    href: "/dashboard/upgrade?plan=PRO",
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
            <span className={`text-sm ${!isAnnual ? 'text-white font-medium' : 'text-slate-500'}`}>Mensuel</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              disabled // Désactivé car pas encore de plans annuels en backend
              className="relative w-12 h-6 rounded-full bg-slate-700 p-1 transition-colors cursor-not-allowed opacity-50"
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-white font-medium' : 'text-slate-500'}`}>
              Annuel <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Coming Soon</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className={`relative flex flex-col p-8 rounded-3xl border ${
                plan.popular 
                  ? 'bg-slate-800/80 border-indigo-500/50 shadow-2xl shadow-indigo-500/10' 
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg">
                  Plus populaire
                </div>
              )}

              <div className="mb-8">
                <div className={`w-12 h-12 rounded-2xl bg-${plan.color}-500/10 flex items-center justify-center mb-4`}>
                  <plan.icon className={`w-6 h-6 text-${plan.color}-400`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-white">{plan.price}€</span>
                  <span className="text-slate-500 ml-2">/ mois</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={`w-full py-4 rounded-xl text-center font-bold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
        
        {/* Money back guarantee / No cure no pay info */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            <Check className="w-4 h-4" />
            <span>Règle &quot;No cure, no pay&quot; : crédits débités uniquement si des résultats sont trouvés.</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
