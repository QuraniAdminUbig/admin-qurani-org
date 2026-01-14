"use server";

import { createClient } from "../supabase/server";
import { revalidatePath } from "next/cache";

export async function login(formData: FormData) {
  // 1. Ambil data dari FormData
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  // 2. Cari user berdasarkan username dan validasi role admin
  // Username disimpan dengan format @username di database
  const { data: userData, error: userError } = await supabase
    .from("user_profiles")
    .select("email, role, username")
    .eq("username", `@${username.toLowerCase()}`)
    .single();

  // Cek apakah user ditemukan
  if (userError) {
    if (userError.code === "PGRST116") {
      return {
        success: false,
        error: "Username not found",
      };
    }
    return {
      success: false,
      error: "Server error",
    };
  }
  
  if (!userData) {
    return {
      success: false,
      error: "Username not found",
    };
  }

  // 3. Validasi role admin - hanya admin yang boleh login
  if (!userData.role || userData.role.toLowerCase() !== "admin") {
    return {
      success: false,
      error: "Access denied: Admin privileges required",
    };
  }

  // 4. Lakukan otentikasi dengan email yang ditemukan
  const { error } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  });

  // 4. Tangani error dari Supabase
  if (error) {
    // throw new Error() memungkinkan error ditangkap di sisi klien
    // Kita bisa menambahkan pesan error yang lebih spesifik
    if (error.message === "Invalid login credentials") {
      return {
        success: false,
        error: "Invalid username or password",
      };
    }
    // Tangani error lain jika ada
    return {
      success: false,
      error: "Server error",
    };
  }

  // 5. Jika login berhasil, revalidasi cache
  // Ini memastikan data yang dilindungi di halaman dashboard diperbarui
  revalidatePath("/dashboard", "layout");

  // 6. Kembalikan status sukses
  // Ini akan diterima di sisi klien dan digunakan untuk menampilkan toast
  return { success: true } as const;
}
