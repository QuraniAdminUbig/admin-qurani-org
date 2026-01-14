"use server";

import { createClient } from "@/utils/supabase/server";

export async function fetchCountries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("countries")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: "Countries fetched successfully", data };
}
