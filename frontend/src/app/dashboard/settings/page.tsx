"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Bell, Shield, Settings as SettingsIcon, Eye, EyeOff,
  Loader2, CheckCircle, AlertCircle, RefreshCw, Trash2, AlertTriangle,
  X as XIcon, Lock, Mail, Smartphone, Download, KeyRound,
  Globe, MonitorSmartphone, FileText
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useUserSettings } from "@/lib/hooks/useUserSettings"
import { deleteAccount } from "@/lib/api"
import { useRouter } from "next/navigation"

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
// PASSWORD STRENGTH
// ============================================

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "" }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: "Faible", color: "bg-red-500" }
  if (score === 2) return { level: 2, label: "Moyen", color: "bg-yellow-500" }
  return { level: 3, label: "Fort", color: "bg-emerald-500" }
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { level, label, color } = getPasswordStrength(password)
  if (!password) return null

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: i <= level ? "100%" : "0%" }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`h-full rounded-full ${color}`}
            />
          </div>
        ))}
      </div>
      {label && (
        <p className={`text-xs font-medium ${
          level === 1 ? "text-red-400" : level === 2 ? "text-yellow-400" : "text-emerald-400"
        }`}>
          {label}
        </p>
      )}
    </div>
  )
}

// ============================================
// TOAST
// ============================================

