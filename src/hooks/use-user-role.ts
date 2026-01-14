"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "./use-auth";

type UserRole = "admin" | "member";

export function useUserRole() {
  const { user } = useAuth();
  const userId = user?.id;

  // Fungsi fetch role dari Supabase
  const fetchRole = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("auth", userId)
      .single();

    if (error) throw error;
    const role = (data?.role as UserRole) || "member";

    // Simpan ke localStorage agar cepat di render berikutnya
    if (typeof window !== "undefined") {
      localStorage.setItem("userRole", role);
    }

    return role;
  };

  // Ambil nilai awal dari localStorage (kalau ada) dan validasi
  const initialRole: UserRole | null = (() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("userRole");
    return stored === "admin" || stored === "member" ? stored : null;
  })();

  const {
    data: role = initialRole,
    error,
    isLoading,
  } = useSWR<UserRole | null>(
    userId ? ["user_role", userId] : null,
    fetchRole,
    {
      fallbackData: initialRole,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 60, // cache 1 jam
    }
  );

  // Sinkronkan localStorage bila user logout (userId hilang)
  useEffect(() => {
    if (!userId && typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
  }, [userId]);

  return {
    role,
    isAdmin: role === "admin",
    isMember: role === "member",
    isLoading: !role && isLoading,
    error,
  };
}
