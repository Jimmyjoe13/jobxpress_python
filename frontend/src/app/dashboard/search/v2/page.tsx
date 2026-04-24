"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, MapPin, Sparkles, Loader2, ExternalLink, FileText, Target, TrendingUp 
} from "lucide-react"
import { 
  startDeepSearch, getDeepSearchResults, generateCoverLetterV2, getCandidateProfile,
  type JobOfferV2, type CandidateProfileV2
} from "@/lib/api"

export default function DeepSearchPage() {
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchId, setSearchId] = useState<string | null>(null)
  const [results, setResults] = useState<JobOfferV2[]>([])
  const [profile, setProfile] = useState<CandidateProfileV2 | null>(null)
  const [status, setStatus] = useState<string>("")
  const [selectedJob, setSelectedJob] = useState<JobOfferV2 | null>(null)
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false)
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null)

  useEffect(() => {
    getCandidateProfile().then(setProfile).catch(() => setProfile({
        job_title: "DÃ©veloppeur Python Senior",
        experience_level: "Senior",
        top_skills: ["Python", "FastAPI"],
        education: "", preferred_contract: "", summary: ""
    }))
  }, [])

  useEffect(() => {
    let interval: any
    if (isSearching && searchId) {
      interval = setInterval(async () => {
        try {
          const res = await getDeepSearchResults(searchId)
          if (res.status === 'COMPLETED') {
            setResults(res.offers)
            setIsSearching(false)
            setStatus("Scan terminÃ© !")
            clearInterval(interval)
          } else {
            setStatus("Exploration profonde... " + (res.offers.length || 0) + " offres.")
          }
        } catch (e) {
          setIsSearching(false)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isSearching, searchId])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return
    setIsSearching(true)
    setResults([])
    setStatus("Initialisation...")
    try {
      const { search_id } = await startDeepSearch(query, location)
      setSearchId(search_id)
    } catch (e) {
      setIsSearching(false)
    }
  }

  const handleGenerateLetter = async (job: JobOfferV2) => {
    setSelectedJob(job)
    setIsGeneratingLetter(true)
    try {
      const { letter } = await generateCoverLetterV2(job.url)
      setGeneratedLetter(letter)
    } catch (e) {} finally {
      setIsGeneratingLetter(false)
    }
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white space-y-8">
      {/* Search Header */}
      <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-md">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-400" /> Deep Search Engine V2
        </h1>
        <form onSubmit={handleSearch} className="mt-8 flex flex-col md:flex-row gap-4">
          <input 
            className="flex-1 bg-slate-800/50 border border-white/10 p-4 rounded-xl outline-none focus:border-indigo-500 transition-all"
            placeholder="Poste (Python Developer...)" 
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
          <input 
            className="w-full md:w-64 bg-slate-800/50 border border-white/10 p-4 rounded-xl outline-none focus:border-indigo-500 transition-all"
            placeholder="Ville (Remote...)" 
            value={location} onChange={(e) => setLocation(e.target.value)}
          />
          <button className="bg-indigo-600 px-8 py-4 rounded-xl font-bold hover:bg-indigo-500 transition-all flex items-center gap-2">
            {isSearching ? <Loader2 className="animate-spin" /> : <Search />} Scanner
          </button>
        </form>
        {status && <p className="mt-4 text-xs text-indigo-400 font-mono">{status}</p>}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((job, idx) => (
          <div key={idx} className="bg-slate-900 border border-white/5 p-6 rounded-2xl hover:border-indigo-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
               <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-bold">Match: {job.match_score}%</span>
               <a href={job.url} target="_blank"><ExternalLink className="w-4 h-4 text-slate-500" /></a>
            </div>
            <h3 className="text-lg font-bold">{job.title}</h3>
            <p className="text-slate-400 text-sm">{job.company}</p>
            <div className="mt-6 flex gap-2">
               <button onClick={() => handleGenerateLetter(job)} className="flex-1 bg-slate-800 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-white/5">
                 <FileText className="w-4 h-4" /> Lettre
               </button>
               <button className="px-4 bg-indigo-600/10 text-indigo-400 py-3 rounded-xl text-xs font-bold">Sauver</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 max-w-2xl w-full rounded-3xl p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">Lettre pour {selectedJob.title}</h2>
            {isGeneratingLetter ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-500"><Loader2 className="animate-spin w-12 h-12" /> IA en action...</div>
            ) : (
                <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{generatedLetter}</div>
            )}
            <button onClick={() => setSelectedJob(null)} className="mt-8 w-full py-4 bg-slate-800 rounded-xl font-bold">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
