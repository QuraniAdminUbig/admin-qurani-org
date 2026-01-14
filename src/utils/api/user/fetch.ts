"use server";

import { UserProfile, UserProfileWithGmailAvatar } from "@/types/database.types";
import { createClient } from "@/utils/supabase/server";

export const getUsers = async () => {
  const supabase = await createClient();
  
  // Get user profiles first
  const { data: userProfiles, error: userError } = await supabase
    .from("user_profiles")
    .select("*")
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  if (userError) {
    return {
      success: false,
      message: userError.message,
    };
  }

  // Convert to UserProfileWithGmailAvatar format
  // gmail_avatar is a virtual field for Gmail photo fallback, not stored in DB
  const usersWithGmailAvatar = userProfiles?.map(user => ({
    ...user,
    gmail_avatar: null as string | null // Virtual field for Gmail photo fallback
  }));

  return {
    success: true,
    message: "users fetched successfully",
    data: usersWithGmailAvatar as UserProfileWithGmailAvatar[],
  };
};

export const getUserBySearch = async (search: string) => {
  const supabase = await createClient();
  
  // First get user profiles that match search criteria
  const { data: userProfiles, error: userError } = await supabase
    .from("user_profiles")
    .select("*")
    .like("username", `%${search}%`)
    .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    .order("name", { ascending: true })
    .order("role", { ascending: true });

  if (userError) {
    return {
      success: false,
      message: userError.message,
    };
  }

  // Convert to UserProfileWithGmailAvatar format
  // gmail_avatar is a virtual field for Gmail photo fallback, not stored in DB
  const usersWithGmailAvatar = userProfiles?.map(user => ({
    ...user,
    gmail_avatar: null as string | null // Virtual field for Gmail photo fallback
  }));

  return {
    success: true,
    message: "users fetched successfully",
    data: usersWithGmailAvatar as UserProfileWithGmailAvatar[],
  };
};

export const getUserById = async (id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (data.length === 0) {
    return {
      success: false,
      message: "user not found",
    };
  }

  return {
    success: true,
    message: "user get by id successfully",
    data: data as UserProfile,
  };
};

export const getUserByUsername = async (username: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("username", `@${username}`)
    .single();

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (!data) {
    return {
      success: false,
      message: "user not found",
    };
  }

  return {
    success: true,
    message: "user get by username successfully",
    data: data as UserProfile,
  };
};

export const checkUserHasUsername = async (userId: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // User profile doesn't exist
      return {
        success: true,
        hasUsername: false,
        profileExists: false,
      };
    }
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    hasUsername: !!data?.username,
    profileExists: true,
  };
};
