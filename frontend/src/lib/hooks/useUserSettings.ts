/**
 * Hook personnalisé pour la gestion des paramètres utilisateur.
 * 
 * Fournit les fonctionnalités CRUD pour les paramètres de notifications et préférences.
 */

import { useState, useEffect, useCallback } from 'react'
import { getAuthToken } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================
// TYPES
// ============================================

export interface UserSettings {
  id: string
  user_id: string
  // Notifications
  email_candidatures: boolean
  email_new_offers: boolean
  email_newsletter: boolean
  push_notifications: boolean
  // Préférences
  language: string
  timezone: string
  dark_mode: boolean
  // Timestamps
  created_at: string | null
  updated_at: string | null
}

export interface SettingsUpdateData {
  email_candidatures?: boolean
  email_new_offers?: boolean
  email_newsletter?: boolean
  push_notifications?: boolean
  language?: string
  timezone?: string
  dark_mode?: boolean
}

interface UseUserSettingsReturn {
  settings: UserSettings | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  // Actions
  fetchSettings: () => Promise<void>
  updateSettings: (data: SettingsUpdateData) => Promise<boolean>
  updateSingleSetting: <K extends keyof SettingsUpdateData>(
    key: K, 
    value: SettingsUpdateData[K]
  ) => Promise<boolean>
}

// ============================================
// HOOK
// ============================================

export function useUserSettings(): UseUserSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Récupère les paramètres depuis l'API
   */
  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        setError("Non connecté")
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/v2/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expirée")
        }
        const errorData = await response.json().catch(() => ({ detail: 'Erreur serveur' }))
        throw new Error(errorData.detail || `Erreur ${response.status}`)
      }

      const data = await response.json()
      setSettings(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur fetchSettings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Met à jour les paramètres
   */
  const updateSettings = useCallback(async (data: SettingsUpdateData): Promise<boolean> => {
    setIsSaving(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Non connecté")
      }

      const response = await fetch(`${API_BASE_URL}/api/v2/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur serveur' }))
        throw new Error(errorData.detail || `Erreur ${response.status}`)
      }

      const result = await response.json()
      setSettings(result.settings)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur updateSettings:', err)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  /**
   * Met à jour un seul paramètre (pratique pour les switches)
   */
  const updateSingleSetting = useCallback(async <K extends keyof SettingsUpdateData>(
    key: K, 
    value: SettingsUpdateData[K]
  ): Promise<boolean> => {
    // Mise à jour optimiste
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
    
    const success = await updateSettings({ [key]: value })
    
    // Rollback en cas d'échec
    if (!success && settings) {
      setSettings(settings)
    }
    
    return success
  }, [updateSettings, settings])

  // Charger les paramètres au montage
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    isLoading,
    isSaving,
    error,
    fetchSettings,
    updateSettings,
    updateSingleSetting
  }
}
