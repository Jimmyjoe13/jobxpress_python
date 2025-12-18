/**
 * JobXpress API Client
 * 
 * Ce module gère toutes les communications avec l'API backend,
 * y compris l'authentification JWT via Supabase.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================
// TYPES
// ============================================

export interface CandidateData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  job_title: string
  contract_type: string
  work_type: string
  experience_level: string
  location: string
  cv_url?: string
  user_id?: string  // ID utilisateur Supabase (si connecté)
}

export interface JobOffer {
  title: string
  company: string
  location: string
  description: string
  url: string
  date_posted?: string
  contract_type?: string
  is_remote: boolean
  work_type?: string
  match_score: number
  ai_analysis?: Record<string, unknown>
}

export interface Application {
  id: string
  company_name: string
  job_title: string
  job_url: string
  match_score: number
  status: string
  created_at: string
  pdf_path?: string
}

export interface ApplicationResult {
  status: string
  message: string
  event_id: string
  task_id?: number
}

export interface HealthCheck {
  status: string
  checks: Record<string, string>
  version: string
  environment: string
}

export interface UserApplicationsResponse {
  user_id: string
  count: number
  applications: Array<{
    id: string
    email: string
    first_name: string
    last_name: string
    applications: Application[]
  }>
}

export interface ApiError {
  detail: string
  status?: number
}

// ============================================
// TYPES V2 - HUMAN-IN-THE-LOOP
// ============================================

export interface UserCredits {
  credits: number
  plan: 'FREE' | 'PRO'
  plan_name: string
  next_reset_at: string | null
}

export interface JobFilters {
  min_salary?: number
  remote_only: boolean
  exclude_agencies: boolean
  max_days_old: number
}

export interface SearchStartRequest {
  job_title: string
  location: string
  contract_type: string
  work_type: string
  experience_level: string
  filters?: JobFilters
  cv_url?: string
}

export interface SearchStartResponse {
  application_id: string
  status: 'SEARCHING' | 'WAITING_SELECTION' | 'FAILED'
  message: string
  credits_remaining: number
}

export interface JobResultItem {
  id: string
  title: string
  company: string
  location: string
  url: string
  date_posted?: string
  is_remote: boolean
  work_type?: string
  salary_warning: boolean
  is_agency: boolean
  source?: string
}

export interface ApplicationResults {
  application_id: string
  status: string
  total_found: number
  jobs: JobResultItem[]
  message: string
}

export interface SelectJobsResponse {
  status: string
  message: string
  selected_count: number
}

export interface ApplicationV2 {
  id: string
  status: string
  job_title: string
  location: string
  created_at: string
  updated_at: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Récupère le token JWT de l'utilisateur connecté via Supabase
 */
export async function getAuthToken(): Promise<string | null> {
  // Vérifier si Supabase est configuré
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }

  try {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (error) {
    console.error('Erreur récupération token:', error)
    return null
  }
}

/**
 * Effectue une requête API avec authentification optionnelle
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  }

  // Ajouter le token si disponible
  const token = await getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (requireAuth) {
    throw new Error('Authentification requise')
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expirée, veuillez vous reconnecter')
    }
    if (response.status === 429) {
      const data = await response.json()
      throw new Error(`Trop de requêtes. Réessayez dans ${data.retry_after || 60} secondes`)
    }
    const error = await response.json().catch(() => ({ detail: 'Erreur serveur' }))
    throw new Error(error.detail || `Erreur ${response.status}`)
  }

  return response.json()
}

// ============================================
// API PUBLIQUE (pas d'auth requise)
// ============================================

/**
 * Submit a job application
 * Note: Passe le user_id si l'utilisateur est connecté
 */
export async function submitApplication(data: CandidateData): Promise<ApplicationResult> {
  // Récupérer l'ID utilisateur si connecté
  let userId: string | undefined = data.user_id
  
  if (!userId) {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    } catch {
      // Pas de problème, l'utilisateur n'est peut-être pas connecté
    }
  }

  return apiRequest<ApplicationResult>('/api/v2/apply', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      user_id: userId
    }),
  })
}

/**
 * Check API health status
 */
export async function checkHealth(): Promise<HealthCheck> {
  return apiRequest<HealthCheck>('/health')
}

/**
 * Check task queue status
 */
export async function checkTasksHealth(): Promise<{
  tasks: { pending: number; processing: number; done: number; failed: number }
  cache: { total: number; active: number; expired: number }
}> {
  return apiRequest('/health/tasks')
}

// ============================================
// API AUTHENTIFIÉE (JWT requis)
// ============================================

/**
 * Get current user info (test d'authentification)
 */
export async function getCurrentUser(): Promise<{ user_id: string; authenticated: boolean }> {
  return apiRequest('/api/v2/me', {}, true)
}

/**
 * Get user's applications history via API authentifiée
 * 
 * Utilise le JWT pour respecter les RLS Supabase côté backend.
 */
export async function getMyApplications(): Promise<UserApplicationsResponse> {
  return apiRequest<UserApplicationsResponse>('/api/v2/applications', {}, true)
}

/**
 * Récupère les candidatures avec extraction des données plates
 * (Wrapper pratique pour l'UI)
 */
export async function getMyApplicationsFlat(): Promise<Application[]> {
  try {
    const response = await getMyApplications()
    
    // Extraire toutes les applications de tous les candidats
    const allApplications: Application[] = []
    for (const candidate of response.applications) {
      if (candidate.applications) {
        allApplications.push(...candidate.applications)
      }
    }
    
    // Trier par date décroissante
    return allApplications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  } catch (error) {
    console.error('Erreur récupération applications:', error)
    return []
  }
}

// ============================================
// UPLOAD (à implémenter côté backend)
// ============================================

/**
 * Upload CV file and get URL
 * Note: Cet endpoint n'existe pas encore côté backend
 */
export async function uploadCV(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const token = await getAuthToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/api/v2/upload-cv`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Erreur lors du téléchargement du CV')
  }

  const result = await response.json()
  return result.url
}



// ============================================
// API V2 - HUMAN-IN-THE-LOOP WORKFLOW
// ============================================

/**
 * Get user's credits status
 */
export async function getCredits(): Promise<UserCredits> {
  return apiRequest<UserCredits>('/api/v2/credits', {}, true)
}

/**
 * Start a new job search (async)
 * Returns an application ID for polling
 */
export async function startSearch(data: SearchStartRequest): Promise<SearchStartResponse> {
  return apiRequest<SearchStartResponse>('/api/v2/search/start', {
    method: 'POST',
    body: JSON.stringify(data)
  }, true)
}

/**
 * Poll for search results
 * Keep calling until status !== 'SEARCHING'
 */
export async function getSearchResults(appId: string): Promise<ApplicationResults> {
  return apiRequest<ApplicationResults>(`/api/v2/applications/${appId}/results`, {}, true)
}

/**
 * Select jobs from search results (1-5 jobs)
 * Triggers AI analysis
 */
export async function selectJobs(appId: string, jobIds: string[]): Promise<SelectJobsResponse> {
  return apiRequest<SelectJobsResponse>(`/api/v2/applications/${appId}/select`, {
    method: 'POST',
    body: JSON.stringify({ selected_job_ids: jobIds })
  }, true)
}

/**
 * Get user's V2 applications list
 */
export async function getApplicationsV2(limit: number = 20): Promise<{
  count: number
  applications: ApplicationV2[]
}> {
  return apiRequest(`/api/v2/applications?limit=${limit}`, {}, true)
}
