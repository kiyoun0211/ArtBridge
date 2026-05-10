import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: call getClaims() immediately after createServerClient.
  // Do NOT insert any code between them.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // TODO(plan-04): role-based redirects go here.
  // In PLAN-04, read user role from profiles table and redirect:
  //   - buyer visiting /artist/* → redirect to /buyer/dashboard
  //   - artist visiting /buyer/* → redirect to /artist/dashboard
  //   - unauthenticated visiting protected paths → redirect to /login
  //
  // For PLAN-01, all routes (/, /login, /signup) are public.
  // The critical invariant for this plan: getClaims() is called and the
  // cookie write-back path (request.cookies.set + supabaseResponse.cookies.set
  // in setAll) works. That alone refreshes sessions.
  void user

  return supabaseResponse
}
