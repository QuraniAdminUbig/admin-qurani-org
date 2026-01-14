"use client"

import { createClient } from "../supabase/client";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export default async function signOut(status: boolean, router?: AppRouterInstance) {
  if (!status) return; // jika tidak melanjutkan, keluar dari fungsi
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });
  if (!error) {
    // ✅ SPA navigation menggunakan Next.js router
    if (router) {
      router.push("/");
      router.refresh();
    } else {
      // Fallback untuk backward compatibility
      window.location.href = "/";
    }
  }
}
