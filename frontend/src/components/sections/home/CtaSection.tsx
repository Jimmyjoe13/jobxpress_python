"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Star, ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="py-20 md:py-32 relative z-10 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
      
      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating orbs for depth */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-10 right-10 w-60 h-60 bg-cyan-400/20 rounded-full blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 mb-6 backdrop-blur-sm"
        >
          <Star className="w-4 h-4 text-yellow-300" />
          <span className="text-white/90 text-sm font-medium">
            Rejoignez des milliers de candidats satisfaits
          </span>
        </motion.div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
          Prêt à booster votre recherche d&apos;emploi ?
        </h2>

        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
          Commencez gratuitement et recevez vos premières candidatures personnalisées en moins de 5 minutes.
        </p>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-full text-lg font-bold shadow-2xl hover:shadow-white/20 transition-all group relative overflow-hidden"
          >
            <span className="relative z-10">Commencer gratuitement</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            {/* Shine effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-100 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
