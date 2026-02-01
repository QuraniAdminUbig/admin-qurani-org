"use client";

import { useAuthContext } from "@/components/providers/auth-provider";

// Re-export hook to maintain compatibility with existing components
export function useAuth() {
  const {
    user,
    profile,
    customUser,
    userId,
    authId,
    loading,
    error,
    signOut,
    isAuthenticated,
    refreshProfile,
  } = useAuthContext();

  return {
    user,
    profile,
    userId,
    authId,
    loading,
    error,
    signOut,
    isAuthenticated,
    refreshProfile,
    // For backward compatibility
    myquraniUser: customUser ? {
      id: Number(customUser.userId),
      email: customUser.email,
      name: customUser.name,
      role: 'member',
    } : null,
    isMyQuraniAuth: !!customUser,
  };
}
