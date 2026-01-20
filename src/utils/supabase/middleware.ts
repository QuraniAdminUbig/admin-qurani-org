import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Don't redirect if user is on auth callback or auth pages
  const pathname = request.nextUrl.pathname
  const isAuthCallback = pathname.startsWith("/auth/callback")
  const isLoginPage = pathname.startsWith("/login")
  const isRegisterPage = pathname.startsWith("/register")
  const isHomePage = pathname === "/"
  const isDashboard = pathname.startsWith("/dashboard")
  const isRequiredPage = pathname.startsWith("/required")
  const isAdminRoute = pathname.startsWith("/admin")
  const isBlockedPage = pathname.startsWith("/blocked")

  // If user exists, check if they have username and handle routing accordingly
  if (user && !isAuthCallback && !isLoginPage && !isRegisterPage) {
    try {
      // Optimize query to reduce response size
      const { data: userProfile, error } = await supabase
        .from("user_profiles")
        .select("username, role, isBlocked")
        .eq("auth", user.id)
        .single()

      const hasUsername = !(
        error?.code === "PGRST116" || !userProfile?.username
      )
      const userRole = userProfile?.role || "member"
      const isBlocked = userProfile?.isBlocked || false

      // Check if user is blocked - redirect to blocked page (except if already on blocked page)
      if (isBlocked && !isBlockedPage) {
        const url = request.nextUrl.clone()
        url.pathname = "/blocked"
        return NextResponse.redirect(url)
      }

      // If user is not blocked but trying to access blocked page, redirect to dashboard
      if (!isBlocked && isBlockedPage) {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }

      // If user has username but is trying to access /required, redirect to dashboard
      if (hasUsername && isRequiredPage) {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }

      // ADMIN-ONLY ACCESS: Redirect non-privileged users to unauthorized page
      // Allowed roles: admin, billing, support
      const isUnauthorizedPage = pathname.startsWith("/unauthorized")
      const allowedRoles = ["admin", "billing", "support"]

      if (!allowedRoles.includes(userRole) && !isUnauthorizedPage) {
        console.warn("Unauthorized access attempt:", { userId: user.id, role: userRole })
        const url = request.nextUrl.clone()
        url.pathname = "/unauthorized"
        return NextResponse.redirect(url)
      }

      // If privileged user tries to access unauthorized page, redirect to dashboard
      if (allowedRoles.includes(userRole) && isUnauthorizedPage) {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }

    } catch (error) {
      console.error("Error checking username in middleware:", error)
      // Don't block access on error - let the page handle it
    }
  }

  // If user exists and is on auth pages (and has username), redirect to dashboard
  if (user && (isLoginPage || isRegisterPage || isHomePage)) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // If no user and trying to access protected routes, redirect to login
  if (
    !user &&
    !isAuthCallback &&
    !isLoginPage &&
    !isRegisterPage &&
    !isHomePage &&
    (isDashboard ||
      isRequiredPage ||
      isAdminRoute ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/grup") ||
      pathname.startsWith("/notifikasi"))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
