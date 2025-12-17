"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle,
  User,
  Briefcase,
  Upload as UploadIcon,
  FileCheck,
  MapPin,
  Phone,
  Mail,
  Loader2,
} from "lucide-react"
import { Confetti } from "@/components/ui/confetti"

const stepVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, type: "tween" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

const STEPS = [
  { title: "Informations", icon: User },
  { title: "Recherche", icon: Briefcase },
  { title: "CV", icon: UploadIcon },
  { title: "Confirmation", icon: FileCheck },
]

const CONTRACT_OPTIONS = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Stage", label: "Stage" },
  { value: "Alternance", label: "Alternance" },
]

const WORK_TYPE_OPTIONS = [
  { value: "Tous", label: "Tous (peu importe)" },
  { value: "Full Remote", label: "Full Remote" },
  { value: "Hybride", label: "Hybride" },
  { value: "Présentiel", label: "Présentiel" },
]

const EXPERIENCE_OPTIONS = [
  { value: "Junior", label: "Junior (0-2 ans)" },
  { value: "Confirmé", label: "Confirmé (2-5 ans)" },
  { value: "Sénior", label: "Sénior (5+ ans)" },
]

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  location: string
  contractType: string
  workType: string
  experienceLevel: string
  cvFile: File | null
}

export default function ApplyPage() {
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    location: "",
    contractType: "",
    workType: "Tous",
    experienceLevel: "",
    cvFile: null,
  })

  useEffect(() => {
    const loadUserData = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
      
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, phone')
            .eq('id', user.id)
            .single()
          
          setFormData(prev => ({
            ...prev,
            firstName: profile?.first_name || user.user_metadata?.first_name || prev.firstName,
            lastName: profile?.last_name || user.user_metadata?.last_name || prev.lastName,
            email: user.email || prev.email,
            phone: profile?.phone || prev.phone,
          }))
          setUserId(user.id)
        }
      } catch (err) {
        console.error("Error loading user data:", err)
      }
    }
    loadUserData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, cvFile: file }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName && formData.lastName && formData.email
      case 1:
        return formData.jobTitle && formData.location && formData.contractType && formData.experienceLevel
      case 2:
        return true // CV is optional
      case 3:
        return true
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      let cvUrl = ""
      
      // Upload du CV si présent
      if (formData.cvFile) {
        console.log("📤 Upload CV:", formData.cvFile.name)
        
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          try {
            const { createClient } = await import("@/lib/supabase/client")
            const supabase = createClient()
            
            // Nom de fichier unique avec timestamp
            const sanitizedName = formData.cvFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const fileName = `${Date.now()}_${sanitizedName}`
            
            console.log("📁 Nom fichier:", fileName)
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("cvs")
              .upload(fileName, formData.cvFile, {
                cacheControl: '3600',
                upsert: false
              })

            if (uploadError) {
              console.error("❌ Erreur upload CV:", uploadError.message)
              // On continue quand même, le CV n'est pas obligatoire
            } else if (uploadData) {
              const { data: urlData } = supabase.storage.from("cvs").getPublicUrl(uploadData.path)
              cvUrl = urlData.publicUrl
              console.log("✅ CV uploadé:", cvUrl)
            }
          } catch (err) {
            console.error("❌ Exception upload CV:", err)
            // On continue sans bloquer
          }
        } else {
          console.warn("⚠️ Supabase non configuré - CV non uploadé")
        }
      } else {
        console.log("ℹ️ Pas de CV fourni")
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        job_title: formData.jobTitle,
        contract_type: formData.contractType,
        work_type: formData.workType,
        experience_level: formData.experienceLevel,
        location: formData.location,
        cv_url: cvUrl || null,
        user_id: userId,
      }

      console.log("📨 Envoi candidature:", { ...payload, cv_url: cvUrl ? "[URL]" : null })

      const response = await fetch(`${apiUrl}/api/v2/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Erreur lors de l'envoi")
      }

      console.log("✅ Candidature envoyée avec succès")
      setIsSuccess(true)
    } catch (err) {
      console.error("❌ Erreur soumission:", err)
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <Confetti active={isSuccess} />
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-3"
          >
            Candidature envoyée ! 🎉
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 mb-8 max-w-md mx-auto"
          >
            Notre IA analyse maintenant les offres d&apos;emploi correspondant à votre profil.
            Vous recevrez un email avec les meilleures opportunités.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
            >
              Retour au tableau de bord
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setIsSuccess(false)
                setCurrentStep(0)
                setFormData((prev) => ({
                  ...prev,
                  jobTitle: "",
                  location: "",
                  contractType: "",
                  workType: "Tous",
                  experienceLevel: "",
                  cvFile: null,
                }))
              }}
              className="px-6 py-3 border border-slate-600 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all"
            >
              Nouvelle recherche
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm mb-3 ml-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nouvelle recherche</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Lancez votre candidature
        </h1>
        <p className="text-slate-400">
          Remplissez le formulaire pour lancer votre recherche d&apos;emploi automatisée
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all
                    ${index < currentStep
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : index === currentStep
                      ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                    }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium hidden sm:block ${
                  index <= currentStep ? "text-white" : "text-slate-500"
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 bg-slate-800">
                  <div
                    className={`h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ${
                      index < currentStep ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Personal Info */}
        {currentStep === 0 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-white mb-6">Vos informations</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Prénom *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Jean"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nom *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Dupont"
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="vous@exemple.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Job Search */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-white mb-6">Votre recherche</h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Poste recherché *</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  placeholder="Développeur Full Stack, Data Analyst..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Localisation *</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Paris, Lyon, France..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type de contrat *</label>
                <select
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="" className="bg-slate-800">Sélectionner...</option>
                  {CONTRACT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Expérience *</label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="" className="bg-slate-800">Sélectionner...</option>
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Mode de travail</label>
              <select
                name="workType"
                value={formData.workType}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                {WORK_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: CV Upload */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-white mb-6">Votre CV</h2>
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:border-indigo-500/50 transition-colors">
              <input
                type="file"
                id="cv-upload"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="cv-upload" className="cursor-pointer">
                {formData.cvFile ? (
                  <div>
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-white font-medium mb-1">{formData.cvFile.name}</p>
                    <p className="text-sm text-slate-500 mb-4">
                      {(formData.cvFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <span className="text-sm text-indigo-400 hover:text-indigo-300">
                      Changer de fichier
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <UploadIcon className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-white font-medium mb-1">Déposez votre CV ici</p>
                    <p className="text-sm text-slate-500 mb-4">ou cliquez pour sélectionner</p>
                    <span className="text-xs text-slate-600">PDF, DOC, DOCX • Max 10MB</span>
                  </div>
                )}
              </label>
            </div>
            <p className="text-sm text-slate-400 text-center">
              Le CV est optionnel mais recommandé pour de meilleurs résultats
            </p>
          </div>
        )}

        {/* Step 3: Recap */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-white mb-6">Récapitulatif</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Informations personnelles</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Nom:</span> <span className="text-white">{formData.firstName} {formData.lastName}</span></p>
                  <p><span className="text-slate-500">Email:</span> <span className="text-white">{formData.email}</span></p>
                  {formData.phone && <p><span className="text-slate-500">Tél:</span> <span className="text-white">{formData.phone}</span></p>}
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Recherche</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Poste:</span> <span className="text-white">{formData.jobTitle}</span></p>
                  <p><span className="text-slate-500">Lieu:</span> <span className="text-white">{formData.location}</span></p>
                  <p><span className="text-slate-500">Contrat:</span> <span className="text-white">{formData.contractType}</span></p>
                  <p><span className="text-slate-500">Expérience:</span> <span className="text-white">{formData.experienceLevel}</span></p>
                  <p><span className="text-slate-500">Mode:</span> <span className="text-white">{formData.workType}</span></p>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-400 mb-3">CV</h3>
                <p className="text-sm">
                  {formData.cvFile ? (
                    <span className="text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {formData.cvFile.name}
                    </span>
                  ) : (
                    <span className="text-slate-500">Non fourni</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </button>
          
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={nextStep}
              disabled={!validateStep()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Lancer la recherche
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
