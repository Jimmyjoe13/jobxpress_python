const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

export interface ApplicationResult {
  status: string
  message: string
  event_id: string
}

export interface HealthCheck {
  status: string
  checks: Record<string, string>
  version: string
  environment: string
}

/**
 * Submit a job application
 */
export async function submitApplication(data: CandidateData): Promise<ApplicationResult> {
  const response = await fetch(`${API_BASE_URL}/api/v2/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Erreur lors de la soumission')
  }

  return response.json()
}

/**
 * Check API health status
 */
export async function checkHealth(): Promise<HealthCheck> {
  const response = await fetch(`${API_BASE_URL}/health`)
  
  if (!response.ok) {
    throw new Error('API indisponible')
  }

  return response.json()
}

/**
 * Get user's applications history
 */
export async function getApplications(userId: string): Promise<JobOffer[]> {
  const response = await fetch(`${API_BASE_URL}/api/v2/applications?user_id=${userId}`)
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des candidatures')
  }

  return response.json()
}

/**
 * Upload CV file and get URL
 */
export async function uploadCV(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/v2/upload-cv`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Erreur lors du téléchargement du CV')
  }

  const result = await response.json()
  return result.url
}
