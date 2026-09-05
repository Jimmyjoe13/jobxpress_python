/**
 * JobXpress API Client
 * 
 * Ce module gère toutes les communications avec l'API backend,
 * y compris l'authentification JWT via Supabase.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================
// TYPES V2 - DEEP EXTRACTION & AI INTELLIGENCE
// ============================================

export interface JobOfferV2 {
  title: string
  company: string
  location?: string
  salary?: string
  description: string
  url: string
  match_score: number
  skills: string[]
  contract_type?: string
  is_remote: boolean
  ai_summary?: string
  cover_letter?: string
}

export interface CandidateProfileV2 {
  job_title: string
  experience_level: string
  top_skills: string[]
  education: string
  preferred_contract: string
  summary: string
}

export interface DeepSearchResponse {
  search_id: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  offers: JobOfferV2[]
  message?: string
}

// ============================================
// TYPES V1 & COMMONS
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
  user_id?: string
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

export interface UserCredits {
  credits: number
  plan: 'FREE' | 'STARTER' | 'PRO'
  plan_name: string
  next_reset_at: string | null
  last_reset?: string | null
  max_credits?: number
  reset_period_days?: number
  jobyjoba_messages_limit?: number
  jobyjoba_is_daily_limit?: boolean
  has_custom_context?: boolean
  price?: number
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
  candidate_email?: string
  first_name?: string
  last_name?: string
  phone?: string
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
  salary?: string
  date_posted?: string
  is_remote: boolean
  work_type?: string
  salary_warning: boolean
  is_agency: boolean
  source?: string
  ai_analysis?: any
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
  tracking_status?: TrackingStatus
  tracking_notes?: TrackingNote[]
  job_title: string
  location: string
  contract_type?: string
  created_at: string
  updated_at: string
  final_choice?: {
    title?: string
    company?: string
    url?: string
    score?: number
  }
  cover_letter_html?: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Récupère le token JWT de l'utilisateur connecté via Supabase
 */
export async function getAuthToken(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_MODE === 'DEVELOPMENT' || process.env.NODE_ENV === 'development') {
    return 'local-dev-token'
  }

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
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?reason=session_expired'
      }
      throw new Error('Session expirée, veuillez vous reconnecter')
    }
    const error = await response.json().catch(() => ({ detail: 'Erreur serveur' }))
    throw new Error(error.detail || `Erreur ${response.status}`)
  }

  return response.json()
}

// ============================================
// V2 API CALLS
// ============================================

export async function getCandidateProfile(): Promise<CandidateProfileV2> {
  return apiRequest<CandidateProfileV2>('/api/v2/profile/structured', {}, true)
}

export async function startDeepSearch(jobTitle: string, location: string): Promise<{ search_id: string }> {
  return apiRequest<{ search_id: string }>('/api/v2/search/deep', {
    method: 'POST',
    body: JSON.stringify({ job_title: jobTitle, location })
  }, true)
}

export async function getDeepSearchResults(searchId: string): Promise<DeepSearchResponse> {
  return apiRequest<DeepSearchResponse>(`/api/v2/search/deep/${searchId}`, {}, true)
}

export async function generateCoverLetterV2(jobUrl: string): Promise<{ letter: string }> {
  return apiRequest<{ letter: string }>('/api/v2/generate-letter', {
    method: 'POST',
    body: JSON.stringify({ url: jobUrl })
  }, true)
}

// ============================================
// V1 & COMMON API CALLS
// ============================================

export async function submitApplication(data: CandidateData): Promise<ApplicationResult> {
  let userId: string | undefined = data.user_id
  if (!userId) {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    } catch {}
  }

  return apiRequest<ApplicationResult>('/api/v2/apply', {
    method: 'POST',
    body: JSON.stringify({ ...data, user_id: userId }),
  })
}

export async function checkHealth(): Promise<HealthCheck> {
  return apiRequest<HealthCheck>('/health')
}

export async function checkTasksHealth(): Promise<any> {
  return apiRequest('/health/tasks')
}

export async function getCurrentUser(): Promise<any> {
  return apiRequest('/api/v2/me', {}, true)
}

export async function deleteAccount(): Promise<any> {
  return apiRequest('/api/v2/profile', { method: 'DELETE' }, true)
}

