"use client";

import { useAuthContext } from "@/components/providers/auth-provider";

/**
 * ⚠️  TEMPORARY: Set to true to bypass auth for demo/presentation purposes.
 * This ensures the client-side UI doesn't get stuck in a loading state.
 */
const BYPASS_AUTH_FOR_DEMO = true;

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

  // Mock profile for demo if none exists
  const mockProfile = {
    id: "demo-user",
    name: "Fatkul Amri",
    username: "fatkul",
    email: "fatkul@example.com",
    avatar: "/icons/Qurani - Logo Green.png",
    role: "admin"
  };

  if (BYPASS_AUTH_FOR_DEMO) {
    return {
      user: user || ({} as any),
      profile: profile || mockProfile,
      userId: userId || "demo-user",
      authId: authId || "demo-user",
      loading: false, // Force loading to false
      error: null,
      signOut,
      isAuthenticated: true, // Force authenticated
      refreshProfile,
      myquraniUser: {
        id: 1,
        email: "fatkul@example.com",
        name: "Fatkul Amri",
        role: 'admin',
      },
      isMyQuraniAuth: true,
    };
  }

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
