"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Sparkles,
  Target,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Loader2,
  Building2,
  MapPin,
  Briefcase,
  Layers,
  Award,
  ChevronRight
} from "lucide-react"
import {
  ApplicationV2,
  ATSAnalysisResponse,
  TailoredCVResponse,
  triggerATSAnalysis,
  getATSAnalysis,
  generateTailoredCV,
  getTailoredCV
} from "@/lib/api"
import { useToast } from "@/components/ui/toast"

interface TailoringModalProps {
  isOpen: boolean
  onClose: () => void
  application: ApplicationV2 | null
  onSuccess?: () => void
  initialTab?: "ats" | "cv" | "job"
}

export function TailoringModal({
  isOpen,
  onClose,
  application,
  onSuccess,
  initialTab = "ats"
}: TailoringModalProps) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<"ats" | "cv" | "job">(initialTab)

  // ATS state
  const [atsData, setAtsData] = useState<ATSAnalysisResponse | null>(null)
  const [isLoadingAts, setIsLoadingAts] = useState(false)
  const [isAnalyzingAts, setIsAnalyzingAts] = useState(false)

  // CV state
  const [cvData, setCvData] = useState<TailoredCVResponse | null>(null)
  const [isLoadingCv, setIsLoadingCv] = useState(false)
  const [isGeneratingCv, setIsGeneratingCv] = useState(false)
  const [copiedCv, setCopiedCv] = useState(false)

  // Load existing data on modal open
  useEffect(() => {
    if (!isOpen || !application) {
      setAtsData(null)
      setCvData(null)
      return
    }

    setActiveTab(initialTab)

    // Pre-populate from application.final_choice if already stored
    if (application.final_choice?.ats_analysis) {
      setAtsData(application.final_choice.ats_analysis)
    } else {
      // Try to fetch ATS analysis
      setIsLoadingAts(true)
      getATSAnalysis(application.id)
        .then((res) => setAtsData(res))
        .catch(() => setAtsData(null))
        .finally(() => setIsLoadingAts(false))
    }

    if (application.final_choice?.tailored_cv) {
      setCvData(application.final_choice.tailored_cv)
    } else {
      // Try to fetch Tailored CV
      setIsLoadingCv(true)
      getTailoredCV(application.id)
        .then((res) => setCvData(res))
        .catch(() => setCvData(null))
        .finally(() => setIsLoadingCv(false))
    }
  }, [isOpen, application, initialTab])

  if (!isOpen || !application) return null

  const offerTitle = application.final_choice?.title || application.job_title || "Offre d'emploi"
  const companyName = application.final_choice?.company || "Entreprise"
  const offerUrl = application.final_choice?.url || (application as any).url
  const offerDesc = application.final_choice?.description || (application as any).description || ""

  // Handler: Trigger ATS Analysis (1 credit)
  const handleTriggerATS = async () => {
    setIsAnalyzingAts(true)
    try {
      const res = await triggerATSAnalysis(application.id)
      setAtsData(res)
      showToast("Diagnostic ATS calculé avec succès (-1 crédit)", "success")
      if (onSuccess) onSuccess()
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'analyse ATS", "error")
    } finally {
      setIsAnalyzingAts(false)
    }
  }

  // Handler: Generate Tailored CV (5 credits)
  const handleGenerateCV = async () => {
    setIsGeneratingCv(true)
    try {
      const res = await generateTailoredCV(application.id)
      setCvData(res)
      showToast("CV adapté généré avec succès (-5 crédits)", "success")
      if (onSuccess) onSuccess()
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la génération du CV adapté", "error")
    } finally {
      setIsGeneratingCv(false)
    }
  }

  // Handler: Copy formatted CV text
  const handleCopyCVText = () => {
    if (!cvData) return
    let text = `${cvData.full_name}\n${cvData.target_title}\n`
    if (cvData.contact?.email) text += `Email : ${cvData.contact.email} | `
    if (cvData.contact?.phone) text += `Tél : ${cvData.contact.phone} | `
    if (cvData.contact?.location) text += `Lieu : ${cvData.contact.location}`
    text += `\n\n--- PROFIL ---\n${cvData.pitch}\n\n--- COMPÉTENCES CLÉS ---\n`
    text += cvData.highlighted_skills.join(", ") + "\n\n--- EXPÉRIENCES ---\n"
    cvData.experiences.forEach((exp) => {
      text += `\n${exp.role} - ${exp.company} (${exp.period || ""})\n`
      exp.bullets.forEach((b) => {
        text += `• ${b}\n`
      })
    })
    if (cvData.education && cvData.education.length > 0) {
      text += `\n--- FORMATION ---\n`
      cvData.education.forEach((edu) => {
        text += `• ${edu.degree} - ${edu.institution} (${edu.year || ""})\n`
      })
    }

    navigator.clipboard.writeText(text)
    setCopiedCv(true)
    showToast("Texte du CV copié dans le presse-papiers", "success")
    setTimeout(() => setCopiedCv(false), 2500)
  }

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/30"
    return "text-rose-400 bg-rose-500/10 border-rose-500/30"
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-slate-900/60 flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Préparation Candidature
                </span>
                {offerUrl && (
                  <a
                    href={offerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <span>Lien externe</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <h2 className="text-xl font-bold text-white truncate">{offerTitle}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {companyName}
                </span>
                {application.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {application.location}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-slate-950/40 px-6 gap-2">
            <button
              onClick={() => setActiveTab("ats")}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "ats"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Diagnostic ATS & Mots-clés</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                1 crédit
              </span>
            </button>

            <button
              onClick={() => setActiveTab("cv")}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "cv"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>CV Adapté Sur-Mesure</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                5 crédits
              </span>
            </button>

            <button
              onClick={() => setActiveTab("job")}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "job"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Fiche de Poste</span>
            </button>
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                TAB 1: DIAGNOSTIC ATS (1 CRÉDIT)
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {activeTab === "ats" && (
              <div className="space-y-6">
                {isLoadingAts ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                    <p className="text-sm">Chargement du diagnostic ATS...</p>
                  </div>
                ) : atsData ? (
                  <div className="space-y-6">
                    {/* Score Overview */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-white/10 flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-bold ${getScoreColor(
                            atsData.match_score
                          )}`}
                        >
                          <span className="text-2xl leading-none">{atsData.match_score}</span>
                          <span className="text-[10px] uppercase opacity-75">/100</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">Score de Compatibilité ATS</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {atsData.match_score >= 80
                              ? "Excellent profil ! Votre CV matche fortement les exigences du recruteur."
                              : atsData.match_score >= 60
                              ? "Bonne compatibilité. Quelques mots-clés et compétences méritent d'être mis en valeur."
                              : "Compatibilité partielle. Intégrez les mots-clés suggérés pour franchir le filtre ATS."}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleTriggerATS}
                        disabled={isAnalyzingAts}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/10 flex items-center gap-1.5"
                      >
                        {isAnalyzingAts ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>Recalculer (1 crédit)</span>
                      </button>
                    </div>

                    {/* Mots-clés ATS à intégrer */}
                    {atsData.ats_keywords_to_add && atsData.ats_keywords_to_add.length > 0 && (
                      <div className="p-5 rounded-2xl bg-slate-950/50 border border-indigo-500/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                            Mots-clés ATS critiques à intégrer dans votre candidature
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400">
                          Ces termes exacts sont analysés par le logiciel de tri (ATS). Cliquez pour copier :
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {atsData.ats_keywords_to_add.map((kw, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                navigator.clipboard.writeText(kw)
                                showToast(`Mot-clé copié : "${kw}"`, "success")
                              }}
                              className="px-2.5 py-1 text-xs rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1"
                            >
                              <span>{kw}</span>
                              <Copy className="w-3 h-3 opacity-50" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grille Forces & Lacunes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Forces */}
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            Vos Atouts Majeurs
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {atsData.strengths.map((s, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Lacunes / Points à compenser */}
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertCircle className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            Compétences & Critères à compenser
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {atsData.missing_skills.map((m, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommandations */}
                    {atsData.recommendations && atsData.recommendations.length > 0 && (
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <TrendingUp className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            Conseils d'Impact pour Décrocher l'Entretien
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {atsData.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty state: Trigger analysis */
                  <div className="p-8 sm:p-12 rounded-2xl bg-slate-950/40 border border-white/5 text-center flex flex-col items-center max-w-xl mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                      <Target className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Passez les filtres ATS avec succès
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      Notre IA compare méticuleusement les critères de cette offre d'emploi avec votre profil. Vous obtenez un score chiffré, la liste précise de vos forces, les prérequis à compenser et les mots-clés exacts que les recruteurs scannent.
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                      <span>Tarif :</span>
                      <strong className="text-indigo-400">1 crédit</strong>
                      <span>· Débité uniquement en cas de résultat garanti.</span>
                    </div>

                    <button
                      onClick={handleTriggerATS}
                      disabled={isAnalyzingAts}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isAnalyzingAts ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyse ATS en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Lancer le diagnostic ATS (1 crédit)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                TAB 2: CV ADAPTÉ SUR-MESURE (5 CRÉDITS)
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {activeTab === "cv" && (
              <div className="space-y-6">
                {isLoadingCv ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                    <p className="text-sm">Chargement du CV adapté...</p>
                  </div>
                ) : cvData ? (
                  <div className="space-y-6">
                    {/* Header Actions */}
                    <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl bg-slate-950/40 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          <span>Score ATS optimisé : {cvData.ats_score}%</span>
                        </div>
                        <span className="text-xs text-slate-400">Calibré pour cette offre</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyCVText}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/10"
                        >
                          {copiedCv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCv ? "Copié !" : "Copier le texte"}</span>
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/10"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimer / PDF</span>
                        </button>
                        <button
                          onClick={handleGenerateCV}
                          disabled={isGeneratingCv}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          {isGeneratingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>Régénérer (5 crédits)</span>
                        </button>
                      </div>
                    </div>

                    {/* CV Document View */}
                    <div className="p-8 rounded-2xl bg-white text-slate-900 shadow-xl space-y-6 font-sans">
                      {/* CV Header */}
                      <div className="border-b border-slate-200 pb-5">
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{cvData.full_name}</h3>
                        <p className="text-base font-semibold text-indigo-600 mt-0.5">{cvData.target_title}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                          {cvData.contact?.email && <span>{cvData.contact.email}</span>}
                          {cvData.contact?.phone && <span>· {cvData.contact.phone}</span>}
                          {cvData.contact?.location && <span>· {cvData.contact.location}</span>}
                        </div>
                      </div>

                      {/* Pitch / Summary */}
                      {cvData.pitch && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Profil Professionnel
                          </h4>
                          <p className="text-xs leading-relaxed text-slate-700">{cvData.pitch}</p>
                        </div>
                      )}

                      {/* Highlighted Skills */}
                      {cvData.highlighted_skills && cvData.highlighted_skills.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Compétences Alignées ATS
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {cvData.highlighted_skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs rounded font-medium bg-slate-100 text-slate-800 border border-slate-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Experiences */}
                      {cvData.experiences && cvData.experiences.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                            Expériences Professionnelles
                          </h4>
                          <div className="space-y-4">
                            {cvData.experiences.map((exp, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex items-baseline justify-between flex-wrap text-xs">
                                  <span className="font-bold text-slate-900">
                                    {exp.role} <span className="font-normal text-slate-600">· {exp.company}</span>
                                  </span>
                                  <span className="text-slate-500 text-[11px]">{exp.period}</span>
                                </div>
                                <ul className="list-disc pl-4 space-y-1">
                                  {exp.bullets.map((b, bIdx) => (
                                    <li key={bIdx} className="text-xs text-slate-700 leading-snug">
                                      {b}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education */}
                      {cvData.education && cvData.education.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Formations & Diplômes
                          </h4>
                          <div className="space-y-1.5">
                            {cvData.education.map((edu, idx) => (
                              <div key={idx} className="flex items-baseline justify-between text-xs">
                                <span className="font-semibold text-slate-900">
                                  {edu.degree} <span className="font-normal text-slate-600">· {edu.institution}</span>
                                </span>
                                <span className="text-slate-500 text-[11px]">{edu.year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Empty state: Generate CV */
                  <div className="p-8 sm:p-12 rounded-2xl bg-slate-950/40 border border-white/5 text-center flex flex-col items-center max-w-xl mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Générez un CV sur-mesure pour cette offre
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      L'IA restructure votre parcours en temps réel : elle reformule votre pitch, réorganise vos compétences clés et calibre chaque puce d'expérience pour faire ressortir les mots-clés exacts de la fiche de poste.
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                      <span>Tarif :</span>
                      <strong className="text-indigo-400">5 crédits</strong>
                      <span>· Débité uniquement en cas de CV généré.</span>
                    </div>

                    <button
                      onClick={handleGenerateCV}
                      disabled={isGeneratingCv}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingCv ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Rédaction du CV adapté en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Générer mon CV adapté (5 crédits)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                TAB 3: FICHE DE POSTE
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {activeTab === "job" && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-base font-bold text-white">{offerTitle}</h3>
                    {offerUrl && (
                      <a
                        href={offerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Voir sur le site source
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span>Entreprise : <strong className="text-white">{companyName}</strong></span>
                    {application.location && <span>· Lieu : <strong className="text-white">{application.location}</strong></span>}
                    {application.contract_type && <span>· Contrat : <strong className="text-white">{application.contract_type}</strong></span>}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Description de l'offre
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto pr-2">
                    {offerDesc || "Aucune description détaillée enregistrée pour cette offre."}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
