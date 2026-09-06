"use client"

import Link from "next/link"
import { useState } from "react"
import { motion, useInView } from "framer-motion"
import type { Variants } from "framer-motion"
import { useRef } from "react"
import {
  Star,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Users,
  FileText,
  ThumbsUp,
  ExternalLink,
  Quote,
} from "lucide-react"
import { Navbar, Footer } from "@/components/layout"

/* ==========================================
   ANIMATION VARIANTS
   ========================================== */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, type: "tween" },
  },
}

/* ==========================================
   DATA
   ========================================== */

const stats = [
  {
    value: "2 847+",
    label: "Candidats aidés",
    icon: Users,
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    value: "12 000+",
    label: "Lettres générées",
    icon: FileText,
    gradient: "from-purple-500 to-pink-600",
  },
  {
    value: "89%",
    label: "Satisfaction",
    icon: ThumbsUp,
    gradient: "from-cyan-500 to-indigo-600",
  },
  {
    value: "4.8/5",
    label: "Sur Trustpilot",
    icon: Star,
    gradient: "from-amber-500 to-orange-600",
    link: "https://fr.trustpilot.com/review/jobxpress.fr",
  },
]

interface Testimonial {
  name: string
  age: number
  city: string
  role: string
  initials: string
  gradient: string
  quote: string
  rating: number
  beforeAfter: string
}

const testimonials: Testimonial[] = [
  {
    name: "Marie",
    age: 28,
    city: "Lyon",
    role: "Chef de projet digital",
    initials: "ML",
    gradient: "from-indigo-500 to-purple-600",
    quote:
      "Je postulais partout sans jamais recevoir de retour. Avec JobXpress, chaque lettre était personnalisée et pertinente. En 3 semaines, j'avais 4 entretiens et décroché mon poste de chef de projet digital.",
    rating: 5,
    beforeAfter: "0 réponse → 4 entretiens en 3 semaines",
  },
  {
    name: "Thomas",
    age: 35,
    city: "Paris",
    role: "Développeur full-stack",
    initials: "TD",
    gradient: "from-cyan-500 to-blue-600",
    quote:
      "En tant que développeur, je n'avais pas le temps de rédiger des lettres pour chaque candidature. L'IA comprend exactement mon profil technique et génère des letres qui mettent en avant mes projets. Gain de temps énorme.",
    rating: 5,
    beforeAfter: "2h/candidature → 30 sec/candidature",
  },
  {
    name: "Sarah",
    age: 24,
    city: "Bordeaux",
    role: "Junior marketing",
    initials: "SG",
    gradient: "from-pink-500 to-rose-600",
    quote:
      "Je sortais d'une formation et je ne savais pas du tout comment structurer mes candidatures. JobXpress m'a aidée à mettre en valeur mes stages et mes projets. J'ai décroché mon premier CDI en marketing digital !",
    rating: 5,
    beforeAfter: "0 entretien → 3 entretiens en 2 semaines",
  },
  {
    name: "Ahmed",
    age: 32,
    city: "Marseille",
    role: "Commercial B2B",
    initials: "AH",
    gradient: "from-amber-500 to-orange-600",
    quote:
      "Je voulais changer de secteur et mes anciennes lettres ne correspondaient plus à mon parcours. L'analyse IA a su relier mes compétences commerciales aux nouveaux postes visés. Résultat : recruté en moins d'un mois.",
    rating: 4,
    beforeAfter: "0 réponse → 5 entretiens en 4 semaines",
  },
  {
    name: "Julie",
    age: 41,
    city: "Toulouse",
    role: "Responsable RH",
    initials: "JB",
    gradient: "from-emerald-500 to-teal-600",
    quote:
      "En tant que RH, je connais bien les processus de recrutement. Ce qui m'a impressionnée, c'est la qualité des lettres générées : structurées, personnalisées et avec le bon ton. Même un professionnel du recrutement serait convaincu.",
    rating: 5,
    beforeAfter: "Taux de réponse 5% → 35% en 1 mois",
  },
  {
    name: "Lucas",
    age: 22,
    city: "Nantes",
    role: "Étudiant en fin de stage",
    initials: "LW",
    gradient: "from-violet-500 to-purple-600",
    quote:
      "Je sortais de mon stage et je n'avais aucune expérience de candidature. JobXpress a transformé mon CV et mes lettres en quelque chose de professionnel. J'ai décroché mon premier emploi avant même la fin de mon stage.",
    rating: 5,
    beforeAfter: "0 candidatures réussies → 2 offres en 3 semaines",
  },
  {
    name: "Pierre",
    age: 38,
    city: "Lille",
    role: "Ingénieur en mécanique",
    initials: "PD",
    gradient: "from-sky-500 to-indigo-600",
    quote:
      "Je cherchais à évoluer vers un poste de directeur technique. Les lettres classiques ne mettaient pas en avant ma vision stratégique. L'IA a su orienter chaque candidature vers mes forces managériales. Promotion obtenue.",
    rating: 5,
    beforeAfter: "Poste actuel → Promotion en 6 semaines",
  },
  {
    name: "Camille",
    age: 29,
    city: "Strasbourg",
    role: "Chef de projet IT",
    initials: "CF",
    gradient: "from-fuchsia-500 to-pink-600",
    quote:
      "Le plus impressionnant, c'est la rapidité. En 30 secondes par candidature, j'avais une lettre sur-mesure. J'ai pu postuler à 20 postes en une seule soirée au lieu de consacrer des semaines.",
    rating: 4,
    beforeAfter: "5 candidatures/semaine → 20 candidatures/soirée",
  },
  {
    name: "Nicolas",
    age: 45,
    city: "Rennes",
    role: "Cadre en reconversion",
    initials: "NR",
    gradient: "from-rose-500 to-red-600",
    quote:
      "Après 20 ans dans l'industrie, je me lançais dans la reconversion. Sans JobXpress, je n'aurais jamais su comment réécrire mon parcours pour le secteur du conseil. L'IA a trouvé les connexions parfaites.",
    rating: 5,
    beforeAfter: "0 entretien reconversion → 3 entretiens en 1 mois",
  },
]

