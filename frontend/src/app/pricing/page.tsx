"use client"

import Link from "next/link"
import { Check, Zap, Star, ArrowRight, Clock, Sparkles, MessageCircle, CreditCard } from "lucide-react"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Navbar, Footer } from "@/components/layout"

interface PlanFeature {
  text: string
  highlight?: boolean
}

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: PlanFeature[]
  cta: string
  href: string
  popular: boolean
  disabled: boolean
  external?: boolean
  comingSoon?: boolean
  icon: React.ReactNode
  gradient: string
  badge?: string
}

const plans: Plan[] = [
  {
    name: "Freemium",
    price: "0€",
    period: "pour toujours",
    description: "Parfait pour découvrir JobXpress",
    features: [
      { text: "5 crédits par semaine" },
      { text: "Recherche d'emploi IA" },
      { text: "Lettres de motivation générées" },
      { text: "Coach JobyJoba (10 msg/session)" },
      { text: "Support par email" },
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    popular: false,
    disabled: false,
    icon: <Zap className="w-6 h-6" />,
    gradient: "from-slate-500 to-slate-600",
  },
  {
    name: "Starter",
    price: "9,99€",
    period: "/mois",
    description: "Pour booster votre recherche",
    features: [
      { text: "100 crédits par mois", highlight: true },
      { text: "Tout du plan Freemium" },
      { text: "Reset mensuel automatique" },
      { text: "Support prioritaire" },
      { text: "Historique complet" },
    ],
    cta: "S'abonner à Starter",
    href: "https://buy.stripe.com/7sYaEY5UdavdaDU0gZ3F601",
    popular: true,
    disabled: false,
    external: true,
    icon: <Star className="w-6 h-6" />,
    gradient: "from-indigo-500 to-purple-600",
    badge: "Populaire",
  },
  {
    name: "Pro",
    price: "24,99€",
    period: "/mois",
    description: "L'accompagnement ultime",
    features: [
      { text: "300 crédits par mois", highlight: true },
      { text: "Tout du plan Starter" },
      { text: "JobyJoba avec contexte personnalisé", highlight: true },
      { text: "20 messages JobyJoba/jour", highlight: true },
      { text: "Fonctionnalités exclusives" },
    ],
    cta: "Bientôt disponible",
    href: "#",
    popular: false,
    disabled: true,
    comingSoon: true,
    icon: <Sparkles className="w-6 h-6" />,
    gradient: "from-amber-500 to-orange-600",
    badge: "Bientôt",
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, type: "tween" },
  },
}

const featureVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

// Comparaison détaillée des plans
const comparisonData = [
  { feature: "Crédits", free: "5/semaine", starter: "100/mois", pro: "300/mois" },
  { feature: "Période de reset", free: "7 jours", starter: "30 jours", pro: "30 jours" },
  { feature: "Messages JobyJoba", free: "10/session", starter: "10/session", pro: "20/jour" },
  { feature: "Contexte personnalisé", free: "—", starter: "—", pro: "✓" },
  { feature: "Support", free: "Email", starter: "Prioritaire", pro: "Premium" },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen mesh-gradient">
      <Navbar />

      {/* ========== HERO ========== */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-20">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300">Tarification simple et transparente</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Choisissez votre </span>
              <span className="text-gradient">plan</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-4">
              Commencez gratuitement et évoluez selon vos besoins. Annulez à tout moment.
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
              <Check className="w-4 h-4" />
              <span>Pas de frais cachés • Annulation facile</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== PRICING CARDS ========== */}
      <section className="pb-20 md:pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={cardVariants}
                whileHover={!plan.disabled ? { y: -8, scale: 1.02 } : {}}
                className={`
                  relative rounded-2xl p-8 transition-all duration-300
                  ${plan.comingSoon ? "opacity-80" : ""}
                  ${
                    plan.popular
                      ? "bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20"
                      : "bg-slate-800/50 border border-slate-700/50 hover:shadow-xl hover:shadow-indigo-500/10"
                  }
                `}
              >
                {/* Badge */}
                {plan.badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                  >
                    <div className={`
                      flex items-center gap-1.5 px-4 py-1.5 rounded-full shadow-lg
                      ${plan.comingSoon 
                        ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                        : "bg-gradient-to-r from-indigo-600 to-purple-600"
                      }
                    `}>
                      {plan.comingSoon ? (
                        <Clock className="w-4 h-4 text-white" />
                      ) : (
                        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                      )}
                      <span className="text-sm font-semibold text-white">{plan.badge}</span>
                    </div>
                  </motion.div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`
                    inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4
                    bg-gradient-to-br ${plan.gradient} shadow-lg
                  `}>
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <motion.ul 
                  className="space-y-4 mb-8"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ staggerChildren: 0.05 }}
                >
                  {plan.features.map((feature, idx) => (
                    <motion.li 
                      key={idx} 
                      className="flex items-start gap-3"
                      variants={featureVariants}
                    >
                      <div
                        className={`mt-0.5 rounded-full p-1 ${
                          plan.popular ? "bg-indigo-500/20" : "bg-slate-700/50"
                        }`}
                      >
                        <Check
                          className={`w-4 h-4 ${
                            feature.highlight 
                              ? "text-emerald-400" 
                              : plan.popular 
                                ? "text-indigo-400" 
                                : "text-slate-400"
                          }`}
                        />
                      </div>
                      <span className={`text-sm ${
                        feature.highlight ? "text-white font-medium" : "text-slate-300"
                      }`}>
                        {feature.text}
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>

                {/* CTA Button */}
                {plan.external ? (
                  <a 
                    href={plan.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button 
                      variant="gradient" 
                      className="w-full" 
                      size="lg"
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                ) : (
                  <Link href={plan.disabled ? "#" : plan.href}>
                    <Button 
                      variant={plan.popular ? "gradient" : plan.disabled ? "outline" : "outline"} 
                      className={`w-full ${plan.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      size="lg"
                      disabled={plan.disabled}
                    >
                      {plan.cta}
                      {!plan.disabled && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </Link>
                )}

                {/* Coming soon note */}
                {plan.comingSoon && (
                  <p className="text-xs text-slate-500 text-center mt-4">
                    Inscrivez-vous à la newsletter pour être informé du lancement
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== COMPARISON TABLE ========== */}
      <section className="pb-20 md:pb-32 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Comparaison détaillée</h2>
            <p className="text-slate-400">Trouvez le plan qui correspond à vos besoins</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                    Fonctionnalité
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-slate-400">
                    Freemium
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-indigo-400">
                    Starter
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-amber-400">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={idx < comparisonData.length - 1 ? "border-b border-slate-700/30" : ""}
                  >
                    <td className="px-6 py-4 text-sm text-slate-300">{row.feature}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-400">{row.free}</td>
                    <td className="px-6 py-4 text-sm text-center text-white font-medium">{row.starter}</td>
                    <td className="px-6 py-4 text-sm text-center text-white font-medium">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ========== FAQ TEASER ========== */}
      <section className="pb-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 p-8 text-center"
          >
            <MessageCircle className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Des questions ?</h3>
            <p className="text-slate-400 mb-6">
              Notre équipe est là pour vous aider à choisir le plan adapté à vos besoins.
            </p>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Contactez-nous
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
