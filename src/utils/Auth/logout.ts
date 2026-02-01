"use client"

import { createClient } from "../supabase/client";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export default async function signOut(status: boolean, router?: AppRouterInstance) {
  if (!status) return; // jika tidak melanjutkan, keluar dari fungsi

  try {
    // Clear MyQurani API tokens from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('myqurani_auth');
      localStorage.removeItem('myqurani_access_token');
      localStorage.removeItem('myqurani_refresh_token');
      localStorage.removeItem('myqurani_user');

      // Clear all ticket cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('ticket_cache_') || key.startsWith('ticket_replies_')) {
          localStorage.removeItem(key);
        }
      });
    }

    // Clear cookies by setting them to expire
    document.cookie = 'myqurani_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'myqurani_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Try Supabase signout as well
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error('Error during signout:', error);
  }

  // ✅ Always redirect to login page
  if (router) {
    router.push("/login");
    router.refresh();
  } else {
    // Fallback - force full page redirect
    window.location.href = "/login";
  }
}