const faqItems = [
  {
    question: "Est-ce vraiment gratuit ?",
    answer:
      "Oui ! JobXpress propose un plan Freemium qui vous permet de générer des lettres de motivation pour vos premières candidatures sans aucun frais. Vous pouvez également passer à un plan premium pour des fonctionnalités avancées comme l'analyse CV et le coach IA.",
  },
  {
    question: "Comment l'IA génère-t-elle les lettres ?",
    answer:
      "Notre IA analyse l'offre d'emploi (compétences requises, valeurs de l'entreprise, description du poste) ainsi que votre profil (CV, expérience, compétences). Elle identifie les corrélations les plus pertinentes et rédige une lettre personnalisée avec un ton adapté.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Absolument. JobXpress est conforme au RGPD. Vos données personnelles et candidatures sont chiffrées, jamais revendues, et vous pouvez demander leur suppression à tout moment depuis votre espace personnel.",
  },
  {
    question: "Puis-je annuler à tout moment ?",
    answer:
      "Oui, sans aucun engagement. Vous pouvez résilier votre abonnement premium à tout moment depuis votre tableau de bord. Pas de frais cachés, pas de pénalité.",
  },
  {
    question: "Combien de temps pour voir des résultats ?",
    answer:
      "En moyenne, chaque candidature prend 30 secondes de votre temps. La plupart de nos utilisateurs constatent une augmentation significative des retours sous 2 à 4 semaines après avoir commencé à postuler avec JobXpress.",
  },
]

/* ==========================================
   ANIMATED COUNTER COMPONENT
   ========================================== */

