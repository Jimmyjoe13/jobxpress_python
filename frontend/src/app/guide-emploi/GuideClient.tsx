"use client"

import { useState } from "react"
import { motion, type Variants } from "framer-motion"
import {
  BookOpen,
  FileText,
  Bot,
  Linkedin,
  Presentation,
  DollarSign,
  RefreshCcw,
  UserCheck,
  AlertTriangle,
  CalendarCheck,
  Mail,
  Download,
  Star,
  Quote,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar, Footer } from "@/components/layout"

/* ───────────────────── Data ───────────────────── */

const chapters = [
  { icon: FileText, title: "Optimiser son CV pour les robots ATS" },
  { icon: BookOpen, title: "Rédiger une lettre de motivation qui sort du lot" },
  { icon: Bot, title: "Utiliser l'IA pour accélérer sa recherche" },
  { icon: Linkedin, title: "Maîtriser LinkedIn et les réseaux professionnels" },
  { icon: Presentation, title: "Préparer et réussir son entretien" },
  { icon: DollarSign, title: "Négocier son salaire comme un pro" },
  { icon: RefreshCcw, title: "Gérer les refus et rebondir" },
  { icon: UserCheck, title: "Créer sa marque personnelle" },
  { icon: AlertTriangle, title: "Les erreurs fatales à éviter" },
  { icon: CalendarCheck, title: "Plan d'action sur 30 jours" },
]

const testimonials = [
  {
    quote: "Grâce au guide, j'ai décroché 3 entretiens en 2 semaines. Les conseils sur le CV ATS sont incroyablement efficaces.",
    name: "Marie",
    age: 28,
    role: "Chargée de marketing digital",
  },
  {
    quote: "Les conseils sur l'IA m'ont fait gagner 10h par semaine dans ma recherche d'emploi. Un vrai game-changer.",
    name: "Thomas",
    age: 35,
    role: "Développeur full-stack",
  },
  {
    quote: "Le plan d'action sur 30 jours est une pépite. J'ai enfin une méthode claire et structurée pour ma candidature.",
    name: "Sarah",
    age: 24,
    role: "Candidate junior en RH",
  },
]

/* ───────────────────── Animations ───────────────────── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const chapterVariant: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, type: "tween" } },
}

/* ───────────────────── Component ───────────────────── */

export default function GuideClient() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedFor, setSubmittedFor] = useState<"hero" | "cta" | null>(null)

  const handleSubmit = (where: "hero" | "cta") => {
    if (!email) return
    setIsSubmitting(true)

    // Simulate POST
    setTimeout(() => {
      setSubmitted(true)
      setSubmittedFor(where)
      setIsSubmitting(false)
      setEmail("")
    }, 800)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-purple-600/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-8">
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Guide gratuit</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
              <span className="text-white">Le Guide Complet pour </span>
              <span className="text-gradient">Trouver un Emploi</span>
              <span className="text-white"> en 2026</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Les 10 stratégies qui fonctionnent vraiment, testées par des milliers de candidats.
              <br className="hidden sm:block" />
              <span className="text-slate-300 font-medium">+30 pages de conseils concrets.</span>
            </p>

            {/* CTA Form */}
            {submitted && submittedFor === "hero" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30"
              >
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">
                  Merci ! Le guide arrive dans votre boîte mail.
                </span>
              </motion.div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit("hero")
                }}
                className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  disabled={isSubmitting}
                  className="whitespace-nowrap px-8"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi…
                    </span>
                  ) : (
                    <>
                      Recevoir le guide
                      <Download className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Trust signal */}
            <p className="mt-6 text-sm text-slate-500">
              <span className="text-emerald-500">✓</span> 2 847 personnes l'ont déjà téléchargé
            </p>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ CHAPTERS ════════════════════════ */}
      <section className="py-20 md:py-28 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ce que vous allez apprendre
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              10 chapitres essentiels pour transformer votre recherche d'emploi.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {chapters.map((ch, i) => (
              <motion.div
                key={i}
                variants={chapterVariant}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group flex items-start gap-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/40 hover:border-indigo-500/40 hover:bg-slate-800/60 backdrop-blur-sm transition-all duration-300"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                  <ch.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Chapitre {i + 1}
                  </span>
                  <h3 className="text-white font-medium mt-0.5 text-sm leading-snug">
                    {ch.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ TESTIMONIALS ════════════════════════ */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-900/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ils ont téléchargé le guide
            </h2>
            <p className="text-slate-400 text-lg">
              Découvrez les retours de candidats qui ont appliqué nos conseils.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="relative p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm hover:border-indigo-500/40 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-indigo-500/30 mb-3" />

                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-700/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {t.name}, {t.age} ans
                    </p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ FINAL CTA ════════════════════════ */}
      <section className="py-20 md:py-28 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Card background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-sm" />
            <div className="absolute inset-0 border border-indigo-500/20 rounded-3xl" />

            <div className="relative z-10 p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-lg shadow-indigo-500/30">
                <BookOpen className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Recevez le guide gratuit par email
              </h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                30 pages de conseils pratiques, directement dans votre boîte mail. Aucun spam, promis.
              </p>

              {submitted && submittedFor === "cta" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30"
                >
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">
                    Merci ! Le guide arrive dans votre boîte mail.
                  </span>
                </motion.div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSubmit("cta")
                  }}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="gradient"
                    size="lg"
                    disabled={isSubmitting}
                    className="whitespace-nowrap px-8"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi…
                      </span>
                    ) : (
                      <>
                        Recevoir le guide
                        <Download className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ LEGAL FOOTER ════════════════════════ */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-slate-600 leading-relaxed">
            En vous inscrivant, vous acceptez de recevoir nos emails. Vous pouvez vous désinscrire à
            tout moment. Nous ne revendons jamais vos données personnelles.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
