import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Route de callback OAuth pour Supabase.
 * 
 * Cette route est appelée par Supabase après l'authentification OAuth (Google/Microsoft).
 * Elle échange le code d'autorisation contre une session utilisateur valide.
 * 
 * URL à configurer dans Supabase Dashboard:
 * - Dev: http://localhost:3000/auth/callback
 * - Prod: https://votre-domaine.com/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next' est le paramètre où rediriger après succès (ex: /dashboard)
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Succès: redirection vers le dashboard ou la page demandée
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    // Log l'erreur pour le debugging
    console.error('OAuth callback error:', error.message)
  }

  // En cas d'erreur ou code manquant, retour au login avec un message
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
