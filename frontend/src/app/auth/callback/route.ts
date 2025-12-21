import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Créer la réponse de redirection
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // En production, utiliser l'hôte forwarded si disponible
      let redirectUrl: string
      if (isLocalEnv) {
        redirectUrl = `${origin}${next}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      } else {
        redirectUrl = `${origin}${next}`
      }
      
      return NextResponse.redirect(redirectUrl)
    }
    
    // Log l'erreur pour le debugging
    console.error('OAuth callback error:', error.message)
  }

  // En cas d'erreur ou code manquant, retour au login avec un message
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
