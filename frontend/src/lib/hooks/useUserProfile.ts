/**
 * Hook personnalisé pour la gestion du profil utilisateur.
 * 
 * Fournit les fonctionnalités CRUD pour le profil, l'avatar et le CV.
 */

import { useState, useEffect, useCallback } from 'react'
import { getAuthToken } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  job_title: string | null
  location: string
  experience_level: string
  preferred_contract_type: string
  preferred_work_type: string
  key_skills: string[]
  cv_url: string | null
  cv_uploaded_at: string | null
  credits: number
  plan: 'FREE' | 'PRO'
  plan_name: string
  created_at: string | null
  updated_at: string | null
}

export interface ProfileUpdateData {
  first_name?: string
  last_name?: string
  phone?: string
  job_title?: string
  location?: string
  experience_level?: string
  preferred_contract_type?: string
  preferred_work_type?: string
  key_skills?: string[]
}

interface UseUserProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  // Actions
  fetchProfile: () => Promise<void>
  updateProfile: (data: ProfileUpdateData) => Promise<boolean>
  uploadAvatar: (file: File) => Promise<string | null>
  uploadCV: (file: File) => Promise<string | null>
  deleteAvatar: () => Promise<boolean>
  deleteCV: () => Promise<boolean>
}

// ============================================
// HOOK
// ============================================

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Récupère le profil depuis l'API
   */
  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        setError("Non connecté")
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/v2/profile`, {
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
      setProfile(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur fetchProfile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Met à jour le profil
   */
  const updateProfile = useCallback(async (data: ProfileUpdateData): Promise<boolean> => {
    setIsSaving(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Non connecté")
      }

      const response = await fetch(`${API_BASE_URL}/api/v2/profile`, {
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
      setProfile(result.profile)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur updateProfile:', err)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  /**
   * Upload un avatar
   */
  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    setIsSaving(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Non connecté")
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/api/v2/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur upload' }))
        throw new Error(errorData.detail || `Erreur ${response.status}`)
      }

      const result = await response.json()
      
      // Mettre à jour le profil local
      setProfile(prev => prev ? { ...prev, avatar_url: result.avatar_url } : null)
      
      return result.avatar_url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur uploadAvatar:', err)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [])

  /**
   * Upload un CV
   */
  const uploadCV = useCallback(async (file: File): Promise<string | null> => {
    setIsSaving(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Non connecté")
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/api/v2/profile/cv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur upload' }))
        throw new Error(errorData.detail || `Erreur ${response.status}`)
      }

      const result = await response.json()
      
      // Mettre à jour le profil local
      setProfile(prev => prev ? { 
        ...prev, 
        cv_url: result.cv_url,
        cv_uploaded_at: result.cv_uploaded_at
      } : null)
      
      return result.cv_url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur uploadCV:', err)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [])

  /**
   * Supprime l'avatar
   */
  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    setIsSaving(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Non connecté")
      }

      const response = await fetch(`${API_BASE_URL}/api/v2/profile/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur suppression' }))
        throw new Error(errorData.detail || `Erreur ${response.status}`)
      }

      // Mettre à jour le profil local
      setProfile(prev => prev ? { ...prev, avatar_url: null } : null)
      
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur deleteAvatar:', err)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  /**
   * Supprime le CV
   */
  const deleteCV = useCallback(async (): Promise<boolean> => {
    setIsSaving(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Non connecté")
      }

      const response = await fetch(`${API_BASE_URL}/api/v2/profile/cv`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur suppression' }))
        throw new Error(errorData.detail || `Erreur ${response.status}`)
      }

      // Mettre à jour le profil local
      setProfile(prev => prev ? { 
        ...prev, 
        cv_url: null, 
        cv_uploaded_at: null 
      } : null)
      
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      console.error('Erreur deleteCV:', err)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Charger le profil au montage
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    isSaving,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    uploadCV,
    deleteAvatar,
    deleteCV
  }
}
