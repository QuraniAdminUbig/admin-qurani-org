"use server";

import { createClient } from "../supabase/server";

export default async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("full_name") as string;
  const username = formData.get("username") as string;
  const countryName = formData.get("country_name") as string;
  const countryId = formData.get("country_id") as string;
  const stateName = formData.get("states_name") as string;
  const stateId = formData.get("states_id") as string;
  const cityId = formData.get("city_id") as string;
  const cityName = formData.get("city_name") as string;
  const timezone = formData.get("timezone") as string;

  // First, try to signup without location data to avoid database conflicts
  const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: `@${username}`,
        name,
        countryId: parseInt(countryId), // Send as string to match trigger expectation
        countryName, // Send as string to match trigger expectation
        stateId: parseInt(stateId), // Send as string to match trigger expectation
        stateName, // Send as string to match trigger expectation
        cityId: parseInt(cityId), // Send as string to match trigger expectation
        cityName, // Send as string to match trigger expectation
        timezone,
      },
    },
  });

  console.log({ signUpError, signUpData: signUpData.user?.user_metadata });

  if (signUpError) {
    console.error("Signup error details:", signUpError);

    if (signUpError.message == "User already registered") {
      return {
        success: false,
        error: "User already registered",
      };
    }

    // Return the actual error message for debugging
    return {
      success: false,
      error: signUpError.message || "Registration failed",
    };
  }

  if (!signUpData.user?.id) {
    return {
      success: false,
      error: "User not found",
    };
  }

  return {
    success: true,
    message: "User registered successfully",
  };
}
