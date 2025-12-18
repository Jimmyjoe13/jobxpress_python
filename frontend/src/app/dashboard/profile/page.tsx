"use client"

import { useState, useEffect } from "react"
import { 
  User,
  Save,
  FileText,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Settings,
  Loader2
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { AvatarUpload } from "@/components/ui/avatar-upload"
import { SkillTags } from "@/components/ui/skill-tags"
import { CVSection } from "@/components/profile/cv-section"
import { useUserProfile, ProfileUpdateData } from "@/lib/hooks/useUserProfile"

// Options pour les selects
const experienceLevels = [
  { value: "Non spécifié", label: "Non spécifié" },
  { value: "Junior", label: "Junior (0-2 ans)" },
  { value: "Confirmé", label: "Confirmé (3-5 ans)" },
  { value: "Sénior", label: "Sénior (5+ ans)" },
]

const contractTypes = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Alternance", label: "Alternance" },
  { value: "Stage", label: "Stage" },
  { value: "Freelance", label: "Freelance" },
]

const workTypes = [
  { value: "Tous", label: "Tous" },
  { value: "Full Remote", label: "Full Remote" },
  { value: "Hybride", label: "Hybride" },
  { value: "Présentiel", label: "Présentiel" },
]

// Skeleton composant inline
function ProfileSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-9 bg-slate-700 rounded-lg w-48 mb-2" />
        <div className="h-5 bg-slate-700 rounded-lg w-96" />
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="h-6 bg-slate-700 rounded-lg w-64 mb-4" />
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="h-12 bg-slate-700 rounded-xl" />
          <div className="h-12 bg-slate-700 rounded-xl" />
          <div className="h-12 bg-slate-700 rounded-xl sm:col-span-2" />
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="h-6 bg-slate-700 rounded-lg w-64 mb-4" />
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="h-12 bg-slate-700 rounded-xl" />
          <div className="h-12 bg-slate-700 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// Composant interne qui utilise le Toast
