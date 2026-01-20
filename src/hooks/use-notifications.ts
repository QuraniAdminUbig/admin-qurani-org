"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useNotifications(userId?: string) {
  // Build URL with userId parameter only
  const apiUrl = userId
    ? `/api/notifications?userId=${userId}`
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
