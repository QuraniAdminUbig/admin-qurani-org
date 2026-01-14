// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId parameter is required" },
      { status: 400 }
    );
  }

  // 🔹 createClient() mengembalikan Promise, jadi harus di-await
  const supabase = await createClient();

  try {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // 🔹 Jika belum ada profil, buat baru
    if (error?.code === "PGRST116") {
      const { data: newProfile, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          username: "",
          name: "",
          noHp: "",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return NextResponse.json({ profile: newProfile });
    }

    if (error) throw error;
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Error fetching profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
