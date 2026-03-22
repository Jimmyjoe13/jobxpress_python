"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus } from "lucide-react"

const faqs = [
  {
    question: "JobXpress est-il vraiment gratuit ?",
    answer:
      "Oui. Le plan Freemium inclut 5 crédits par semaine, sans carte bancaire requise. Vous pouvez générer vos premières candidatures et tester toutes les fonctionnalités avant de décider d'upgrader.",
  },
  {
    question: "Comment fonctionne le système de crédits ?",
    answer:
      "Chaque analyse d'offre et génération de lettre consomme 1 crédit. Grâce à notre règle \"No cure, no pay\", vos crédits ne sont débités que si l'IA identifie des opportunités réelles correspondant à votre profil. Zéro résultat = zéro débit.",
  },
  {
    question: "Quelle différence avec Indeed ou LinkedIn ?",
    answer:
      "Indeed et LinkedIn vous listent des offres. JobXpress va plus loin : il analyse chaque offre par rapport à votre CV, score votre compatibilité en pourcentage, et génère une lettre de motivation personnalisée pour chaque poste pertinent. Vous ne lisez plus des centaines d'offres — vous recevez vos meilleures candidatures prêtes à envoyer.",
  },
  {
    question: "Mes données de CV sont-elles sécurisées ?",
    answer:
      "Vos données sont chiffrées en transit et au repos. Elles ne sont jamais partagées avec des tiers ni utilisées pour entraîner des modèles d'IA. Vous pouvez supprimer votre compte et toutes vos données à tout moment depuis les paramètres.",
  },
  {
    question: "JobXpress fonctionne-t-il pour tous les secteurs ?",
    answer:
      "Oui. Le moteur IA est généraliste et s'adapte à tous les secteurs : tech, marketing, finance, santé, commerce, industrie, etc. Plus votre profil est renseigné, plus le scoring est précis.",
  },
  {
    question: "Comment sont générées les lettres de motivation ?",
    answer:
      "L'IA analyse simultanément la fiche de poste et votre CV pour identifier les correspondances clés. Elle rédige ensuite une lettre structurée (accroche personnalisée, mise en valeur de vos compétences, conclusion engageante) en adaptant le ton à l'entreprise et au secteur.",
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer:
      "Absolument. Aucun engagement, aucun préavis. Vous pouvez annuler depuis votre espace de gestion de compte en un clic. Votre abonnement reste actif jusqu'à la fin de la période en cours.",
  },
  {
    question: "Que se passe-t-il si aucune offre ne correspond à mon profil ?",
    answer:
      "C'est là qu'entre en jeu notre règle No Cure No Pay : si l'IA ne trouve aucune opportunité pertinente pour votre recherche, aucun crédit ne vous est débité. Vous êtes protégé contre les recherches infructueuses.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <section id="faq" className="py-20 md:py-32 relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            Questions fréquentes
          </h2>
          <p className="text-slate-400 text-lg">
            Tout ce que vous devez savoir avant de commencer.
          </p>
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="space-y-3"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/3 transition-colors"
              >
                <span className="text-white font-medium text-sm sm:text-base leading-snug">
                  {faq.question}
                </span>
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  {openIndex === i ? (
                    <Minus className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
