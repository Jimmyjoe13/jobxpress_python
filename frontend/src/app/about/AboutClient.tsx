"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  Rocket,
  Clock,
  Zap,
  Shield,
  Eye,
  Heart,
  Users,
  Bot,
  ArrowRight,
  Target,
  TrendingUp,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar, Footer } from "@/components/layout"

/* ==========================================
   ANIMATION VARIANTS
   ========================================== */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, type: "tween" },
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

const statVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, type: "spring", stiffness: 200 },
  },
}

/* ==========================================
   DATA
   ========================================== */

const teamMembers = [
  {
    name: "Jimmy Khotsombat",
    role: "Fondateur & CEO",
    description:
      "Passionné par la tech et l'IA, Jimmy a fondé JobXpress pour résoudre un problème qu'il a lui-même vécu : la recherche d'emploi est trop longue, trop stressante et trop souvent inefficace.",
    icon: Target,
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    name: "JobyJoba",
    role: "Coach personnel IA",
    description:
      "L'intelligence artificielle de JobXpress, formée pour comprendre vos compétences, vos envies et vous accompagner dans chaque étape de votre recherche d'emploi.",
    icon: Bot,
    gradient: "from-purple-500 to-pink-600",
  },
  {
    name: "Équipe technique",
    role: "Développement & Innovation",
    description:
      "Une équipe dédiée qui travaille chaque jour à améliorer les algorithmes, la pertinence des résultats et l'expérience utilisateur de JobXpress.",
    icon: Users,
    gradient: "from-cyan-500 to-blue-600",
  },
]

const values = [
  {
    title: "Accessibilité",
    description:
      "Un plan gratuit pour toujours. Parce que l'accès à l'emploi ne devrait dépendre de rien d'autre que de votre motivation.",
    icon: Globe,
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    title: "Transparence",
    description:
      "Tarification claire, sans frais cachés. Vous savez exactement ce que vous payez et pourquoi.",
    icon: Eye,
    gradient: "from-purple-500 to-violet-500",
  },
  {
    title: "Innovation",
    description:
      "IA de pointe au service des candidats. Nous repoussons constamment les limites de ce que la technologie peut faire pour votre carrière.",
    icon: Rocket,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    title: "Respect",
    description:
      "Vos données vous appartiennent. Conformité RGPD totale, zéro revente, zéro exploitation. Votre vie privée est sacrée.",
    icon: Shield,
    gradient: "from-emerald-500 to-teal-500",
  },
]

const stats = [
  {
    value: "0€",
    label: "pour démarrer",
    description: "Plan gratuit illimité",
    icon: Zap,
  },
  {
    value: "30s",
    label: "par candidature",
    description: "Automatisé de bout en bout",
    icon: Clock,
  },
  {
    value: "10x",
    label: "plus rapide",
    description: "Qu'une recherche manuelle",
    icon: TrendingUp,
  },
  {
    value: "90%",
    label: "automatisé",
    description: "Du processus de candidature",
    icon: Heart,
  },
]

/* ==========================================
   COMPONENT
   ========================================== */

export default function AboutClient() {
  return (
    <div className="min-h-screen mesh-gradient">
      <Navbar />

      {/* ==============================
          HERO
          ============================== */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-20">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
              <Rocket className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300">
                Notre histoire, notre mission
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">
                Notre mission : rendre l&apos;emploi{" "}
              </span>
              <span className="text-gradient">accessible à tous</span>
              <span className="text-white"> grâce à l&apos;IA</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto">
              Nous croyons que chaque candidat mérite un outil puissant, équitable
              et gratuit pour trouver le job de ses rêves.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          NOTRE HISTOIRE
          ============================== */}
      <section className="py-20 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Notre <span className="text-gradient">histoire</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Comment une frustration personnelle est devenue une mission
                collective.
              </p>
            </motion.div>

            <div className="space-y-8">
              {/* Fondation */}
              <motion.div variants={itemVariants}>
                <Card variant="gradient" className="p-8">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Target className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Fondé en 2026 par Jimmy Khotsombat
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                          La vision : révolutionner la recherche d&apos;emploi en
                          utilisant l&apos;intelligence artificielle non pas pour
                          remplacer les candidats, mais pour leur donner un avantage
                          décisif dans un processus souvent décourageant.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Problème */}
              <motion.div variants={itemVariants}>
                <Card variant="default" className="p-8">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Clock className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Le problème que nous résolvons
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                          Les candidats perdent en moyenne{" "}
                          <span className="text-white font-semibold">
                            15 heures par semaine
                          </span>{" "}
                          à chercher des offres, adapter leur CV et rédiger des
                          lettres de motivation. Un processus répétitif, chronophage
                          et souvent décourageant.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Solution */}
              <motion.div variants={itemVariants}>
                <Card variant="glass" className="p-8">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Zap className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Notre solution : JobXpress
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                          JobXpress automatise{" "}
                          <span className="text-emerald-400 font-semibold">
                            90% du processus
                          </span>
                          . Recherche d&apos;emploi intelligente, lettres de motivation
                          personnalisées, candidatures en un clic. Vous concentrez
                          votre énergie là où ça compte : préparer vos entretiens.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          L'ÉQUIPE
          ============================== */}
      <section className="py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                L&apos;<span className="text-gradient">équipe</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Des passionnés et une IA au service de votre réussite.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <motion.div
                  key={member.name}
                  variants={cardVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group"
                >
                  <Card
                    variant="default"
                    className="p-8 h-full transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30"
                  >
                    <CardContent className="p-0 text-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg`}
                      >
                        <member.icon className="w-8 h-8 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-semibold text-white mb-1">
                        {member.name}
                      </h3>
                      <p className="text-indigo-400 text-sm font-medium mb-4">
                        {member.role}
                      </p>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {member.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          NOS VALEURS
          ============================== */}
      <section className="py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Nos <span className="text-gradient">valeurs</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Ce qui guide chaque décision, chaque feature, chaque ligne de code.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-8">
              {values.map((value) => (
                <motion.div
                  key={value.title}
                  variants={cardVariants}
                  whileHover={{ y: -4 }}
                >
                  <Card variant="default" className="p-8 h-full">
                    <CardContent className="p-0">
                      <div className="flex items-start gap-5">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
                        >
                          <value.icon className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {value.title}
                          </h3>
                          <p className="text-slate-400 text-sm leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          LES CHIFFRES
          ============================== */}
      <section className="py-20 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Les <span className="text-gradient">chiffres</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                JobXpress en quelques données concrètes.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={statVariants}
                  whileHover={{ y: -4, scale: 1.05 }}
                >
                  <Card variant="glass" className="p-6 text-center h-full">
                    <CardContent className="p-0">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          delay: 0.2,
                          type: "spring",
                          stiffness: 300,
                        }}
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4"
                      >
                        <stat.icon className="w-6 h-6 text-indigo-400" />
                      </motion.div>
                      <p className="text-3xl sm:text-4xl font-bold text-gradient mb-1">
                        {stat.value}
                      </p>
                      <p className="text-white text-sm font-medium mb-1">
                        {stat.label}
                      </p>
                      <p className="text-slate-500 text-xs">{stat.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          CTA
          ============================== */}
      <section className="py-20 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 p-8 md:p-12 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Prêt à transformer votre recherche d&apos;emploi ?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Rejoignez les milliers de candidats qui utilisent déjà JobXpress pour
              trouver leur prochain emploi. Gratuit, sans engagement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="gradient" size="lg">
                    Commencer gratuitement
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/contact">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="outline" size="lg">
                    Nous contacter
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
