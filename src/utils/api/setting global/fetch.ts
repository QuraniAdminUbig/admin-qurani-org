"use server";

import { createClient } from "@/utils/supabase/server";
import { SettingGlobal } from "@/types/setting";

export async function fetchSettingGlobal() {
  try {
    // Fetch directly from database (no Redis)
    const supabase = await createClient();

    const { data, error } = await supabase.from("setting_global").select("*");
    if (error) {
      return { status: "error", message: "ada kesalahan setting global" };
    }

    return {
      status: "success",
      data: data as SettingGlobal[],
      source: "database",
    };
  } catch (error) {
    console.log(error);
  }
}

// Helper function to invalidate cache (now a no-op since we removed Redis)
export async function invalidateSettingGlobalCache() {
  // No longer needed, but kept for backward compatibility
  console.log("ℹ️ Cache invalidation called for setting global (Redis removed)");
}
