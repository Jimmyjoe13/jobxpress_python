import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Vérifie si la route est privée (ne doit pas être indexée par Google)
 */
function isPrivateRoute(pathname: string): boolean {
  const privatePatterns = ['/dashboard', '/api', '/auth']
  return privatePatterns.some(pattern => pathname.startsWith(pattern))
}

/**
 * Ajoute le header X-Robots-Tag pour empêcher l'indexation des routes privées
 */
function addNoIndexHeader(response: NextResponse, pathname: string): NextResponse {
  if (isPrivateRoute(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const response = NextResponse.next({ request })
    return addNoIndexHeader(response, pathname)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Protected routes - redirect to login if not authenticated
    // Only protect /dashboard routes
    if (
      !user &&
      request.nextUrl.pathname.startsWith('/dashboard')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirectResponse = NextResponse.redirect(url)
      return addNoIndexHeader(redirectResponse, pathname)
    }

    return addNoIndexHeader(supabaseResponse, pathname)
  } catch (error) {
    console.error('Middleware error:', error)
    const response = NextResponse.next({ request })
    return addNoIndexHeader(response, pathname)
  }
}