function ProfileContent() {
  const { 
    profile, 
    isLoading, 
    isSaving, 
    error,
    updateProfile,
    uploadAvatar,
    uploadCV,
    deleteAvatar,
    deleteCV
  } = useUserProfile()

  const { showToast } = useToast()
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [isCVUploading, setIsCVUploading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<ProfileUpdateData>({
    first_name: "",
    last_name: "",
    phone: "",
    job_title: "",
    location: "France",
    experience_level: "Non spécifié",
    preferred_contract_type: "CDI",
    preferred_work_type: "Tous",
    key_skills: []
  })

  // Sync form with profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        job_title: profile.job_title || "",
        location: profile.location || "France",
        experience_level: profile.experience_level || "Non spécifié",
        preferred_contract_type: profile.preferred_contract_type || "CDI",
        preferred_work_type: profile.preferred_work_type || "Tous",
        key_skills: profile.key_skills || []
      })
    }
  }, [profile])

  // Afficher les erreurs
  useEffect(() => {
    if (error) {
      showToast(error, "error")
    }
  }, [error, showToast])

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const success = await updateProfile(formData)
    
    if (success) {
      showToast("Profil mis à jour avec succès !", "success")
    } else {
      showToast("Erreur lors de la mise à jour", "error")
    }
  }

  const handleAvatarUpload = async (file: File) => {
    setIsAvatarUploading(true)
    const url = await uploadAvatar(file)
    setIsAvatarUploading(false)
    
    if (url) {
      showToast("Avatar mis à jour !", "success")
    }
  }

  const handleAvatarRemove = async () => {
    setIsAvatarUploading(true)
    const success = await deleteAvatar()
    setIsAvatarUploading(false)
    
    if (success) {
      showToast("Avatar supprimé", "success")
    }
  }

  const handleCVUpload = async (file: File) => {
    setIsCVUploading(true)
    const url = await uploadCV(file)
    setIsCVUploading(false)
    
    if (url) {
      showToast("CV uploadé avec succès !", "success")
    }
  }

  const handleCVRemove = async () => {
    setIsCVUploading(true)
    const success = await deleteCV()
    setIsCVUploading(false)
    
    if (success) {
      showToast("CV supprimé", "success")
    }
  }

  // Loading state
  if (isLoading) {
    return <ProfileSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Mon Profil</h1>
        <p className="text-slate-400">
          Gérez vos informations personnelles, professionnelles et votre CV
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 : Informations Personnelles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Ces informations seront utilisées pour personnaliser vos candidatures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Avatar */}
                <AvatarUpload
                  currentAvatarUrl={profile?.avatar_url || null}
                  firstName={formData.first_name || "U"}
                  isUploading={isAvatarUploading}
                  onUpload={handleAvatarUpload}
                  onRemove={handleAvatarRemove}
                  size="lg"
                />

                {/* Form Fields */}
                <div className="flex-1 grid sm:grid-cols-2 gap-6">
                  <Input
                    label="Prénom"
                    placeholder="Jean"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    icon={<User className="w-4 h-4" />}
                  />
                  <Input
                    label="Nom"
                    placeholder="Dupont"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    icon={<User className="w-4 h-4" />}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Email"
                      type="email"
                      placeholder="jean@exemple.com"
                      value={profile?.email || ""}
                      icon={<Mail className="w-4 h-4" />}
                      disabled
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      L&apos;email ne peut pas être modifié. Contactez le support si nécessaire.
                    </p>
                  </div>
                  <Input
                    label="Téléphone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    icon={<Phone className="w-4 h-4" />}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 2 : Informations Professionnelles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Informations professionnelles
              </CardTitle>
              <CardDescription>
                Ces données seront pré-remplies lors de vos nouvelles candidatures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <Input
                  label="Poste recherché"
                  placeholder="Développeur Full Stack"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  icon={<Briefcase className="w-4 h-4" />}
                />
                <Input
                  label="Localisation souhaitée"
                  placeholder="Paris, France"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  icon={<MapPin className="w-4 h-4" />}
                />
                <Select
                  label="Niveau d'expérience"
                  options={experienceLevels}
                  value={formData.experience_level}
                  onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 3 : CV */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Mon CV
              </CardTitle>
              <CardDescription>
                Ce CV sera utilisé automatiquement pour vos nouvelles candidatures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CVSection
                cvUrl={profile?.cv_url || null}
                cvUploadedAt={profile?.cv_uploaded_at || null}
                isUploading={isCVUploading}
                onUpload={handleCVUpload}
                onRemove={handleCVRemove}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 4 : Préférences de candidature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Préférences de candidature
              </CardTitle>
              <CardDescription>
                Définissez vos préférences par défaut pour les recherches d&apos;emploi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Select
                  label="Type de contrat préféré"
                  options={contractTypes}
                  value={formData.preferred_contract_type}
                  onChange={(e) => setFormData({ ...formData, preferred_contract_type: e.target.value })}
                />
                <Select
                  label="Mode de travail préféré"
                  options={workTypes}
                  value={formData.preferred_work_type}
                  onChange={(e) => setFormData({ ...formData, preferred_work_type: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Award className="w-4 h-4 inline mr-2" />
                  Compétences clés
                </label>
                <SkillTags
                  skills={formData.key_skills || []}
                  onChange={(skills) => setFormData({ ...formData, key_skills: skills })}
                  placeholder="Ex: React, Python, Management..."
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-end"
        >
          <Button 
            type="submit" 
            variant="gradient" 
            size="lg"
            isLoading={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder les modifications
          </Button>
        </motion.div>
      </form>
    </div>
  )
}

// Page principale avec ToastProvider
export default function ProfilePage() {
  return (
    <ToastProvider>
      <ProfileContent />
    </ToastProvider>
  )
}
