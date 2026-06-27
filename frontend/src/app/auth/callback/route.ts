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
  const next = searchParams.get('next') ?? '/dashboard'

  // Si pas de code, rediriger vers login avec erreur
  if (!code) {
    console.error('OAuth callback: no code parameter found')
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`)
  }

  // Vérifier que Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('OAuth callback: Supabase env vars missing')
    return NextResponse.redirect(`${origin}/login?error=oauth_config_missing`)
  }

  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error.message, error.status)
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
    }

    // Session échangée avec succès — rediriger vers le dashboard
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    let redirectUrl: string
    if (isLocalEnv) {
      redirectUrl = `${origin}${next}`
    } else if (forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`
    } else {
      redirectUrl = `${origin}${next}`
    }

    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('OAuth callback exception:', err)
    return NextResponse.redirect(`${origin}/login?error=oauth_exception`)
  }
}
