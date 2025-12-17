"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import { Mail, MapPin, Phone, Send, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar, Footer } from "@/components/layout"

const subjects = [
  { value: "general", label: "Question générale" },
  { value: "support", label: "Support technique" },
  { value: "sales", label: "Ventes & Partenariats" },
  { value: "feedback", label: "Retour d'expérience" },
  { value: "other", label: "Autre" },
]

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "support@jobxpress.com",
    href: "mailto:support@jobxpress.com",
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: "+33 1 23 45 67 89",
    href: "tel:+33123456789",
  },
  {
    icon: MapPin,
    label: "Adresse",
    value: "42 Rue de l'Innovation\n75001 Paris, France",
    href: null,
  },
]

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

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Reset form
    setFormData({ name: "", email: "", subject: "", message: "" })
    setIsSubmitting(false)

    // You could add a toast notification here
    alert("Message envoyé avec succès !")
  }

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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300">Nous sommes là pour vous aider</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Contactez-</span>
              <span className="text-gradient">nous</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
              Une question, une suggestion ou besoin d&apos;aide ? Notre équipe vous répond sous 24h.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== CONTACT CONTENT ========== */}
      <section className="pb-20 md:pb-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid lg:grid-cols-5 gap-12"
          >
            {/* Contact Form */}
            <motion.div variants={itemVariants} className="lg:col-span-3">
              <Card variant="gradient" className="p-8">
                <CardContent className="p-0">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <Input
                        label="Nom complet"
                        placeholder="Jean Dupont"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="jean@exemple.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <Select
                      label="Sujet"
                      options={subjects}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />

                    <Textarea
                      label="Message"
                      placeholder="Comment pouvons-nous vous aider ?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      required
                    />

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        variant="gradient"
                        size="lg"
                        className="w-full sm:w-auto"
                        isLoading={isSubmitting}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer le message
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Nos coordonnées</h2>

              {contactInfo.map((info, index) => (
                <motion.div
                  key={index}
                  whileHover={{ x: 4 }}
                  transition={{ type: "tween", duration: 0.2 }}
                >
                  <Card variant="default" className="p-6">
                    <CardContent className="p-0 flex items-start gap-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0"
                      >
                        <info.icon className="w-6 h-6 text-indigo-400" />
                      </motion.div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">{info.label}</p>
                        {info.href ? (
                          <a
                            href={info.href}
                            className="text-white hover:text-indigo-400 transition-colors whitespace-pre-line"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-white whitespace-pre-line">{info.value}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Response Time */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <Card variant="glass" className="p-6">
                  <CardContent className="p-0 text-center">
                    <p className="text-slate-400 text-sm mb-2">Temps de réponse moyen</p>
                    <motion.p
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                      className="text-3xl font-bold text-gradient"
                    >
                      &lt; 24h
                    </motion.p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
