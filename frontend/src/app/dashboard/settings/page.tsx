"use client"

import { useState, useEffect } from "react"
import { 
  Bell,
  Shield,
  Settings as SettingsIcon,
  Save,
  Eye,
  EyeOff,
  Globe,
  Moon,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useUserSettings } from "@/lib/hooks/useUserSettings"
import { deleteAccount } from "@/lib/api"
import { useRouter } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { Trash2, AlertTriangle, X as XIcon } from "lucide-react"

// ============================================
// CONSTANTS
// ============================================

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

// ============================================
// TOAST NOTIFICATION COMPONENT
// ============================================

interface ToastProps {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}

function Toast({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-xl border
        ${type === 'success' 
          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
          : 'bg-red-500/20 border-red-500/30 text-red-300'
        }`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-emerald-400" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-400" />
      )}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  )
}

// ============================================
// SKELETON LOADER
// ============================================

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-700/50 rounded-lg" />
      <div className="h-4 w-64 bg-slate-700/30 rounded" />
      
      <div className="h-12 w-full max-w-md bg-slate-700/50 rounded-xl" />
      
      <Card variant="gradient">
        <CardContent className="p-6 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-slate-700/50 rounded" />
                <div className="h-4 w-64 bg-slate-700/30 rounded" />
              </div>
              <div className="h-6 w-12 bg-slate-700/50 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SettingsPage() {
  // API Hook
  const { 
    settings, 
    isLoading, 
    isSaving, 
    error,
    updateSingleSetting,
    updateSettings,
    fetchSettings
  } = useUserSettings()
  
  // Local state for password form
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Animated save success state
  const [savedAnim, setSavedAnim] = useState(false)
  
  // Account deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  // Show toast helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }

  // Handle notification toggle
  const handleNotificationToggle = async (key: 'email_candidatures' | 'email_new_offers' | 'email_newsletter' | 'push_notifications', value: boolean) => {
    const success = await updateSingleSetting(key, value)
    if (success) {
      showToast('success', 'Préférences sauvegardées ✓')
      setSavedAnim(true)
      setTimeout(() => setSavedAnim(false), 2500)
    } else {
      showToast('error', 'Erreur lors de la sauvegarde')
    }
  }

  // Handle preferences save
  const handleSavePreferences = async () => {
    if (!settings) return

    const success = await updateSettings({
      language: settings.language,
      timezone: settings.timezone,
      dark_mode: settings.dark_mode
    })

    if (success) {
      showToast('success', 'Préférences sauvegardées')
      setSavedAnim(true)
      setTimeout(() => setSavedAnim(false), 2500)
    } else {
      showToast('error', 'Erreur lors de la sauvegarde')
    }
  }

  // Handle password change via Supabase Auth
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwords.new !== passwords.confirm) {
      showToast('error', 'Les mots de passe ne correspondent pas')
      return
    }
    
    if (passwords.new.length < 8) {
      showToast('error', 'Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    
    setIsChangingPassword(true)
    
    try {
      // Import Supabase client dynamically
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      
      // Use Supabase Auth to update password
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      })
      
      if (error) {
        throw error
      }
      
      setPasswords({ current: "", new: "", confirm: "" })
      showToast('success', 'Mot de passe modifié avec succès')
    } catch (err) {
      console.error('Password change error:', err)
      const message = err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe'
      showToast('error', message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteAccount()
      if (result.success) {
        // Déconnexion Supabase
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        await supabase.auth.signOut()
        
        // Redirection
        router.push("/")
      } else {
        showToast('error', "Impossible de supprimer le compte. Contactez le support.")
      }
    } catch (err) {
      console.error('Account deletion error:', err)
      showToast('error', "Impossible de supprimer le compte. Contactez le support.")
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  // Handle preference change (local)
  const handlePreferenceChange = (key: 'language' | 'timezone' | 'dark_mode', value: string | boolean) => {
    if (!settings) return
    // This updates the local state optimistically
    // The actual save happens when clicking "Sauvegarder"
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <SettingsSkeleton />
      </div>
    )
  }

  // Show error state
  if (error && !settings) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Erreur de chargement</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button variant="outline" onClick={fetchSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

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
                  checked={settings?.email_candidatures ?? true}
                  onChange={(checked) => handleNotificationToggle('email_candidatures', checked)}
                  disabled={isSaving}
                />
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Nouvelles offres correspondantes"
                    description="Soyez alerté quand de nouvelles offres matchent votre profil"
                    checked={settings?.email_new_offers ?? true}
                    onChange={(checked) => handleNotificationToggle('email_new_offers', checked)}
                    disabled={isSaving}
                  />
                </div>
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Newsletter"
                    description="Recevez nos conseils et actualités emploi (1x/semaine)"
                    checked={settings?.email_newsletter ?? false}
                    onChange={(checked) => handleNotificationToggle('email_newsletter', checked)}
                    disabled={isSaving}
                  />
                </div>
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Notifications push"
                    description="Activez les notifications dans votre navigateur"
                    checked={settings?.push_notifications ?? true}
                    onChange={(checked) => handleNotificationToggle('push_notifications', checked)}
                    disabled={isSaving}
                  />
                </div>

                {/* Saving / saved indicator */}
                <div className="flex items-center gap-3">
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-indigo-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sauvegarde en cours...
                    </div>
                  )}
                  <AnimatePresence>
                    {savedAnim && !isSaving && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex items-center gap-1.5 text-sm text-emerald-400"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Sauvegardé
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                      isLoading={isChangingPassword}
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
                    value={settings?.language ?? "fr"}
                    onChange={async (e) => {
                      const success = await updateSingleSetting('language', e.target.value)
                      if (success) {
                        showToast('success', 'Langue mise à jour')
                      }
                    }}
                  />
                  
                  <Select
                    label="Fuseau horaire"
                    options={timezones}
                    value={settings?.timezone ?? "Europe/Paris"}
                    onChange={async (e) => {
                      const success = await updateSingleSetting('timezone', e.target.value)
                      if (success) {
                        showToast('success', 'Fuseau horaire mis à jour')
                      }
                    }}
                  />
                </div>
                
                <div className="border-t border-slate-700/50 pt-6">
                  <Switch
                    label="Mode sombre"
                    description="Utiliser le thème sombre (recommandé)"
                    checked={settings?.dark_mode ?? true}
                    onChange={async (checked) => {
                      const success = await updateSingleSetting('dark_mode', checked)
                      if (success) {
                        showToast('success', 'Thème mis à jour')
                      }
                    }}
                    disabled={isSaving}
                  />
                </div>
                
                {/* Saving indicator */}
                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sauvegarde en cours...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Zone dangereuse */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="pt-12 border-t border-slate-800"
      >
        <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Zone dangereuse
        </h2>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-white font-medium">Supprimer mon compte</h3>
              <p className="text-slate-400 text-sm">
                Une fois votre compte supprimé, il n&apos;y a aucun retour en arrière possible. Soyez-en certain.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal de confirmation de suppression */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md px-4"
            >
              <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-3">
                  Supprimer définitivement mon compte
                </h2>

                <p className="text-slate-400 text-center mb-8">
                  Cette action est irréversible. Toutes vos données, candidatures et historique seront supprimés.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 order-2 sm:order-1"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeleting}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="gradient"
                    className="flex-1 from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border-none order-1 sm:order-2"
                    onClick={handleDeleteAccount}
                    isLoading={isDeleting}
                  >
                    Oui, supprimer mon compte
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
