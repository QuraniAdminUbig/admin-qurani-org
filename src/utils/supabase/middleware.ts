import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * User info from MyQurani token cookie
 */
interface MyQuraniUser {
  id: number;
  email: string;
  name?: string;
  role?: string;
}


/**
 * Get user from MyQurani token cookie
 */
function getMyQuraniUser(request: NextRequest): MyQuraniUser | null {
  try {
    const accessToken = request.cookies.get("myqurani_access_token")?.value;
    const userCookie = request.cookies.get("myqurani_user")?.value;

    if (!accessToken) return null;

    if (userCookie) {
      return JSON.parse(userCookie) as MyQuraniUser;
    }

    // If we have token but no user cookie, still consider authenticated
    return { id: 0, email: "", role: "member" };
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  // Define route types
  const isAuthCallback = pathname.startsWith("/auth/callback") || pathname.startsWith("/oauth/callback");
  const isLoginPage = pathname.startsWith("/login");
  const isRegisterPage = pathname.startsWith("/register");
  const isHomePage = pathname === "/";
  const isDashboard = pathname.startsWith("/dashboard");
  const isProtectedRoute =
    isDashboard ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/administrator") ||
    pathname.startsWith("/master-data") ||
    pathname.startsWith("/notification") ||
    pathname.startsWith("/settings");
  const isBlockedPage = pathname.startsWith("/blocked");



  // ============================================
  // STEP 1: Check for MyQurani API token first
  // ============================================
  const myquraniUser = getMyQuraniUser(request);

  if (myquraniUser) {
    console.log("[Middleware] MyQurani user found:", myquraniUser?.email || "token-only");

    // Redirect authenticated user away from login/register pages
    if (isLoginPage || isRegisterPage || isHomePage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Allow access to protected routes
    return response;
  }

  // ============================================
  // STEP 2: Fallback to Supabase session check
  // ============================================
  let supabaseUser = null;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    supabaseUser = user;

    if (supabaseUser && !isAuthCallback && !isLoginPage && !isRegisterPage) {
      console.log("[Middleware] Supabase user found:", supabaseUser.email);

      // Check user profile from Supabase
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("username, role, isBlocked")
        .eq("auth", supabaseUser.id)
        .single();

      const isBlocked = userProfile?.isBlocked || false;

      // Check if user is blocked
      if (isBlocked && !isBlockedPage) {
        const url = request.nextUrl.clone();
        url.pathname = "/blocked";
        return NextResponse.redirect(url);
      }
    }
  } catch (error) {
    console.error("[Middleware] Supabase check error:", error);
  }

  // ============================================
  // STEP 3: Handle unauthenticated users
  // ============================================
  const isAuthenticated = myquraniUser !== null || supabaseUser !== null;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && (isLoginPage || isRegisterPage || isHomePage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isAuthCallback && !isLoginPage && !isRegisterPage && !isHomePage && isProtectedRoute) {
    console.log("[Middleware] No auth found, redirecting to login");
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
