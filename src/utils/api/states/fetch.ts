"use server";

import { createClient } from "@/utils/supabase/server";

export async function fetchStates(country_id?: number) {
  const supabase = await createClient();
  let query = supabase
    .from("states")
    .select("id, name, country_id")
    .order("name", { ascending: true });

  if (country_id) {
    query = query.eq("country_id", country_id);
  }

  const { data, error } = await query;
  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: "Provinces fetched successfully", data };
}

export async function fetchStatesById(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("states")
    .select("id, name, country_id")
    .eq("id", id)
    .single();
  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: "Provinces fetched successfully", data };
}
