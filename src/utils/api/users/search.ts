"use server";

import { createClient } from "@/utils/supabase/server";

export interface SearchUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  email?: string;
}

export async function searchUsers(
  searchQuery: string,
  currentUserId: string,
  limit: number = 10
): Promise<{ users: SearchUser[]; total: number }> {
  try {
    if (!searchQuery.trim()) {
      return { users: [], total: 0 };
    }

    const supabase = await createClient();

    // Search users by full_name and username, exclude current user
    // Use more efficient query without count for faster response
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        `
        id,
        name,
        username,
        avatar
      `
      )
      .neq("id", currentUserId)
      .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
      .limit(limit)
      .order("name");

    if (error) {
      console.error("Error searching users:", error);
      throw error;
    }

    // Transform data to match SearchUser interface
    const users: SearchUser[] = (data || []).map((user) => {
      // Prioritas avatar: 1. profile_user (jika ada dan tidak kosong), 2. avatar (dari Google)
      let avatarUrl = "";
      if (user.avatar && user.avatar.trim() !== "") {
        avatarUrl = user.avatar;
      }

      return {
        id: user.id,
        name: user.name || "Unknown",
        username: user.username || "",
        avatar: avatarUrl,
      };
    });

    return {
      users,
      total: users.length, // Use actual results length instead of expensive count query
    };
  } catch (error) {
    console.error("Error in searchUsers:", error);
    throw error;
  }
}
