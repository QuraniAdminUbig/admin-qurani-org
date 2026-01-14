"use server";

import { UserProfile } from "@/types/database.types";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername } from "@/utils/validation/username";
import { generateId } from "@/lib/generateId";

export const updateUsername = async (
  userId: string,
  username: string,
  country: { id: string; name: string },
  states: { id: string; name: string },
  city: { id: string; name: string; timezone: string }
) => {
  const supabase = await createClient();

  const normalizedUsername = normalizeUsername(username);

  // Cek apakah username sudah digunakan
  const { data: existingUser, error: checkError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("username", `@${normalizedUsername}`)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    return {
      success: false,
      message: checkError.message,
    };
  }

  if (existingUser && existingUser.id !== userId) {
    return {
      success: false,
      message: "Username is already taken",
    };
  }

  // Update atau insert username
  const formattedUsername = normalizedUsername.startsWith("@")
    ? normalizedUsername
    : `@${normalizedUsername}`;

  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      username: formattedUsername,
      countryId: Number(country.id),
      stateId: Number(states.id),
      cityId: Number(city.id),
      countryName: country.name,
      stateName: states.name,
      cityName: city.name,
      timezone: city.timezone,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating username:", error);
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Username updated successfully",
    data,
  };
};

export const createUserProfile = async (
  authUserId: string,
  email?: string,
  fullName?: string
) => {
  const supabase = await createClient();

  // Generate XID for primary key (id field)
  const profileId = generateId();

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: profileId,        // XID primary key
      auth: authUserId,     // UUID foreign key to auth.users.id
      email: email,
      name: fullName,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "User profile created successfully",
    data,
  };
};

export const updateUserProfile = async (userId: string, data: UserProfile) => {
  const supabase = await createClient();

  // Ensure username starts with @ but avoid double @
  const formattedUsername = data.username?.startsWith("@")
    ? data.username
    : `@${data.username || ''}`;

  // Create clean update object with only valid database fields
  const updateData = {
    id: data.id,
    username: formattedUsername,
    name: data.name,
    nickname: data.nickname,
    gender: data.gender,
    dob: data.dob,
    job: data.job,
    bio: data.bio,
    email: data.email,
    hp: data.hp,
    avatar: data.avatar,
    countryName: data.countryName,
    stateName: data.stateName,
    cityName: data.cityName,
    countryId: data.countryId,
    stateId: data.stateId,
    cityId: data.cityId,
    role: data.role,
    isBlocked: data.isBlocked,
    isVerify: data.isVerify,
    timezone: data.timezone,
    auth: data.auth
  };

  const { data: updatedData, error } = await supabase
    .from("user_profiles")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "User profile updated successfully",
    data: updatedData,
  };
};
