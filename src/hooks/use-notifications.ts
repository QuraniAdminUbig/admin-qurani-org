"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useNotifications(userId?: string, viewMode?: string) {
  // Build URL with viewMode parameter
  const apiUrl = userId
    ? `/api/notifications?userId=${userId}${viewMode ? `&viewMode=${viewMode}` : ''}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000, // 30 detik
      shouldRetryOnError: false, // Prevent infinite loop on 500 errors
    }
  );

  return {
    notifications: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
