"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
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
  Search,
  ListChecks,
  Filter,
  AlertTriangle,
  FileText,
} from "lucide-react"
import { Confetti } from "@/components/ui/confetti"
import { JobResultCard, JobResultCardSkeleton } from "@/components/jobs/job-result-card"
import { NoCreditsModal } from "@/components/ui/no-credits-modal"
import { 
  startSearch, 
  getSearchResults, 
  selectJobs,
  getCredits,
  SearchStartRequest,
  JobResultItem,
  JobFilters,
  getAuthToken
} from "@/lib/api"

// Steps du workflow V2
const STEPS = [
  { title: "Informations", icon: User },
  { title: "Recherche", icon: Briefcase },
  { title: "Filtres", icon: Filter },
  { title: "CV", icon: UploadIcon },
  { title: "Résultats", icon: Search },
  { title: "Sélection", icon: ListChecks },
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
  cvUrl: string
  // Filtres avancés
  excludeAgencies: boolean
  maxDaysOld: number
  remoteOnly: boolean
}

export default function ApplyPage() {
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // États V2
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<JobResultItem[]>([])
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false)
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  
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
    cvUrl: "",
    // Filtres avancés
    excludeAgencies: true,
    maxDaysOld: 14,
    remoteOnly: false,
  })

  // Charger les données utilisateur et le profil complet
  useEffect(() => {
    const loadUserData = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
      
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setUserId(user.id)
          
          // Charger le profil complet depuis l'API pour pré-remplir le formulaire
          const token = await getAuthToken()
          if (token) {
            try {
              const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
              const response = await fetch(`${API_BASE_URL}/api/v2/profile`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              
              if (response.ok) {
                const profileData = await response.json()
                
                // Pré-remplir tous les champs avec les données du profil
                const hasProfileData = profileData.job_title || profileData.location || profileData.preferred_contract_type
                
                setFormData(prev => ({
                  ...prev,
                  // Infos personnelles
                  firstName: profileData.first_name || user.user_metadata?.first_name || prev.firstName,
                  lastName: profileData.last_name || user.user_metadata?.last_name || prev.lastName,
                  email: profileData.email || user.email || prev.email,
                  phone: profileData.phone || prev.phone,
                  // Préférences de recherche du profil
                  jobTitle: profileData.job_title || prev.jobTitle,
                  location: profileData.location || prev.location,
                  contractType: profileData.preferred_contract_type || prev.contractType,
                  workType: profileData.preferred_work_type || prev.workType,
                  experienceLevel: profileData.experience_level || prev.experienceLevel,
                  // CV existant du profil
                  cvUrl: profileData.cv_url || prev.cvUrl,
                }))
                
                if (hasProfileData) {
                  setProfileLoaded(true)
                }
              }
            } catch (profileErr) {
              console.error("Error loading profile:", profileErr)
              // Fallback: utiliser les métadonnées utilisateur Supabase
              setFormData(prev => ({
                ...prev,
                firstName: user.user_metadata?.first_name || prev.firstName,
                lastName: user.user_metadata?.last_name || prev.lastName,
                email: user.email || prev.email,
              }))
            }
          } else {
            // Pas de token, utiliser les métadonnées utilisateur
            setFormData(prev => ({
              ...prev,
              firstName: user.user_metadata?.first_name || prev.firstName,
              lastName: user.user_metadata?.last_name || prev.lastName,
              email: user.email || prev.email,
            }))
          }
        }
        
        // Charger les crédits
        try {
          const credits = await getCredits()
          setUserCredits(credits.credits)
        } catch (creditErr) {
          console.error("Error loading credits:", creditErr)
        }
      } catch (err) {
        console.error("Error loading user data:", err)
      }
    }
    loadUserData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, cvFile: file }))
    
    // Upload du CV si fichier sélectionné
    if (file && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        
        const { data, error } = await supabase.storage
          .from("cvs")
          .upload(fileName, file)
        
        if (error) throw error
        
        const { data: urlData } = supabase.storage.from("cvs").getPublicUrl(data.path)
        setFormData(prev => ({ ...prev, cvUrl: urlData.publicUrl }))
      } catch (err) {
        console.error("Erreur upload CV:", err)
      }
    }
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
      case 0: return formData.firstName && formData.lastName && formData.email
      case 1: return formData.jobTitle && formData.location && formData.contractType && formData.experienceLevel
      case 2: return true // Filtres optionnels
      case 3: return true // CV optionnel
      case 4: return searchResults.length > 0 // Résultats reçus
      case 5: return selectedJobIds.size >= 1 && selectedJobIds.size <= 5
      default: return false
    }
  }

  // Lancer la recherche V2
  const handleStartSearch = async () => {
    // Vérifier les crédits
    if (userCredits !== null && userCredits < 1) {
      setShowNoCreditsModal(true)
      return
    }

    setIsSubmitting(true)
    setError(null)
    setIsSearching(true)

    try {
      const filters: JobFilters = {
        exclude_agencies: formData.excludeAgencies,
        max_days_old: formData.maxDaysOld,
        remote_only: formData.remoteOnly,
      }

      const request: SearchStartRequest = {
        job_title: formData.jobTitle,
        location: formData.location,
        contract_type: formData.contractType,
        work_type: formData.workType,
        experience_level: formData.experienceLevel,
        filters,
        cv_url: formData.cvUrl || undefined,
        // Infos candidat pour l'email
        candidate_email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || undefined,
      }

      const response = await startSearch(request)
      setApplicationId(response.application_id)
      setUserCredits(response.credits_remaining)
      
      // Passer à l'étape 4 (Résultats) et commencer le polling
      setCurrentStep(4)
      pollForResults(response.application_id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la recherche"
      
      if (errorMessage.includes("402") || errorMessage.includes("Crédits")) {
        setShowNoCreditsModal(true)
      } else {
        setError(errorMessage)
      }
      setIsSearching(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Polling des résultats
  const pollForResults = useCallback(async (appId: string) => {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      try {
        const results = await getSearchResults(appId)
        
        if (results.status === "SEARCHING") {
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000) // Poll toutes les 2 secondes
          } else {
            setError("La recherche prend trop de temps. Réessayez plus tard.")
            setIsSearching(false)
          }
        } else if (results.status === "WAITING_SELECTION") {
          setSearchResults(results.jobs)
          setIsSearching(false)
          // Passer à l'étape de sélection
          setCurrentStep(5)
        } else if (results.status === "FAILED") {
          setError(results.message || "Aucune offre trouvée")
          setIsSearching(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de récupération des résultats")
        setIsSearching(false)
      }
    }

    poll()
  }, [])

  // Sélectionner/Désélectionner une offre
  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else if (newSet.size < 5) {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  // Confirmer la sélection
  const handleConfirmSelection = async () => {
    if (!applicationId || selectedJobIds.size === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      await selectJobs(applicationId, Array.from(selectedJobIds))
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sélection")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Écran de succès
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
            Candidature lancée ! 🎉
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 mb-8 max-w-md mx-auto"
          >
            Notre IA analyse les {selectedJobIds.size} offre(s) sélectionnée(s) et génère votre lettre de motivation personnalisée.
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
                setSearchResults([])
                setSelectedJobIds(new Set())
                setApplicationId(null)
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
      className="max-w-3xl mx-auto"
    >
      {/* Modal No Credits */}
      <NoCreditsModal 
        isOpen={showNoCreditsModal} 
        onClose={() => setShowNoCreditsModal(false)} 
      />

      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour
        </Link>
        <div className="flex items-center gap-3 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workflow V2</span>
          </div>
          {userCredits !== null && (
            <span className="text-sm text-slate-500">
              {userCredits} crédit{userCredits !== 1 ? 's' : ''} restant{userCredits !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Lancez votre candidature
        </h1>
        <p className="text-slate-400">
          Recherchez, sélectionnez et générez des candidatures personnalisées
        </p>
      </div>

      {/* Profile Loaded Banner */}
      {profileLoaded && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-emerald-400 font-medium text-sm">
              Préférences chargées depuis votre profil
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              Vos critères de recherche habituels ont été pré-remplis automatiquement
            </p>
          </div>
          <Link 
            href="/dashboard/profile" 
            className="text-sm text-emerald-400 hover:text-emerald-300 underline hover:no-underline transition-colors whitespace-nowrap"
          >
            Modifier le profil
          </Link>
        </motion.div>
      )}

      {/* Stepper */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-max">
          {STEPS.map((step, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
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
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 0: Personal Info */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
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
            </motion.div>
          )}

          {/* Step 1: Job Search */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
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
            </motion.div>
          )}

          {/* Step 2: Filters */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Filtres avancés</h2>
              <p className="text-sm text-slate-400 mb-4">
                Affinez votre recherche pour obtenir des résultats plus pertinents
              </p>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    name="excludeAgencies"
                    checked={formData.excludeAgencies}
                    onChange={handleInputChange}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/50"
                  />
                  <div>
                    <span className="text-white font-medium">Exclure les cabinets de recrutement</span>
                    <p className="text-sm text-slate-500">Ne garder que les offres directes des entreprises</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    name="remoteOnly"
                    checked={formData.remoteOnly}
                    onChange={handleInputChange}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/50"
                  />
                  <div>
                    <span className="text-white font-medium">Remote uniquement</span>
                    <p className="text-sm text-slate-500">Afficher seulement les postes en télétravail</p>
                  </div>
                </label>
                
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <label className="block text-white font-medium mb-2">
                    Ancienneté max des offres: <span className="text-indigo-400">{formData.maxDaysOld} jours</span>
                  </label>
                  <input
                    type="range"
                    name="maxDaysOld"
                    min="1"
                    max="30"
                    value={formData.maxDaysOld}
                    onChange={handleInputChange}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1 jour</span>
                    <span>30 jours</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: CV Upload */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Votre CV</h2>
              
              {/* CV existant du profil */}
              {formData.cvUrl && !formData.cvFile && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">CV du profil détecté</p>
                      <p className="text-sm text-slate-400">Votre CV sera utilisé automatiquement pour cette candidature</p>
                    </div>
                    <a
                      href={formData.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:text-indigo-300 underline hover:no-underline transition-colors"
                    >
                      Voir
                    </a>
                  </div>
                </motion.div>
              )}
              
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
                      <p className="text-white font-medium mb-1">
                        {formData.cvUrl ? "Uploader un autre CV" : "Déposez votre CV ici"}
                      </p>
                      <p className="text-sm text-slate-500 mb-4">ou cliquez pour sélectionner</p>
                      <span className="text-xs text-slate-600">PDF, DOC, DOCX • Max 10MB</span>
                    </div>
                  )}
                </label>
              </div>
              <p className="text-sm text-slate-400 text-center">
                {formData.cvUrl && !formData.cvFile 
                  ? "Vous pouvez continuer avec votre CV existant ou en uploader un nouveau"
                  : "Le CV est optionnel mais recommandé pour de meilleurs résultats"
                }
              </p>
            </motion.div>
          )}

          {/* Step 4: Searching/Loading */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center py-12"
            >
              {isSearching ? (
                <>
                  <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Recherche en cours...</h2>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Notre IA analyse les offres d&apos;emploi correspondant à votre profil. 
                    Cela peut prendre quelques secondes.
                  </p>
                  <div className="mt-8 space-y-3 max-w-sm mx-auto">
                    <JobResultCardSkeleton />
                    <JobResultCardSkeleton />
                    <JobResultCardSkeleton />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-white mb-6">
                    Prêt à lancer la recherche ?
                  </h2>
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-6 max-w-sm mx-auto text-left">
                    <p className="text-sm text-slate-400 mb-2">Récapitulatif:</p>
                    <p className="text-white">{formData.jobTitle}</p>
                    <p className="text-sm text-slate-500">{formData.location} • {formData.contractType}</p>
                  </div>
                  <button
                    onClick={handleStartSearch}
                    disabled={isSubmitting}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Lancement...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Lancer la recherche
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-500 mt-4">
                    Coût: 1 crédit (débité seulement si résultats trouvés)
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* Step 5: Selection */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Sélectionnez vos offres</h2>
                  <p className="text-sm text-slate-400">
                    {searchResults.length} offre(s) trouvée(s) • Sélectionnez 1 à 5 offres
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${
                    selectedJobIds.size >= 1 && selectedJobIds.size <= 5 ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {selectedJobIds.size}/5
                  </span>
                  <p className="text-xs text-slate-500">sélectionnée(s)</p>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {searchResults.map((job) => (
                  <JobResultCard
                    key={job.id}
                    job={job}
                    selected={selectedJobIds.has(job.id)}
                    onToggle={() => toggleJobSelection(job.id)}
                    disabled={!selectedJobIds.has(job.id) && selectedJobIds.size >= 5}
                  />
                ))}
              </div>

              {searchResults.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400">Aucune offre n&apos;a été trouvée.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
          <button
            onClick={prevStep}
            disabled={currentStep === 0 || isSearching}
            className="flex items-center gap-2 px-5 py-2.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </button>
          
          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              disabled={!validateStep()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : currentStep === 3 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
            >
              Continuer
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : currentStep === 5 ? (
            <button
              onClick={handleConfirmSelection}
              disabled={!validateStep() || isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirmer ({selectedJobIds.size} offre{selectedJobIds.size > 1 ? 's' : ''})
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
