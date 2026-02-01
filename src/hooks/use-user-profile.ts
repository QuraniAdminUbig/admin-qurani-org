// hooks/useUserProfile.ts
"use client";

import useSWR from "swr";
import { UserProfile } from "@/types/database.types";

const fetcher = async (url: string): Promise<UserProfile> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch profile");
  const { profile } = await res.json();
  return profile;
};

export function useUserProfile(userId: string | undefined | null) {
  // If userId is undefined/null or "me", use "me" endpoint directly
  const endpoint = userId && userId !== "0" && userId !== "me"
    ? `/api/profile?userId=${userId}`
    : `/api/me`;

  const { data, error, isLoading, mutate } = useSWR(
    endpoint,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes cache
      errorRetryCount: 2,
    }
  );

  return {
    profile: data,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
