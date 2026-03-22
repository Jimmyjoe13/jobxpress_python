"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Marie L.",
    role: "Développeuse Python",
    company: "Capgemini",
    result: "CDI obtenu en 8 jours",
    avatar: "ML",
    color: "from-indigo-500 to-blue-600",
    rating: 5,
    quote:
      "J'ai reçu 12 opportunités pertinentes en une semaine. JobXpress a analysé mon CV, identifié mes points forts et rédigé des lettres bien meilleures que ce que j'aurais écrit. Entretien décroché dès le lendemain.",
  },
  {
    name: "Thomas R.",
    role: "Product Manager",
    company: "BlaBlaCar",
    result: "3 entretiens en 2 semaines",
    avatar: "TR",
    color: "from-purple-500 to-pink-600",
    rating: 5,
    quote:
      "Le scoring IA m'a évité de postuler à des offres qui ne correspondaient pas. Je me suis concentré sur les 10 meilleures au lieu de spammer 100 entreprises. Résultat : 3 entretiens qualifiés en 2 semaines.",
  },
  {
    name: "Sofia M.",
    role: "Data Scientist",
    company: "Doctolib",
    result: "Offre +15% vs poste précédent",
    avatar: "SM",
    color: "from-emerald-500 to-teal-600",
    rating: 5,
    quote:
      "Ce qui m'a convaincue c'est le système 'zéro débit sans résultat'. Aucun risque à essayer. Et en fait, ça marche vraiment — l'IA a trouvé des offres que je n'aurais jamais repérées sur LinkedIn.",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-32 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-semibold text-sm uppercase tracking-wider mb-4">
            Témoignages
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            Ils ont trouvé leur emploi
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Plus de 15 000 candidatures générées. Voici ce qu&apos;en disent nos utilisateurs.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              className="relative flex flex-col p-8 rounded-3xl bg-slate-900/60 border border-white/5 hover:border-white/10 backdrop-blur-sm transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-indigo-500/30 mb-4 flex-shrink-0" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-slate-300 text-sm leading-relaxed mb-8 flex-grow italic">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Result badge */}
              <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-bold">{t.result}</span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.role} · {t.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Global rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 text-slate-400 text-sm"
        >
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span>
            <span className="text-white font-bold">4.9/5</span> · Plus de{" "}
            <span className="text-white font-bold">1 000 avis vérifiés</span> · Satisfaction{" "}
            <span className="text-white font-bold">92%</span>
          </span>
        </motion.div>
      </div>
    </section>
  )
}
