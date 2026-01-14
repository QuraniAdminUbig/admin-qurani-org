"use client";

import { createClient } from "@/utils/supabase/client";
import useSWR from "swr";

// Type untuk join request dengan user data
export interface RequestJoin {
  id: string;
  grup_id: string;
  user_id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
  } | null;
}

interface RequestJoinResponse {
  success: boolean;
  data?: RequestJoin[];
  error?: string;
}

// Fetcher function untuk SWR
const fetchRequestJoinGrup = async (
  groupId: string
): Promise<RequestJoinResponse> => {
  if (!groupId) {
    return {
      success: false,
      error: "Group ID is required",
    };
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("grup_join_req")
    .select(
      `
      id,
      grup_id,
      user_id,
      status,
      created_at,
      user:user_profiles (
        id,
        username,
        name,
        avatar
      )
    `
    )
    .eq("grup_id", groupId)
    .eq("status", "request")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching join requests:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  // Map data to ensure correct type structure
  type RawRequestJoin = {
    id: string;
    grup_id: string;
    user_id: string;
    status: string;
    created_at: string;
    user:
      | {
          id: string;
          username: string | null;
          name: string | null;
          avatar: string | null;
        }
      | {
          id: string;
          username: string | null;
          name: string | null;
          avatar: string | null;
        }[]
      | null;
  };

  const mappedData: RequestJoin[] = (data || []).map(
    (item: RawRequestJoin) => ({
      id: item.id,
      grup_id: item.grup_id,
      user_id: item.user_id,
      status: item.status,
      created_at: item.created_at,
      user: Array.isArray(item.user) ? item.user[0] || null : item.user || null,
    })
  );

  return {
    success: true,
    data: mappedData,
  };
};

interface UseRequestJoinGrupParams {
  groupId: string | null;
  enabled?: boolean;
}

export function useRequestJoinGrup({
  groupId,
  enabled = true,
}: UseRequestJoinGrupParams) {
  const shouldFetch = groupId && enabled;
  const key = shouldFetch ? `request-join-${groupId}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    shouldFetch ? () => fetchRequestJoinGrup(groupId) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds cache
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  return {
    requests: data?.success ? data.data || [] : [],
    error: error?.message || (data?.success === false ? data.error : null),
    isLoading,
    refresh: mutate,
  };
}
