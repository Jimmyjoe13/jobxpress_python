"use client"

import { motion } from "framer-motion"
import { FileText, Brain, Mail } from "lucide-react"

const steps = [
  {
    step: "1",
    title: "Complétez votre profil",
    description: "Renseignez vos informations, le poste recherché et uploadez votre CV.",
    icon: FileText,
    color: "from-indigo-500 to-blue-600",
  },
  {
    step: "2",
    title: "L'IA analyse et recherche",
    description: "Notre moteur parcourt des milliers d'offres et sélectionne les plus pertinentes.",
    icon: Brain,
    color: "from-purple-500 to-pink-600",
  },
  {
    step: "3",
    title: "Recevez vos candidatures",
    description: "Obtenez vos lettres de motivation personnalisées et les meilleures opportunités.",
    icon: Mail,
    color: "from-emerald-500 to-teal-600",
  },
]

import type { Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, type: "tween" },
  },
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 relative z-10">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold text-sm uppercase tracking-wider mb-4">
            Comment ça marche
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            3 étapes simples
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            De votre profil à vos candidatures en quelques minutes
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {steps.map((item, i) => (
            <motion.div key={i} variants={itemVariants} className="relative">
              {/* Connection Line (desktop) */}
              {i < 2 && (
                <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-px">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.2, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-slate-600 to-transparent origin-left"
                  />
                </div>
              )}

              <motion.div
                whileHover={{ y: -5 }}
                className="relative text-center cursor-default"
              >
                {/* Step Icon */}
                <div className="relative inline-flex mb-6">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 3 }}
                    className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-2xl shadow-indigo-500/20`}
                  >
                    <item.icon className="w-12 h-12 text-white" />
                  </motion.div>
                  {/* Step number badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300 }}
                    className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center text-lg font-bold text-white shadow-lg"
                  >
                    {item.step}
                  </motion.div>
                </div>

                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
