import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Only handle auth, no i18n routing
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - clear-session (session clearing page)
     * - api/auth/force-logout (force logout endpoint)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|clear-session|api/auth/force-logout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
