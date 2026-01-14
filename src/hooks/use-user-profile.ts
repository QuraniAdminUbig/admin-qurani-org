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
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/profile?userId=${userId}` : null,
    fetcher
  );

  return {
    profile: data,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
