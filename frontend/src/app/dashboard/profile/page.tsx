"use client"

import { useState, useEffect, useRef } from "react"
import { 
  User,
  Camera,
  Save,
  FileText,
  Mail,
  Loader2
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { FileUpload } from "@/components/ui/file-upload"

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  })

  useEffect(() => {
    const loadUserData = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setIsLoading(false)
        return
      }
      
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setFormData({
            firstName: user.user_metadata?.first_name || "",
            lastName: user.user_metadata?.last_name || "",
            email: user.email || "",
          })
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUserData()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        alert("Configuration Supabase manquante")
        return
      }
      
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        }
      })
      
      if (error) throw error
      
      alert("Profil mis à jour avec succès !")
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Erreur lors de la mise à jour du profil")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
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
        <p className="text-slate-400">Gérez vos informations personnelles et votre CV</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar & Personal Info */}
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
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
                      {avatarPreview ? (
                        <img 
                          src={avatarPreview} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        formData.firstName.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-slate-400 mt-3">Cliquez pour changer</p>
                </div>

                {/* Form Fields */}
                <div className="flex-1 grid sm:grid-cols-2 gap-6">
                  <Input
                    label="Prénom"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    icon={<User className="w-4 h-4" />}
                  />
                  <Input
                    label="Nom"
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    icon={<User className="w-4 h-4" />}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Email"
                      type="email"
                      placeholder="jean@exemple.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      icon={<Mail className="w-4 h-4" />}
                      disabled
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      L&apos;email ne peut pas être modifié. Contactez le support si nécessaire.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CV Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                CV par défaut
              </CardTitle>
              <CardDescription>
                Ce CV sera utilisé automatiquement pour vos nouvelles candidatures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelect={(file) => setCvFile(file)}
                onFileRemove={() => setCvFile(null)}
                currentFile={cvFile}
                label="Déposez votre CV ici"
                accept=".pdf,.doc,.docx"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
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