function AnimatedStat({
  stat,
  index,
}: {
  stat: (typeof stats)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={
        isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30 }
      }
      transition={{ duration: 0.6, delay: index * 0.15, type: "spring", stiffness: 100 }}
      className="relative group"
    >
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center hover:border-indigo-500/50 transition-all duration-300 h-full">
        <div
          className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}
        >
          <stat.icon className="w-7 h-7 text-white" />
        </div>
        {stat.link ? (
          <a
            href={stat.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2 hover:text-indigo-400 transition-colors"
          >
            {stat.value}
            <ExternalLink className="w-4 h-4 opacity-50" />
          </a>
        ) : (
          <div className="text-3xl md:text-4xl font-bold text-white mb-2">
            {stat.value}
          </div>
        )}
        <p className="text-slate-400 text-sm">{stat.label}</p>
      </div>
    </motion.div>
  )
}

/* ==========================================
   TESTIMONIAL CARD
   ========================================== */

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={cardVariants}
      transition={{ delay: index * 0.08 }}
      className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-300 group flex flex-col h-full"
    >
      {/* Quote icon */}
      <Quote className="w-8 h-8 text-indigo-500/30 mb-4" />

      {/* Quote text */}
      <p className="text-slate-300 leading-relaxed mb-6 flex-1 text-sm md:text-base">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {/* Before / After badge */}
      <div className="mb-6 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
        <p className="text-xs font-medium text-indigo-400">
          {testimonial.beforeAfter}
        </p>
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < testimonial.rating
                ? "text-amber-400 fill-amber-400"
                : "text-slate-600"
            }`}
          />
        ))}
      </div>

      {/* Author info */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-700/50">
        {/* Avatar with initials */}
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {testimonial.initials}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">
            {testimonial.name}, {testimonial.age} ans
          </p>
          <p className="text-slate-400 text-xs">
            {testimonial.role} — {testimonial.city}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================
   FAQ ITEM
   ========================================== */

function FaqItem({
  item,
  index,
}: {
  item: (typeof faqItems)[number]
  index: number
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      variants={itemVariants}
      className="border border-slate-700/50 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-colors"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-white text-sm md:text-base pr-4">
          {item.question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-indigo-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="px-5 pb-5"
        >
          <p className="text-slate-400 text-sm leading-relaxed">
            {item.answer}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

/* ==========================================
   MAIN COMPONENT
   ========================================== */

export default function TestimonialsClient() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* ==========================================
          HERO
          ========================================== */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Ce que nos{" "}
              <span className="text-gradient">utilisateurs</span> disent de{" "}
              <span className="text-gradient">JobXpress</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
              Découvrez comment l&apos;IA transforme leur recherche d&apos;emploi.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ==========================================
          STATS SECTION
          ========================================== */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <AnimatedStat key={stat.label} stat={stat} index={index} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==========================================
          TESTIMONIALS SECTION
          ========================================== */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ils nous font{" "}
              <span className="text-gradient">confiance</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Témoignages vérifiés de candidats qui ont utilisé JobXpress pour
              booster leur recherche d&apos;emploi.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.name}
                testimonial={testimonial}
                index={index}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==========================================
          CTA SECTION
          ========================================== */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-slate-900 border border-indigo-500/30 p-12 md:p-16 text-center"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Rejoignez{" "}
                <span className="text-gradient">2 847+</span> candidats qui ont
                trouvé leur emploi avec l&apos;IA
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                Commencez gratuitement dès aujourd&apos;hui. Aucune carte bancaire
                requise.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow group"
                >
                  <span>Commencer gratuitement</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==========================================
          FAQ SECTION
          ========================================== */}
      <section className="py-16 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Questions{" "}
              <span className="text-gradient">fréquentes</span>
            </h2>
            <p className="text-slate-400">
              Tout ce que vous devez savoir sur JobXpress.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col gap-3"
          >
            {faqItems.map((item, index) => (
              <FaqItem key={item.question} item={item} index={index} />
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
