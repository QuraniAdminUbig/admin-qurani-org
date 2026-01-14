"use server";

import { IRecap } from "@/types/recap";
import { createClient } from "@/utils/supabase/server";
import { createRecapNotifications } from "@/utils/api/notifikasi/create-recap-notification";
import { generateId } from "@/lib/generateId";

export const insertRecap = async (values: IRecap) => {
  const supabase = await createClient();

  // Get user from server-side auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Authentication required",
    };
  }

  const { data: dataUserProfiles, error: errorUserProfiles } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("auth", user.id)
    .single();

  if (errorUserProfiles) {
    return {
      success: false,
      message: errorUserProfiles?.message || "Error fetching user profiles",
    };
  }
  // Insert recap and get the created record
  const { data: insertedRecap, error: insertError } = await supabase
    .from("recaps")
    .insert({
      ...values,
      city_id: dataUserProfiles.city_id,
      signed_by: null,
      id: generateId(),
    })
    .select("id")
    .single();

  if (insertError) {
    return {
      success: false,
      message: insertError.message,
    };
  }

  // Create notifications for recipients
  if (insertedRecap && values.reciter_id) {
    try {
      await createRecapNotifications(insertedRecap.id, values.reciter_id);
      console.log("Recap notifications created successfully");
    } catch (notificationError) {
      console.error("Error creating recap notifications:", notificationError);
      // Don't fail the recap creation if notification fails
    }
  }

  return {
    success: true,
    message: "insert recaps successfully",
    recapId: insertedRecap.id,
  };
};

export const updateRecapParaf = async (
  recapId: string,
  parafStatus: boolean,
  userId: string
) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("recaps")
    .update({
      paraf: parafStatus,
      signed_by: userId,
      signed_at: new Date(),
    })
    .eq("id", recapId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: parafStatus
      ? "Paraf berhasil diberikan"
      : "Paraf berhasil dibatalkan",
  };
};
