"use server";

import { createClient } from "@/utils/supabase/server";
import { fetchStatesById } from "../states/fetch";
import { fetchCityById } from "../city/fetch";

async function checkStateWithCountry(
  stateId: number,
  countryId: number
): Promise<boolean> {
  const result = await fetchStatesById(stateId);
  if (!result.success || !result.data) {
    return false;
  }
  return result.data.country_id == countryId;
}
async function checkCityWithState(
  cityId: number,
  stateId: number
): Promise<boolean> {
  const result = await fetchCityById(cityId);
  if (!result.success || !result.data) {
    return false;
  }
  return result.data.state_id == stateId;
}

export const updateUserProfile = async (
  userId: string,
  countryId: number, // Pindah ke depan
  stateId: number, // Pindah ke depan
  cityId: number, // Pindah ke depan
  countryName: string, // Pindah ke depan
  statesName: string, // Pindah ke depan
  cityName: string, // Pindah ke depan
  timezone: string,
  fullName?: string, // Optional di belakang
  nickname?: string,
  username?: string,
  gender?: number | null,
  date_of_birth?: string,
  job?: string,
  phoneNumber?: string,
  bio?: string,
  profilePhotoUrl?: string
) => {
  const supabase = await createClient();

  // Prepare update data
  const updateData: {
    name?: string;
    nickname?: string;
    username?: string;
    gender?: number | null;
    dob?: string | null;
    job?: string;
    hp?: string;
    bio?: string;
    avatar?: string;
    countryId: number;
    stateId: number;
    cityId: number;
    countryName: string;
    stateName: string;
    cityName: string;
    timezone: string;
  } = {
    countryId: countryId,
    stateId: stateId,
    cityId: cityId,
    countryName: countryName,
    stateName: statesName,
    cityName: cityName,
    timezone,
  };

  if (fullName !== undefined) updateData.name = fullName;
  if (nickname !== undefined) updateData.nickname = nickname;
  if (username !== undefined) updateData.username = username;
  if (gender !== undefined) updateData.gender = gender;
  if (date_of_birth !== undefined) updateData.dob = date_of_birth || null;
  if (job !== undefined) updateData.job = job;
  if (phoneNumber !== undefined) updateData.hp = phoneNumber;
  if (bio !== undefined) updateData.bio = bio;
  if (profilePhotoUrl !== undefined) updateData.avatar = profilePhotoUrl;

  const isStateValid = await checkStateWithCountry(stateId, countryId);
  const isCityValid = await checkCityWithState(cityId, stateId);

  if (!isStateValid) {
    return {
      type: "state",
      warning: true,
      success: false,
      message: "State does not belong to the specified country",
    };
  }
  if (!isCityValid) {
    return {
      warning: true,
      success: false,
      message: "City does not belong to the specified state",
    };
  }

  // Update user profile
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Profile updated successfully",
    data,
  };
};
