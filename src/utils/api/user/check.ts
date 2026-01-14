"use server";

import { createClient } from "@/utils/supabase/server";
import { normalizeUsername } from "@/utils/validation/username";

export const checkUsernameAvailability = async (username: string) => {
  const supabase = await createClient();

  const normalizedUsername = normalizeUsername(username);

  // Cek apakah username sudah digunakan
  const { data: existingUser, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("username", `${normalizedUsername}`)
    .single();

  if (error && error.code !== "PGRST116") {
    return {
      success: false,
      message: error.message,
    };
  }

  // Username tersedia jika tidak ada user yang menggunakan atau user yang menggunakan adalah user saat ini
  const isAvailable = !existingUser;

  return {
    success: true,
    available: isAvailable,
    username: normalizedUsername,
  };
};
