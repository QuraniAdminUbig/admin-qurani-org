"use client";

import { useAuthContext } from "@/components/providers/auth-provider";

// Re-export hook to maintain compatibility with existing components
export function useAuth() {
  const { user, profile, loading, error, signOut, refreshProfile } = useAuthContext();

  return {
    user,
    profile,
    userId: profile?.id, // XID relasi
    authId: user?.id, // UUID auth
    loading,
    error,
    signOut,
    isAuthenticated: !!user,
    refreshProfile,
  };
}
