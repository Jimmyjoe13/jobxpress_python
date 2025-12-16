"use client"

import { useState } from "react"
import { 
  Bell,
  Shield,
  Settings as SettingsIcon,
  Save,
  Eye,
  EyeOff,
  Globe,
  Moon
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const languages = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
]

const timezones = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
]

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailCandidatures: true,
    emailNewOffers: true,
    emailNewsletter: false,
    pushNotifications: true,
  })
  
  // Security settings
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  
  // Preference settings
  const [preferences, setPreferences] = useState({
    language: "fr",
    timezone: "Europe/Paris",
    darkMode: true,
  })

  const handleSaveNotifications = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    alert("Préférences de notifications sauvegardées !")
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwords.new !== passwords.confirm) {
      alert("Les mots de passe ne correspondent pas")
      return
    }
    
    if (passwords.new.length < 8) {
      alert("Le mot de passe doit contenir au moins 8 caractères")
      return
    }
    
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setPasswords({ current: "", new: "", confirm: "" })
    setIsSaving(false)
    alert("Mot de passe modifié avec succès !")
  }

  const handleSavePreferences = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    alert("Préférences sauvegardées !")
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
        <p className="text-slate-400">Gérez vos notifications, votre sécurité et vos préférences</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Tabs defaultValue="notifications">
          <TabsList className="mb-6">
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Préférences
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-400" />
                  Préférences de notifications
                </CardTitle>
                <CardDescription>
                  Choisissez comment vous souhaitez être notifié
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Switch
                  label="Emails de candidatures"
                  description="Recevez un email à chaque nouvelle candidature envoyée"
                  checked={notifications.emailCandidatures}
                  onChange={(checked) => setNotifications({ ...notifications, emailCandidatures: checked })}
                />
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Nouvelles offres correspondantes"
                    description="Soyez alerté quand de nouvelles offres matchent votre profil"
                    checked={notifications.emailNewOffers}
                    onChange={(checked) => setNotifications({ ...notifications, emailNewOffers: checked })}
                  />
                </div>
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Newsletter"
                    description="Recevez nos conseils et actualités emploi (1x/semaine)"
                    checked={notifications.emailNewsletter}
                    onChange={(checked) => setNotifications({ ...notifications, emailNewsletter: checked })}
                  />
                </div>
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Notifications push"
                    description="Activez les notifications dans votre navigateur"
                    checked={notifications.pushNotifications}
                    onChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                  />
                </div>
                
                <div className="pt-6 flex justify-end">
                  <Button 
                    variant="gradient" 
                    onClick={handleSaveNotifications}
                    isLoading={isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  Changer le mot de passe
                </CardTitle>
                <CardDescription>
                  Assurez-vous d&apos;utiliser un mot de passe fort et unique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                  <div className="relative">
                    <Input
                      label="Mot de passe actuel"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <Input
                      label="Nouveau mot de passe"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <Input
                      label="Confirmer le nouveau mot de passe"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      type="submit"
                      variant="gradient"
                      isLoading={isSaving}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Modifier le mot de passe
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-indigo-400" />
                  Préférences générales
                </CardTitle>
                <CardDescription>
                  Personnalisez votre expérience JobXpress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <Select
                    label="Langue"
                    options={languages}
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  />
                  
                  <Select
                    label="Fuseau horaire"
                    options={timezones}
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                  />
                </div>
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Mode sombre"
                    description="Utiliser le thème sombre (recommandé)"
                    checked={preferences.darkMode}
                    onChange={(checked) => setPreferences({ ...preferences, darkMode: checked })}
                  />
                </div>
                
                <div className="pt-6 flex justify-end">
                  <Button 
                    variant="gradient" 
                    onClick={handleSavePreferences}
                    isLoading={isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
