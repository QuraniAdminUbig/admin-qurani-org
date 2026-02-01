"use client";

/**
 * Notifications Hook
 * 
 * NOTE: Supabase notifications disabled.
 * TODO: Replace with MyQurani API notifications endpoint when available.
 */

export function useNotifications(userId?: string) {
  // Disabled - no longer fetching from Supabase
  // Return empty notifications without making any request

  return {
    notifications: [],
    loading: false,
    error: null,
    refresh: () => Promise.resolve([]),
  };
}
