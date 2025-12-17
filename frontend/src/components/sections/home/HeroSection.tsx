"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Zap, ArrowRight, CheckCircle, Shield, Clock, Play } from "lucide-react"
import { ParticlesBackground, FloatingOrbs } from "@/components/ui/particles"

const trustIndicators = [
  { icon: CheckCircle, text: "Gratuit pour commencer" },
  { icon: Shield, text: "Données sécurisées" },
  { icon: Clock, text: "Résultats en 5 min" },
]

const stats = [
  { value: "10K+", label: "Candidatures générées" },
  { value: "85%", label: "Taux de matching" },
  { value: "< 5min", label: "Temps moyen" },
  { value: "4.9/5", label: "Satisfaction" },
]

import type { Variants } from "framer-motion"

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, type: "tween" },
  },
}

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
      {/* Animated Background */}
      <FloatingOrbs />
      <ParticlesBackground count={30} />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-8"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-300">Propulsé par l&apos;Intelligence Artificielle</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-white">Votre recherche d&apos;emploi,</span>
            <br />
            <span className="text-gradient-animated">automatisée.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            JobXpress trouve les meilleures offres, analyse leur pertinence et génère des lettres de motivation
            personnalisées.{" "}
            <span className="text-white font-semibold">En quelques minutes.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dashboard/apply"
                className="group w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
              >
                <span className="relative z-10">Lancer ma recherche</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                {/* Shine effect on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Link>
            </motion.div>
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              href="#how-it-works"
              className="group w-full sm:w-auto px-8 py-4 rounded-full text-lg font-semibold text-white border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Voir la démo
            </motion.a>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400"
          >
            {trustIndicators.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, color: "#fff" }}
                className="flex items-center gap-2 cursor-default"
              >
                <item.icon className="w-5 h-5 text-emerald-400" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="stat-card cursor-default"
            >
              <div className="text-2xl sm:text-3xl font-bold text-gradient mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
