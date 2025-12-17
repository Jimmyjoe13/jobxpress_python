"use client"

import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import { Shield } from "lucide-react"
import { Navbar, Footer } from "@/components/layout"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, type: "tween" },
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen mesh-gradient">
      <Navbar />

      {/* ========== HERO ========== */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-20">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Vos données sont protégées</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Politique de </span>
              <span className="text-gradient">Confidentialité</span>
            </h1>

            <p className="text-lg text-slate-400">
              Dernière mise à jour :{" "}
              {new Date().toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== CONTENT ========== */}
      <section className="pb-20 md:pb-32 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 md:p-12"
          >
            <motion.article
              variants={itemVariants}
              className="prose prose-invert prose-slate max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-white"
            >
              <h2>1. Introduction</h2>
              <p>
                Chez JobXpress, nous prenons la protection de vos données personnelles très au
                sérieux. Cette politique de confidentialité explique comment nous collectons,
                utilisons, stockons et protégeons vos informations lorsque vous utilisez notre
                plateforme de recherche d&apos;emploi automatisée.
              </p>

              <h2>2. Données que nous collectons</h2>
              <p>Nous collectons les types de données suivants :</p>
              <ul>
                <li>
                  <strong>Informations d&apos;identification :</strong> nom, prénom, adresse email
                </li>
                <li>
                  <strong>Données professionnelles :</strong> CV, lettres de motivation, expériences
                </li>
                <li>
                  <strong>Données de recherche :</strong> critères de recherche d&apos;emploi,
                  préférences
                </li>
                <li>
                  <strong>Données techniques :</strong> adresse IP, type de navigateur, cookies
                </li>
              </ul>

              <h2>3. Utilisation des données</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul>
                <li>Fournir nos services de recherche d&apos;emploi automatisée</li>
                <li>Générer des lettres de motivation personnalisées</li>
                <li>Améliorer la pertinence des offres proposées</li>
                <li>Communiquer avec vous concernant votre compte</li>
                <li>Analyser et améliorer nos services</li>
              </ul>

              <h2>4. Protection des données</h2>
              <p>
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles
                appropriées pour protéger vos données contre tout accès non autorisé, modification,
                divulgation ou destruction. Cela inclut le chiffrement des données sensibles, des
                contrôles d&apos;accès stricts et des audits de sécurité réguliers.
              </p>

              <h2>5. Partage des données</h2>
              <p>
                Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos
                informations avec des tiers uniquement dans les cas suivants :
              </p>
              <ul>
                <li>Avec votre consentement explicite</li>
                <li>Pour fournir nos services (ex: envoi d&apos;emails)</li>
                <li>Pour respecter nos obligations légales</li>
                <li>Pour protéger nos droits et notre sécurité</li>
              </ul>

              <h2>6. Vos droits</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul>
                <li>
                  <strong>Accès :</strong> obtenir une copie de vos données
                </li>
                <li>
                  <strong>Rectification :</strong> corriger vos données inexactes
                </li>
                <li>
                  <strong>Suppression :</strong> demander l&apos;effacement de vos données
                </li>
                <li>
                  <strong>Portabilité :</strong> recevoir vos données dans un format structuré
                </li>
                <li>
                  <strong>Opposition :</strong> vous opposer au traitement de vos données
                </li>
              </ul>

              <h2>7. Cookies</h2>
              <p>
                Nous utilisons des cookies essentiels pour le fonctionnement de notre plateforme et
                des cookies analytiques pour améliorer nos services. Vous pouvez gérer vos
                préférences de cookies à tout moment via les paramètres de votre navigateur.
              </p>

              <h2>8. Conservation des données</h2>
              <p>
                Nous conservons vos données aussi longtemps que votre compte est actif ou que
                nécessaire pour vous fournir nos services. Vous pouvez demander la suppression de
                votre compte et de vos données à tout moment.
              </p>

              <h2>9. Contact</h2>
              <p>
                Pour toute question concernant cette politique de confidentialité ou pour exercer
                vos droits, contactez-nous à :{" "}
                <a
                  href="mailto:privacy@jobxpress.com"
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  privacy@jobxpress.com
                </a>
              </p>
            </motion.article>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
