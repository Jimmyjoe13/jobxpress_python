"use client"

import { motion } from "framer-motion"
import { Search, Brain, FileText, Mail, ChevronRight } from "lucide-react"

const features = [
  {
    icon: Search,
    title: "Recherche Multi-Sources",
    description: "Agrégation d'offres depuis Google Jobs, Active Jobs DB et plus encore.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Brain,
    title: "Analyse IA Avancée",
    description: "Scoring intelligent basé sur vos compétences et votre expérience.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: FileText,
    title: "Lettres Personnalisées",
    description: "Génération automatique de lettres de motivation adaptées à chaque offre.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: Mail,
    title: "Livraison Email",
    description: "Recevez vos candidatures complètes directement dans votre boîte mail.",
    gradient: "from-emerald-500 to-teal-500",
  },
]

import type { Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
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

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Une solution complète pour automatiser et optimiser votre recherche d&apos;emploi
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-indigo-500/20 rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 overflow-hidden cursor-pointer"
            >
              {/* Top border glow */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              
              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              
              {/* CTA on hover */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
                className="mt-4 flex items-center text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
              >
                En savoir plus <ChevronRight className="w-4 h-4 ml-1" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
