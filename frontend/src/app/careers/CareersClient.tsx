"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  Briefcase,
  Rocket,
  Heart,
  Globe,
  Shield,
  Users,
  ArrowRight,
  MapPin,
  Clock,
  Code,
  Brain,
  TrendingUp,
  Palette,
  Mail,
  Sparkles,
  Star,
  Zap,
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

/* ==========================================
   DATA
   ========================================== */

const openPositions = [
  {
    title: "Développeur Full-Stack",
    tech: "Next.js + FastAPI",
    type: "CDI",
    location: "Remote (France)",
    description:
      "Rejoignez l'équipe technique pour développer et maintenir la plateforme JobXpress.栈 full-stack avec Next.js côté frontend et FastAPI côté backend. Vous travaillerez sur des features à fort impact : moteur de recherche intelligent, intégration d'APIs, et optimisation des performances.",
    gradient: "from-indigo-500 to-blue-600",
    icon: Code,
  },
  {
    title: "Ingénieur IA / NLP",
    tech: "Python, Transformers, LangChain",
    type: "CDI",
    location: "Remote (France)",
    description:
      "Concevez et déployez les modèles d'intelligence artificielle au cœur de JobXpress. Analyse sémantique des CV, matching candidat-offre, génération de lettres de motivation personnalisées. Travaillez avec les dernières avancées en NLP et LLM.",
    gradient: "from-purple-500 to-pink-600",
    icon: Brain,
  },
  {
    title: "Growth Marketing Manager",
    tech: "SEO, SEA, Analytics",
    type: "CDI",
    location: "Paris / Remote",
    description:
      "Pilotez la stratégie d'acquisition et de croissance de JobXpress. SEO technique, content marketing, campagnes SEA et partenariats stratégiques. Vous serez au cœur de la croissance d'un produit IA qui change la recherche d'emploi.",
    gradient: "from-emerald-500 to-teal-600",
    icon: TrendingUp,
  },
  {
    title: "Designer UX/UI",
    tech: "Figma, Design System, Prototypage",
    type: "CDI",
    location: "Remote (France)",
    description:
      "Créez des expériences utilisateur fluides et intuitives pour des milliers de candidats. Design system, prototypage, tests utilisateurs. Travaillez main dans la main avec les développeurs pour donner vie à une interface moderne et accessible.",
    gradient: "from-amber-500 to-orange-600",
    icon: Palette,
  },
]

const cultureValues = [
  {
    title: "Télétravail total",
    description:
      "Travaillez depuis où vous êtes. Nous croyons que la productivité n'a pas de bureau.",
    icon: Globe,
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    title: "Flexibilité horaire",
    description:
      "Pas de pointeuse. Organisez votre temps comme vous l'entendez. Ce qui compte, c'est le résultat.",
    icon: Clock,
    gradient: "from-purple-500 to-violet-500",
  },
  {
    title: "Innovation continue",
    description:
      "20% de votre temps pour des projets personnels. Expérimentez, apprenez, innovez.",
    icon: Rocket,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    title: "Bienveillance",
    description:
      "Une culture d'entreprise basée sur le respect, la confiance et l'entraide mutuelle.",
    icon: Heart,
    gradient: "from-emerald-500 to-teal-500",
  },
]

const benefits = [
  { label: "Remote-first", icon: Globe },
  { label: "Stock options", icon: Star },
  { label: "Formation continue", icon: Zap },
  { label: "Matériel fourni", icon: Shield },
  { label: "Mutuelle", icon: Heart },
  { label: "RTT", icon: Clock },
]

/* ==========================================
   COMPONENT
   ========================================== */

export default function CareersClient() {
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
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300">
                Nous recrutons
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Rejoignez l&apos;aventure </span>
              <span className="text-gradient">JobXpress</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto">
              Nous construisons l&apos;avenir de la recherche d&apos;emploi grâce à l&apos;IA.
              Rejoignez une équipe passionnée et contribuez à un produit qui change des vies.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          NOTRE MISSION
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
                Notre <span className="text-gradient">mission</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Rendre la recherche d&apos;emploi plus rapide, plus intelligente et plus équitable pour tous.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div variants={cardVariants}>
                <Card variant="default" className="p-8 h-full text-center">
                  <CardContent className="p-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Automatisation
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      90% du processus de candidature est automatisé. Les candidats se concentrent sur l&apos;essentiel.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={cardVariants}>
                <Card variant="default" className="p-8 h-full text-center">
                  <CardContent className="p-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Brain className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      IA de pointe
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      NLP, matching intelligent, lettres personnalisées. L&apos;IA au service des candidats, jamais l&apos;inverse.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={cardVariants}>
                <Card variant="default" className="p-8 h-full text-center">
                  <CardContent className="p-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Heart className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Accessibilité
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Un plan gratuit pour toujours. Parce que l&apos;accès à l&apos;emploi ne devrait dépendre de rien d&apos;autre que de votre motivation.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          POSTES OUVERTS
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
                Postes <span className="text-gradient">ouverts</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Nous recherchons des talents qui partagent notre vision d&apos;un emploi plus accessible.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {openPositions.map((position) => (
                <motion.div
                  key={position.title}
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="group"
                >
                  <Card
                    variant="default"
                    className="p-8 h-full transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30"
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start gap-5 mb-6">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${position.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
                        >
                          <position.icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-1">
                            {position.title}
                          </h3>
                          <p className="text-indigo-400 text-sm font-medium">
                            {position.tech}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mb-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-300">
                          <Briefcase className="w-3 h-3" />
                          {position.type}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300">
                          <MapPin className="w-3 h-3" />
                          {position.location}
                        </span>
                      </div>

                      <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        {position.description}
                      </p>

                      <Link href={`mailto:careers@jobxpress.fr?subject=Candidature — ${position.title}`}>
                        <motion.div
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Button variant="gradient" size="sm" className="w-full">
                            Postuler maintenant
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </motion.div>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
          NOTRE CULTURE
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
                Notre <span className="text-gradient">culture</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Chez JobXpress, nous croyons que le meilleur travail naît de la confiance, de la flexibilité et du plaisir.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-8">
              {cultureValues.map((value) => (
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

            {/* Avantages */}
            <motion.div variants={itemVariants} className="mt-12">
              <Card variant="glass" className="p-8">
                <CardContent className="p-0">
                  <div className="flex flex-wrap justify-center gap-4">
                    {benefits.map((benefit) => (
                      <div
                        key={benefit.label}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300"
                      >
                        <benefit.icon className="w-4 h-4 text-indigo-400" />
                        {benefit.label}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Envoyez votre candidature
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Vous ne trouvez pas le poste idéal ? Envoyez-nous votre candidature spontanée.
              Nous sommes toujours à la recherche de talents exceptionnels.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:careers@jobxpress.fr?subject=Candidature spontanée — JobXpress">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="gradient" size="lg">
                    <Mail className="w-4 h-4 mr-2" />
                    careers@jobxpress.fr
                  </Button>
                </motion.div>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