export async function getAdminUsageStats(days: number = 30): Promise<any> {
  return apiRequest(`/api/v2/admin/usage-stats?days=${days}`, {}, true)
}

export async function getMyApplications(): Promise<UserApplicationsResponse> {
  return apiRequest<UserApplicationsResponse>('/api/v2/applications', {}, true)
}

export async function getMyApplicationsFlat(): Promise<Application[]> {
  try {
    const response = await getMyApplications()
    const allApplications: Application[] = []
    for (const candidate of response.applications) {
      if (candidate.applications) {
        allApplications.push(...candidate.applications)
      }
    }
    return allApplications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  } catch {
    return []
  }
}

export async function uploadCV(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const token = await getAuthToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const response = await fetch(`${API_BASE_URL}/api/v2/upload-cv`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!response.ok) throw new Error('Erreur upload CV')
  const result = await response.json()
  return result.url
}

export async function getCredits(): Promise<UserCredits> {
  return apiRequest<UserCredits>('/api/v2/credits', {}, true)
}

export async function startSearch(data: SearchStartRequest): Promise<SearchStartResponse> {
  return apiRequest<SearchStartResponse>('/api/v2/search/start', {
    method: 'POST',
    body: JSON.stringify(data)
  }, true)
}

export async function getSearchResults(appId: string): Promise<ApplicationResults> {
  return apiRequest<ApplicationResults>(`/api/v2/applications/${appId}/results`, {}, true)
}

export async function selectJobs(appId: string, jobIds: string[]): Promise<SelectJobsResponse> {
  return apiRequest<SelectJobsResponse>(`/api/v2/applications/${appId}/select`, {
    method: 'POST',
    body: JSON.stringify({ selected_job_ids: jobIds })
  }, true)
}

export async function getApplicationsV2(limit: number = 20): Promise<{ count: number; applications: ApplicationV2[] }> {
  return apiRequest(`/api/v2/applications?limit=${limit}`, {}, true)
}

// ============================================
// SUBSCRIPTION & PLANS
// ============================================

export interface PlanDetails {
  key: string; credits: number; reset_days: number; name: string; price: number; jobyjoba_messages: number; jobyjoba_daily_limit: boolean; custom_context: boolean;
}
export interface AvailablePlan extends PlanDetails {
  is_current: boolean; is_upgrade: boolean; is_downgrade: boolean;
}
export interface SubscriptionDetails extends UserCredits {
  credits_progress: number; can_upgrade: boolean; has_stripe_subscription: boolean; upgrade_url: string | null; available_plans: { FREE: AvailablePlan; STARTER: AvailablePlan; PRO: AvailablePlan; }
}
export interface PlansResponse {
  plans: { FREE: PlanDetails; STARTER: PlanDetails; PRO: PlanDetails; }
}

export async function getAvailablePlans(): Promise<PlansResponse> {
  return apiRequest<PlansResponse>('/api/v2/plans')
}

export async function getSubscriptionDetails(): Promise<SubscriptionDetails> {
  return apiRequest<SubscriptionDetails>('/api/v2/subscription', {}, true)
}

// ============================================
// FAVORITES & HISTORY
// ============================================

export interface QuickSearchRequest {
  job_title: string
  location: string
  contract_type: string
  work_type: string
  experience_level: string
}

export interface SearchQuota {
  available: number
  total: number
  reset_at: string
  plan?: string
  searches_unlimited?: boolean
  free_searches_remaining?: number
}

export interface SavedJobItem {
  id: string
  job_data: JobResultItem
  notes?: string
  created_at: string
}

export interface SavedJobResponse {
  count: number
  saved_jobs: SavedJobItem[]
}

export async function quickSearch(data: QuickSearchRequest): Promise<any> {
  return apiRequest('/api/v2/search/quick', { method: 'POST', body: JSON.stringify(data) }, true)
}

export async function saveJob(data: any): Promise<any> {
  return apiRequest('/api/v2/jobs/save', { method: 'POST', body: JSON.stringify(data) }, true)
}

export async function getSavedJobs(limit: number = 50): Promise<SavedJobResponse> {
  return apiRequest<SavedJobResponse>(`/api/v2/jobs/saved?limit=${limit}`, {}, true)
}

