"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Briefcase,
  MapPin,
  Search,
  Filter,
  AlertTriangle,
  Sparkles,
  Loader2,
  Bookmark,
  ChevronDown
} from "lucide-react"
import { QuickSearchJobCard } from "@/components/jobs/quick-search-job-card"
import { 
  quickSearch, 
  getSearchQuota,
  JobResultItem,
  QuickSearchRequest,
  SearchQuota
} from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"

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

export default function SearchPage() {
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    jobTitle: "",
    location: "France",
    contractType: "",
    experienceLevel: "",
    workType: "Tous",
    excludeAgencies: true,
    remoteOnly: false,
    maxDaysOld: 14,
  })

  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<JobResultItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<SearchQuota | any>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Load Quota & URL Params
  useEffect(() => {
    loadQuota()
    
    // Check for query params
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const l = params.get('l')
    
    if (q) {
      setFormData(prev => ({
        ...prev,
        jobTitle: q,
        location: l || prev.location
      }))
      // On déclenche la recherche après un court délai pour laisser le quota charger
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent
        handleSearch(fakeEvent, q, l || "France")
      }, 500)
    }
  }, [])

  const loadQuota = async () => {
    try {
      const q = await getSearchQuota()
      setQuota(q)
    } catch (err) {
      console.error("Failed to load quota", err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleSearch = async (e: React.FormEvent, overrideTitle?: string, overrideLocation?: string) => {
    e.preventDefault()
    const title = overrideTitle || formData.jobTitle
    const loc = overrideLocation || formData.location

    if (!title) {
      setError("Veuillez indiquer un poste recherché.")
      return
    }

    setIsSearching(true)
    setError(null)
    setHasSearched(true)

    try {
      const request: QuickSearchRequest = {
        job_title: title,
        location: loc,
        contract_type: formData.contractType || "",
        experience_level: formData.experienceLevel || "",
        work_type: formData.workType !== "Tous" ? (formData.workType || "") : "",
      }

      const response = await quickSearch(request)
      setResults(response.jobs || [])
      
      // Update quota locally based on response
      if (quota) {
        if (!response.used_credit) {
          setQuota({ ...quota, free_searches_remaining: response.free_searches_remaining })
        } else {
          loadQuota()
        }
      }
      showToast(`${response.total_found || 0} offres trouvées !`, "success")
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche. Veuillez réessayer.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header & Quota */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Recherche rapide</h1>
          <p className="text-slate-400">Naviguez parmi les meilleures offres d&apos;emploi actuelles</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Link href="/dashboard/search/saved" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full">
            <Bookmark className="w-4 h-4" />
            Mes offres sauvegardées
          </Link>
          {quota && (
            <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
              {quota.searches_unlimited ? (
                <span className="text-emerald-400 font-medium">Recherches illimitées ({quota.plan})</span>
              ) : quota.free_searches_remaining > 0 ? (
                <span>Recherches gratuites: <strong className="text-white">{quota.free_searches_remaining}</strong> restants</span>
              ) : (
                <span>Recherche avec crédit: <strong className="text-amber-400">1 crédit/recherche</strong></span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search Form */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
        <form onSubmit={handleSearch} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Poste recherché *</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  placeholder="Développeur Python, Product Manager..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Localisation</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="France, Paris, Lyon..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type de contrat</label>
              <select
                name="contractType"
                value={formData.contractType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-800">Indifférent</option>
                {CONTRACT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Expérience</label>
              <select
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-800">Indifférent</option>
                {EXPERIENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsFiltersOpen(prev => !prev)}
              className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Plus de filtres</span>
              <motion.span
                animate={{ rotate: isFiltersOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isFiltersOpen && (
                <motion.div
                  key="advanced-filters"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-700 mt-4">
                    <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        name="excludeAgencies"
                        checked={formData.excludeAgencies}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500"
                      />
                      <span className="text-sm text-slate-300">Exclure cabinets</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        name="remoteOnly"
                        checked={formData.remoteOnly}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500"
                      />
                      <span className="text-sm text-slate-300">Full Remote uniquement</span>
                    </label>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                      <label className="flex justify-between text-xs text-slate-300 mb-2">
                        <span>Ancienneté max:</span>
                        <span className="text-indigo-400">{formData.maxDaysOld} jours</span>
                      </label>
                      <input
                        type="range"
                        name="maxDaysOld"
                        min="1"
                        max="30"
                        value={formData.maxDaysOld}
                        onChange={handleInputChange}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Recherche en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Lancer la recherche
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <AnimatePresence mode="popLayout">
        {hasSearched && !isSearching && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 px-4 border border-slate-800 bg-slate-800/20 rounded-2xl"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Aucune offre trouvée</h3>
            <p className="text-slate-400">Essayez de modifier vos critères de recherche pour obtenir plus de résultats.</p>
          </motion.div>
        )}

        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              Résultats
              <span className="text-sm font-normal text-slate-400 px-2.5 py-0.5 bg-slate-800 rounded-full border border-slate-700">
                {results.length} offres
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((job, idx) => (
                <QuickSearchJobCard 
                  key={job.id || String(idx)} 
                  job={job}
                  isInitiallySaved={false}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
