"use client"

import Link from "next/link"
import { Check, Zap, Star, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Navbar, Footer } from "@/components/layout"

const plans = [
  {
    name: "Gratuit",
    price: "0€",
    period: "pour toujours",
    description: "Parfait pour découvrir JobXpress",
    features: [
      "5 candidatures par mois",
      "Recherche de base",
      "Lettres de motivation simples",
      "Support par email",
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    popular: false,
  },
  {
    name: "Pro",
    price: "19€",
    period: "/mois",
    description: "Pour les chercheurs d'emploi sérieux",
    features: [
      "Candidatures illimitées",
      "IA avancée pour le matching",
      "Lettres personnalisées premium",
      "Analyse de CV détaillée",
      "Support prioritaire 24/7",
      "Statistiques avancées",
    ],
    cta: "Essayer Pro gratuitement",
    href: "/register?plan=pro",
    popular: true,
  },
  {
    name: "Entreprise",
    price: "49€",
    period: "/mois",
    description: "Pour les équipes et recruteurs",
    features: [
      "Tout du plan Pro",
      "Accès API complet",
      "Gestion d'équipe",
      "Onboarding personnalisé",
      "Account manager dédié",
      "SLA garanti 99.9%",
    ],
    cta: "Contacter les ventes",
    href: "/contact",
    popular: false,
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
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-slate-300">Tarification simple et transparente</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Choisissez votre </span>
              <span className="text-gradient">plan</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
              Commencez gratuitement et évoluez selon vos besoins. Annulez à tout moment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== PRICING CARDS ========== */}
      <section className="pb-20 md:pb-32 relative z-10">
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
                whileHover={{ y: -8, scale: 1.02 }}
                className={`
                  relative rounded-2xl p-8 transition-shadow duration-300
                  ${
                    plan.popular
                      ? "bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20"
                      : "bg-slate-800/50 border border-slate-700/50 hover:shadow-xl hover:shadow-indigo-500/10"
                  }
                `}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                  >
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg">
                      <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                      <span className="text-sm font-semibold text-white">Populaire</span>
                    </div>
                  </motion.div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${
                          plan.popular ? "bg-indigo-500/20" : "bg-slate-700/50"
                        }`}
                      >
                        <Check
                          className={`w-4 h-4 ${plan.popular ? "text-indigo-400" : "text-slate-400"}`}
                        />
                      </div>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href={plan.href}>
                  <Button variant={plan.popular ? "gradient" : "outline"} className="w-full" size="lg">
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* FAQ Teaser */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <p className="text-slate-400">
              Des questions ?{" "}
              <Link
                href="/contact"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
              >
                Contactez-nous
              </Link>
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
