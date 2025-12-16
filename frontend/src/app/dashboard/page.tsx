"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { FileText, TrendingUp, Clock, ArrowRight, Loader2, ExternalLink, Star } from "lucide-react"

interface UserData {
  firstName: string
  email: string
  userId: string | null
}

interface Application {
  id: string
  company_name: string
  job_title: string
  job_url: string
  match_score: number
  status: string
  created_at: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setUser({ firstName: "Utilisateur", email: "", userId: null })
        setIsLoading(false)
        return
      }

      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          // Récupérer le profil depuis user_profiles
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('id', authUser.id)
            .single()
          
          setUser({
            firstName: profile?.first_name || authUser.user_metadata?.first_name || "Utilisateur",
            email: authUser.email || "",
            userId: authUser.id
          })

          // Récupérer les candidatures via la table candidates -> applications
          const { data: candidate } = await supabase
            .from('candidates')
            .select('id')
            .eq('user_id', authUser.id)
            .single()

          if (candidate) {
            const { data: apps } = await supabase
              .from('applications')
              .select('*')
              .eq('candidate_id', candidate.id)
              .order('created_at', { ascending: false })
              .limit(10)

            if (apps) {
              setApplications(apps)
            }
          }
        } else {
          setUser({ firstName: "Utilisateur", email: "", userId: null })
        }
      } catch (err) {
        console.error("Error loading data:", err)
        setUser({ firstName: "Utilisateur", email: "", userId: null })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const firstName = user?.firstName || "Utilisateur"
  const applicationCount = applications.length

  // Formater la date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  // Couleur du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Bonjour, {firstName} 👋
        </h1>
        <p className="text-gray-600">
          Bienvenue sur votre tableau de bord JobXpress
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nouvelle candidature
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Lancez une nouvelle recherche d&apos;emploi automatisée
            </p>
            <Link href="/dashboard/apply">
              <Button className="group">
                Commencer
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Statistiques
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Suivez vos candidatures et analysez vos résultats
            </p>
            <div className="text-2xl font-bold text-gray-900">{applicationCount}</div>
            <p className="text-sm text-gray-500">candidature{applicationCount > 1 ? 's' : ''} générée{applicationCount > 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-0 shadow-md sm:col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Dernière activité
            </h3>
            {applications[0] ? (
              <>
                <p className="text-gray-600 text-sm mb-2 truncate">
                  {applications[0].job_title}
                </p>
                <span className="text-sm text-gray-400">
                  {formatDate(applications[0].created_at)}
                </span>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-sm mb-4">
                  Aucune candidature pour le moment
                </p>
                <span className="text-sm text-gray-400">
                  Lancez votre première recherche !
                </span>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Dernières candidatures</CardTitle>
          <CardDescription>
            Historique de vos recherches d&apos;emploi récentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length > 0 ? (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {app.job_title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(app.match_score)}`}>
                        <Star className="w-3 h-3 inline mr-1" />
                        {app.match_score}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{app.company_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(app.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full capitalize">
                      {app.status}
                    </span>
                    {app.job_url && (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-600" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Aucune candidature</p>
              <p className="text-sm mb-4">
                Commencez par lancer votre première recherche d&apos;emploi
              </p>
              <Link href="/dashboard/apply">
                <Button variant="outline">Lancer une recherche</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