interface ToastProps {
  type: "success" | "error"
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
        ${type === "success"
          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
          : "bg-red-500/20 border-red-500/30 text-red-300"
        }`}
    >
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  )
}

// ============================================
// SKELETON
// ============================================

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-700/50 rounded-lg" />
      <div className="h-4 w-64 bg-slate-700/30 rounded" />
      <div className="h-12 w-full max-w-lg bg-slate-700/50 rounded-xl" />
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
// SECTION HEADER HELPER
// ============================================

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SettingsPage() {
  const {
    settings,
    isLoading,
    isSaving,
    error,
    updateSingleSetting,
    fetchSettings,
  } = useUserSettings()

  // Security — password form
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwords, setPasswords] = useState({ new: "", confirm: "" })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Inline save feedback
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())

  // Account deletion modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message })
  }, [])

  const markSaved = useCallback((key: string) => {
    setSavedKeys((prev) => new Set(prev).add(key))
    setTimeout(() => {
      setSavedKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }, 2500)
  }, [])

  // Toggle notifications with optimistic UI
  const handleToggle = useCallback(
    async (key: "email_candidatures" | "email_new_offers" | "email_newsletter" | "push_notifications", value: boolean) => {
      const success = await updateSingleSetting(key, value)
      if (success) {
        markSaved(key)
      } else {
        showToast("error", "Erreur lors de la sauvegarde")
      }
    },
    [updateSingleSetting, markSaved, showToast]
  )

  // Auto-save select fields
  const handleSelectChange = useCallback(
    async (key: "language" | "timezone", value: string) => {
      const success = await updateSingleSetting(key, value)
      if (success) {
        markSaved(key)
        showToast("success", key === "language" ? "Langue mise à jour" : "Fuseau horaire mis à jour")
      } else {
        showToast("error", "Erreur lors de la sauvegarde")
      }
    },
    [updateSingleSetting, markSaved, showToast]
  )

  // Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (passwords.new !== passwords.confirm) {
      setPasswordError("Les mots de passe ne correspondent pas")
      return
    }
    if (passwords.new.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }

    setIsChangingPassword(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: passwords.new })
      if (error) throw error
      setPasswords({ new: "", confirm: "" })
      showToast("success", "Mot de passe modifié avec succès")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du changement"
      showToast("error", message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Data export — download settings JSON locally
  const handleExportData = () => {
    const data = {
      exported_at: new Date().toISOString(),
      settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jobxpress-data-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast("success", "Export téléchargé")
  }

  // Account deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteAccount()
      if (result.success) {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/")
      } else {
        showToast("error", "Impossible de supprimer le compte. Contactez le support.")
      }
    } catch {
      showToast("error", "Impossible de supprimer le compte. Contactez le support.")
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  if (isLoading) return <SettingsSkeleton />

  if (error && !settings) {
    return (
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
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm mb-3">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Configuration du compte</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Paramètres</h1>
        <p className="text-slate-400">Gérez vos notifications, votre sécurité et vos préférences</p>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Tabs defaultValue="notifications">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Globe className="w-4 h-4 mr-2" />
              Préférences
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Lock className="w-4 h-4 mr-2" />
              Confidentialité
            </TabsTrigger>
          </TabsList>

          {/* ───── NOTIFICATIONS ───── */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              {/* Email */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    Notifications par email
                  </CardTitle>
                  <CardDescription>
                    Choisissez les emails que vous souhaitez recevoir
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 divide-y divide-slate-700/50">
                  {[
                    {
                      key: "email_candidatures" as const,
                      label: "Emails de candidatures",
                      description: "Recevez un récapitulatif à chaque candidature envoyée",
                    },
                    {
                      key: "email_new_offers" as const,
                      label: "Nouvelles offres correspondantes",
                      description: "Soyez alerté quand de nouvelles offres matchent votre profil",
                    },
                    {
                      key: "email_newsletter" as const,
                      label: "Newsletter hebdomadaire",
                      description: "Conseils carrière et actualités emploi (1x/semaine)",
                    },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between py-5 first:pt-0 last:pb-0">
                      <div className="flex-1 pr-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{label}</span>
                          {savedKeys.has(key) && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-xs text-emerald-400 flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Sauvegardé
                            </motion.span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
                      </div>
                      <Switch
                        checked={settings?.[key] ?? true}
                        onChange={(v) => handleToggle(key, v)}
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Push */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-400" />
                    Notifications navigateur
                  </CardTitle>
                  <CardDescription>
                    Notifications en temps réel dans votre navigateur
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Notifications push</span>
                        {savedKeys.has("push_notifications") && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs text-emerald-400 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Sauvegardé
                          </motion.span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Activez les alertes dans votre navigateur pour ne rien manquer
                      </p>
                    </div>
                    <Switch
                      checked={settings?.push_notifications ?? false}
                      onChange={(v) => handleToggle("push_notifications", v)}
                      disabled={isSaving}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ───── SECURITY ───── */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Password change */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-indigo-400" />
                    Changer le mot de passe
                  </CardTitle>
                  <CardDescription>
                    Utilisez un mot de passe fort d&apos;au moins 8 caractères
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                    {/* New password */}
                    <div>
                      <div className="relative">
                        <Input
                          label="Nouveau mot de passe"
                          type={showNew ? "text" : "password"}
                          placeholder="••••••••"
                          value={passwords.new}
                          onChange={(e) => {
                            setPasswords((p) => ({ ...p, new: e.target.value }))
                            setPasswordError(null)
                          }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <PasswordStrengthBar password={passwords.new} />
                    </div>

                    {/* Confirm password */}
                    <div className="relative">
                      <Input
                        label="Confirmer le nouveau mot de passe"
                        type={showConfirm ? "text" : "password"}
                        placeholder="••••••••"
                        value={passwords.confirm}
                        onChange={(e) => {
                          setPasswords((p) => ({ ...p, confirm: e.target.value }))
                          setPasswordError(null)
                        }}
                        error={passwordError ?? undefined}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="pt-2">
                      <Button type="submit" variant="gradient" isLoading={isChangingPassword}>
                        <Shield className="w-4 h-4 mr-2" />
                        Modifier le mot de passe
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Sessions info */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MonitorSmartphone className="w-5 h-5 text-indigo-400" />
                    Sessions actives
                  </CardTitle>
                  <CardDescription>
                    Appareils actuellement connectés à votre compte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Session actuelle</p>
                        <p className="text-xs text-slate-500">Navigateur web — Connecté maintenant</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-emerald-400 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Pour révoquer toutes les autres sessions, modifiez votre mot de passe.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ───── PREFERENCES ───── */}
          <TabsContent value="preferences">
            <div className="space-y-6">
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-400" />
                    Langue &amp; région
                  </CardTitle>
                  <CardDescription>
                    Paramètres régionaux de votre interface — sauvegardés automatiquement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <Select
                        label="Langue"
                        options={languages}
                        value={settings?.language ?? "fr"}
                        onChange={(e) => handleSelectChange("language", e.target.value)}
                      />
                      {savedKeys.has("language") && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1.5">
                          <CheckCircle className="w-3 h-3" /> Mis à jour
                        </p>
                      )}
                    </div>
                    <div>
                      <Select
                        label="Fuseau horaire"
                        options={timezones}
                        value={settings?.timezone ?? "Europe/Paris"}
                        onChange={(e) => handleSelectChange("timezone", e.target.value)}
                      />
                      {savedKeys.has("timezone") && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1.5">
                          <CheckCircle className="w-3 h-3" /> Mis à jour
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-indigo-400" />
                    Apparence
                  </CardTitle>
                  <CardDescription>
                    Personnalisez l&apos;affichage de votre interface
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Mode sombre</span>
                        {savedKeys.has("dark_mode") && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs text-emerald-400 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Sauvegardé
                          </motion.span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Utiliser le thème sombre (recommandé pour une utilisation prolongée)
                      </p>
                    </div>
                    <Switch
                      checked={settings?.dark_mode ?? true}
                      onChange={async (v) => {
                        const success = await updateSingleSetting("dark_mode", v)
                        if (success) markSaved("dark_mode")
                        else showToast("error", "Erreur lors de la sauvegarde")
                      }}
                      disabled={isSaving}
                    />
                  </div>

                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-indigo-400 mt-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sauvegarde en cours...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ───── PRIVACY ───── */}
          <TabsContent value="privacy">
            <div className="space-y-6">
              {/* RGPD Info */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Vos données personnelles
                  </CardTitle>
                  <CardDescription>
                    Conformément au RGPD, vous pouvez accéder, exporter ou supprimer vos données
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-sm text-slate-300 leading-relaxed">
                    JobXpress collecte uniquement les données nécessaires au bon fonctionnement du service
                    (profil, préférences, historique de recherche). Vos données ne sont jamais revendues.
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Données collectées</p>
                      <ul className="text-sm text-slate-300 space-y-1 mt-2">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Profil & CV</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Historique de recherche</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Préférences de notification</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vos droits</p>
                      <ul className="text-sm text-slate-300 space-y-1 mt-2">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Droit d&apos;accès</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Droit de portabilité</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Droit à l&apos;effacement</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-indigo-400" />
                    Exporter mes données
                  </CardTitle>
                  <CardDescription>
                    Téléchargez une copie de vos données au format JSON
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-sm text-slate-400">
                      Inclut vos paramètres et préférences. Traitement immédiat.
                    </div>
                    <Button variant="outline" onClick={handleExportData} className="flex-shrink-0">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger mes données
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ───── DANGER ZONE ───── */}
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
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-medium mb-1">Supprimer mon compte</h3>
              <p className="text-slate-400 text-sm max-w-md">
                Cette action est irréversible. Toutes vos données, candidatures, historique et crédits seront définitivement supprimés.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex-shrink-0"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ───── DELETE MODAL ───── */}
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
              <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-500" />

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
                  Supprimer définitivement ?
                </h2>
                <p className="text-slate-400 text-center text-sm mb-8">
                  Cette action est irréversible. Toutes vos données, candidatures, historique et crédits seront supprimés immédiatement.
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
