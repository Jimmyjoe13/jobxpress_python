// -*- coding: utf-8 -*-
/**
 * Store Zustand pour l'état global (auth, crédits, settings).
 * Remplace les fetches redondants dans chaque composant.
 */

import { create } from "zustand"

interface UserCredits {
  free_remaining: number
  credits: number
  plan: "free" | "starter" | "pro"
}

interface UserSettings {
  darkMode: boolean
  language: "fr" | "en" | "es"
  emailNotifications: boolean
  pushNotifications: boolean
}

interface AppState {
  // Credits
  credits: UserCredits | null
  setCredits: (credits: UserCredits | null) => void

  // Settings
  settings: UserSettings | null
  setSettings: (settings: UserSettings | null) => void
  updateSettings: (partial: Partial<UserSettings>) => void

  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Credits
  credits: null,
  setCredits: (credits) => set({ credits }),

  // Settings
  settings: null,
  setSettings: (settings) => set({ settings }),
  updateSettings: (partial) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...partial } : null,
    })),

  // UI
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