export async function updateSavedJobNotes(jobId: string, notes: string): Promise<any> {
  return apiRequest(`/api/v2/jobs/saved/${jobId}?notes=${encodeURIComponent(notes)}`, { method: 'PUT' }, true)
}

export async function deleteSavedJob(id: string): Promise<any> {
  return apiRequest(`/api/v2/jobs/saved/${id}`, { method: 'DELETE' }, true)
}

// ============================================
// DASHBOARD & TRACKING
// ============================================

export interface DashboardStats {
  total_applications: number; total_saved_jobs: number; checklist: { has_profile: boolean; has_cv: boolean; has_searched: boolean; }
}
export type TrackingStatus = 'SAVED' | 'APPLIED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEWED' | 'OFFER_RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
export interface TrackingNote { date: string; note: string; status: string; }

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>('/api/v2/dashboard/stats', { method: 'GET' }, true)
}

export async function getNotifications(limit: number = 20): Promise<any> {
  return apiRequest(`/api/v2/notifications?limit=${limit}`, {}, true)
}

export async function markNotificationRead(notifId: string): Promise<any> {
  return apiRequest(`/api/v2/notifications/${notifId}/read`, { method: 'PATCH' }, true)
}

export async function updateTrackingStatus(appId: string, status: TrackingStatus): Promise<any> {
  return apiRequest(`/api/v2/applications/${appId}/tracking`, { method: 'PATCH', body: JSON.stringify({ tracking_status: status }) }, true)
}

export async function addTrackingNote(appId: string, note: string): Promise<any> {
  return apiRequest(`/api/v2/applications/${appId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }, true)
}

export async function deleteApplicationTracker(appId: string): Promise<any> {
  return apiRequest(`/api/v2/applications/${appId}`, { method: 'DELETE' }, true)
}

export async function getSearchHistory(limit: number = 20): Promise<any> {
  return apiRequest(`/api/v2/search/history?limit=${limit}`, {}, true)
}

export async function deleteSearchHistoryItem(historyId: string): Promise<any> {
  return apiRequest(`/api/v2/search/history/${historyId}`, { method: 'DELETE' }, true)
}

export async function clearSearchHistory(): Promise<any> {
  return apiRequest('/api/v2/search/history', { method: 'DELETE' }, true)
}

export async function getSearchQuota(): Promise<any> {
  return apiRequest('/api/v2/search/quota', {}, true)
}

// ============================================
// CHAT API
// ============================================

export interface GlobalChatMessage {
  role: 'user' | 'assistant' | 'tool'; content: string; timestamp?: string; tool_calls_executed?: any[]; quick_replies?: { label: string; action: string }[]
}
export interface GlobalChatResponse {
  response: string; session_id: string; quick_replies?: any[]; tool_calls_executed?: any[]
}
export interface GlobalChatSession {
  messages: GlobalChatMessage[]
  session_id?: string
  tool_calls_executed?: any[]
}

export async function getProactiveMessage(): Promise<{ message: GlobalChatMessage }> {
  return apiRequest('/api/v2/chat/proactive', {}, true)
}

export async function getGlobalSession(): Promise<GlobalChatSession> {
  return apiRequest('/api/v2/chat/global/session', {}, true)
}

export async function clearGlobalSession(): Promise<any> {
  return apiRequest('/api/v2/chat/global/session', { method: 'DELETE' }, true)
}

export async function sendGlobalChatMessage(message: string): Promise<GlobalChatResponse> {
  return apiRequest('/api/v2/chat/global', { method: 'POST', body: JSON.stringify({ message }) }, true)
}

export async function* sendGlobalChatMessageStream(message: string): AsyncGenerator<any> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/api/v2/chat/global/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify({ message })
  })
  if (!response.ok) throw new Error('Erreur stream')
  const reader = response.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (!line.trim()) continue
      try { yield JSON.parse(line) } catch {}
    }
  }
}

export async function* sendJobyJobaMessageStream(applicationId: string, message: string): AsyncGenerator<any> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/api/v2/chat/send/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify({ application_id: applicationId, message })
  })
  if (!response.ok) throw new Error('Erreur stream')
  const reader = response.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (!line.trim()) continue
      try { yield JSON.parse(line) } catch {}
    }
  }
}
