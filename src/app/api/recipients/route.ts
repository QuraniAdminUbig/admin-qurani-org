// app/api/notifications/recipients/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // 🔹 Ambil daftar penerima notifikasi
    const { data: recipientData, error: recipientError } = await supabase
      .from("user_monitoring_records")
      .select("user_monitoring_id")
      .eq("user_id", userId);

    if (recipientError) throw recipientError;

    if (!recipientData || recipientData.length === 0) {
      return NextResponse.json({ recipients: [] });
    }

    const recipientIds = recipientData.map(
      (record) => record.user_monitoring_id
    );

    // 🔹 Ambil profil penerima
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, name, username, avatar")
      .in("id", recipientIds);

    if (profileError) throw profileError;

    const recipients = (profileData || []).map((profile) => ({
      id: profile.id,
      name: profile.name || "Unknown",
      username: profile.username || "",
      avatar: profile.avatar || "",
    }));

    return NextResponse.json({ recipients });
  } catch (error) {
    console.error("Error loading notification recipients:", error);
    return NextResponse.json(
      { error: "Failed to load notification recipients" },
      { status: 500 }
    );
  }
}
