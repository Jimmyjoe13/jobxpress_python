"use client"

// Force dynamic rendering to avoid prerendering issues with Supabase
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"
import { Stepper } from "@/components/ui/stepper"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, Loader2 } from "lucide-react"

const STEPS = [
  { title: "Informations", description: "Vos coordonnées" },
  { title: "Recherche", description: "Le poste souhaité" },
  { title: "CV", description: "Votre parcours" },
  { title: "Récapitulatif", description: "Vérification" },
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

  // Load user data on mount (only if Supabase is configured)
  useEffect(() => {
    const loadUserData = async () => {
      // Skip if Supabase is not configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return
      }
      
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Récupérer le profil complet depuis user_profiles
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
          // Sauvegarder l'ID utilisateur pour la liaison
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

  const handleSelectChange = (name: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [name]: e.target.value }))
  }

  const handleFileSelect = (file: File) => {
    setFormData(prev => ({ ...prev, cvFile: file }))
  }

  const handleFileRemove = () => {
    setFormData(prev => ({ ...prev, cvFile: null }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.firstName && formData.lastName && formData.email)
      case 1:
        return !!(formData.jobTitle && formData.location && formData.contractType && formData.experienceLevel)
      case 2:
        return !!formData.cvFile
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Upload CV to Supabase Storage (if configured)
      let cvUrl = ""
      if (formData.cvFile && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        try {
          const { createClient } = await import("@/lib/supabase/client")
          const supabase = createClient()
          
          const fileName = `${Date.now()}_${formData.cvFile.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("cvs")
            .upload(fileName, formData.cvFile)

          if (uploadError) {
            console.error("Upload error:", uploadError)
            // Continue without CV upload for now
          } else if (uploadData) {
            const { data: urlData } = supabase.storage
              .from("cvs")
              .getPublicUrl(uploadData.path)
            cvUrl = urlData.publicUrl
          }
        } catch (err) {
          console.error("CV upload failed:", err)
        }
      }

      // 2. Send data to backend API
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
        user_id: userId,  // Lien vers l'utilisateur connecté
      }

      const response = await fetch(`${apiUrl}/api/v2/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Erreur lors de la soumission")
      }

      setIsSuccess(true)
    } catch (err) {
      console.error("Submit error:", err)
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card className="border-0 shadow-xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Candidature envoyée ! 🎉
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Notre IA analyse maintenant les offres d&apos;emploi correspondant à votre profil. 
              Vous recevrez un email avec les meilleures opportunités et vos lettres de motivation personnalisées.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push("/dashboard")}>
                Retour au tableau de bord
              </Button>
              <Button variant="outline" onClick={() => {
                setIsSuccess(false)
                setCurrentStep(0)
                setFormData({
                  ...formData,
                  jobTitle: "",
                  location: "",
                  contractType: "",
                  workType: "Tous",
                  experienceLevel: "",
                  cvFile: null,
                })
              }}>
                Nouvelle recherche
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Nouvelle candidature
        </h1>
        <p className="text-gray-600">
          Remplissez le formulaire pour lancer votre recherche d&apos;emploi automatisée
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="firstName"
                  label="Prénom *"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  name="lastName"
                  label="Nom *"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <Input
                type="email"
                name="email"
                label="Email *"
                placeholder="vous@exemple.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <Input
                type="tel"
                name="phone"
                label="Téléphone"
                placeholder="+33 6 12 34 56 78"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
          )}

          {/* Step 2: Job Search Preferences */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Input
                name="jobTitle"
                label="Poste recherché *"
                placeholder="ex: Développeur Full Stack, Chef de projet..."
                value={formData.jobTitle}
                onChange={handleInputChange}
                required
              />
              <Input
                name="location"
                label="Localisation souhaitée *"
                placeholder="ex: Paris, Lyon, France..."
                value={formData.location}
                onChange={handleInputChange}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type de contrat *"
                  options={CONTRACT_OPTIONS}
                  value={formData.contractType}
                  onChange={handleSelectChange("contractType")}
                  required
                />
                <Select
                  label="Niveau d'expérience *"
                  options={EXPERIENCE_OPTIONS}
                  value={formData.experienceLevel}
                  onChange={handleSelectChange("experienceLevel")}
                  required
                />
              </div>
              <Select
                label="Mode de travail"
                options={WORK_TYPE_OPTIONS}
                value={formData.workType}
                onChange={handleSelectChange("workType")}
              />
            </div>
          )}

          {/* Step 3: CV Upload */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <FileUpload
                label="Déposez votre CV ici"
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                currentFile={formData.cvFile}
              />
              <p className="text-sm text-gray-500">
                Votre CV sera analysé par notre IA pour extraire vos compétences et expériences.
                Cela permet de mieux matcher les offres d&apos;emploi.
              </p>
            </div>
          )}

          {/* Step 4: Summary */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Récapitulatif de votre candidature
                </h4>
                
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Nom complet</span>
                    <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  {formData.phone && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-500">Téléphone</span>
                      <span className="font-medium">{formData.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Poste recherché</span>
                    <span className="font-medium">{formData.jobTitle}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Localisation</span>
                    <span className="font-medium">{formData.location}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Type de contrat</span>
                    <span className="font-medium">{formData.contractType}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Niveau d&apos;expérience</span>
                    <span className="font-medium">{formData.experienceLevel}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Mode de travail</span>
                    <span className="font-medium">{formData.workType}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">CV</span>
                    <span className="font-medium text-green-600">
                      {formData.cvFile ? `✓ ${formData.cvFile.name}` : "Non fourni"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <strong>💡 Ce qui va se passer :</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Notre IA va rechercher les meilleures offres correspondant à votre profil</li>
                  <li>Chaque offre sera analysée et scorée selon vos compétences</li>
                  <li>Une lettre de motivation personnalisée sera générée pour le meilleur match</li>
                  <li>Vous recevrez le tout par email dans quelques minutes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className={currentStep === 0 ? "invisible" : ""}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
              >
                Suivant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Lancer la recherche
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
