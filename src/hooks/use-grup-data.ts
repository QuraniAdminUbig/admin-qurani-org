"use client";

import useSWR from "swr";
import type { MappedGroup, SearchGroupResult } from "@/types/grup";
import { useEffect, useState } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

// Mutation helper for POST requests
const postFetcher = async (url: string, data: Record<string, unknown>) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to process request");
  return res.json();
};

export interface GroupsDataParams {
  userId?: string;
  action?: "getGroups" | "getAllGroups";
  showAll?: boolean;
}

export interface SearchGroupsParams {
  userId?: string;
  query?: string;
  search?: boolean;
}

// Define interface for raw group data from API
interface RawGroupData {
  role: string;
  grup: {
    id: string;
    name: string;
    description?: string;
    photo_path?: string;
    is_private: boolean;
    created_at: string;
    deleted_at?: string | null;
    country_id?: number | null;
    country_name?: string | null;
    state_id?: number | null;
    state_name?: string | null;
    city_id?: number | null;
    city_name?: string | null;
    grup_members?: Array<{ count: number }>;
    category: {
      id: number
    };
    type?: "public" | "private" | "secret" | null;
  };
  // New fields for all groups view
  is_member?: boolean;
  user_role?: "admin" | "member" | "owner" | null;
}

// Helper function to map server data to MappedGroup format
function mapGroupData(rawData: RawGroupData[]): MappedGroup[] {
  if (!rawData || !Array.isArray(rawData)) {
    return [];
  }

  return rawData
    .map((item) => {
      // Safely access nested properties
      const grup = item?.grup;
      if (!grup) {
        console.warn("Invalid group data structure:", item);
        return null;
      }

      return {
        id: grup.id,
        name: grup.name || "Unknown Group",
        description: grup.description || "",
        avatar: grup.photo_path
          ? `${
              process.env.NEXT_PUBLIC_SUPABASE_URL || ""
            }/storage/v1/object/public/qurani_storage/${grup.photo_path}`
          : undefined,
        memberCount: 0, // Will be calculated if needed
        isPrivate: grup.is_private || false,
        role: item.role || "member",
        lastActivity: "", // Not available in current data structure
        createdAt: grup.created_at || new Date().toISOString(),
        total_members: grup.grup_members?.[0]?.count || 0,
        category: grup.category?.id || 0, // Keep as number for filter comparison
        deleted_at: grup.deleted_at,
        countryId: grup.country_id || null,
        countryName: grup.country_name || "",
        stateId: grup.state_id || null, // Fix: use stateId instead of provinceId 
        stateName: grup.state_name || "", // Fix: use stateName instead of provinceName
        cityId: grup.city_id || null,
        cityName: grup.city_name || "",
        // New fields for all groups view
        is_member: item.is_member,
        user_role: item.user_role,
        type: grup.type
      };
    })
    .filter(Boolean) as MappedGroup[]; // Remove null entries
}

/**
 * Hook untuk fetching groups data dengan SWR caching
 */
export function useGroupsData(params: GroupsDataParams) {
  const { userId, action, showAll = false } = params;
  
  // Determine action based on showAll parameter if not explicitly set
  const finalAction = action || (showAll ? "getAllGroups" : "getGroups");

  const url = userId ? `/api/grup?userId=${userId}&action=${finalAction}` : null;

  const [isFirstRender, setIsFirstRender] = useState(true);

  const { data, error, isLoading, isValidating, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute cache (groups don't change as frequently)
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  });

  // 🔄 Update status render pertama
  useEffect(() => {
    if (isLoading || data || error) {
      setIsFirstRender(false);
    }
  }, [isLoading, data, error]);

  // ⚙️ Tentukan loading sesungguhnya
  const isActuallyLoading =
    isFirstRender || (!data && (isLoading || isValidating));

  return {
    groupsData: data?.success ? mapGroupData(data.data) : [],
    error: error?.message || (data?.success === false ? data.error : null),
    isLoading: isActuallyLoading,
    refresh: mutate, // Manual refresh function
  };
}

/**
 * Hook untuk search groups dengan SWR caching
 */
export function useSearchGroups(params: SearchGroupsParams) {
  const { userId, query } = params;

  const url =
    userId && query?.trim()
      ? `/api/grup?userId=${userId}&action=searchGroups&query=${encodeURIComponent(
          query
        )}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds cache untuk search results
    errorRetryCount: 1,
  });

  return {
    searchData: data?.success ? (data.data as SearchGroupResult[]) : [],
    error: error?.message || (data?.success === false ? data.error : null),
    isLoading,
    refresh: mutate,
  };
}

// Define interfaces for API responses
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * Hook untuk group mutations (join, leave, create)
 * Returns mutation functions that automatically refresh data
 */
export function useGroupMutations(userId?: string) {
  const { refresh: refreshGroups } = useGroupsData({ userId });

  const joinGroup = async (groupId: string): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "joinGroup",
        userId,
        groupId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to join group");
      }

      // Refresh groups data after successful join
      await refreshGroups();

      return result;
    } catch (error) {
      console.error("Error joining group:", error);
      throw error;
    }
  };

  const requestJoinGroup = async (groupId: string): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "requestJoinGroup",
        userId,
        groupId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to join group");
      }

      // Refresh groups data after successful join
      await refreshGroups();

      return result;
    } catch (error) {
      console.error("Error joining group:", error);
      throw error;
    }
  };

  const leaveGroup = async (groupId: string): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "leaveGroup",
        userId,
        groupId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to leave group");
      }

      // Refresh groups data after successful leave
      await refreshGroups();

      return result;
    } catch (error) {
      console.error("Error leaving group:", error);
      throw error;
    }
  };

  const createGroup = async (groupData: {
    name: string;
    description?: string;
    status: "private" | "public";
  }): Promise<ApiResponse> => {
    if (!userId) throw new Error("User ID is required");

    try {
      const result = await postFetcher("/api/grup", {
        action: "createGroup",
        userId,
        ...groupData,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create group");
      }

      // Refresh groups data after successful creation
      await refreshGroups();

      return result;
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  };

  return {
    joinGroup,
    requestJoinGroup,
    leaveGroup,
    createGroup,
  };
}

/**
 * Hook untuk mengambil detail grup tertentu
 * Menggunakan SWR dengan caching dan auto-refresh
 */
export function useGroupDetail(groupId?: string, userId?: string) {
  const url =
    groupId && userId
      ? `/api/grup?userId=${encodeURIComponent(
          userId
        )}&action=getGroupDetail&groupId=${encodeURIComponent(groupId)}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute cache for group detail
    errorRetryCount: 2,
    onError: (error) => {
      console.error("Error fetching group detail:", error);
    },
  });

  return {
    group: data?.success ? data.data : null,
    isLoading,
    error: error?.message || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}
