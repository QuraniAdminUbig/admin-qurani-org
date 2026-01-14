"use server";

import { createClient } from "@/utils/supabase/server";

// Fungsi untuk meng-update status notifikasi
export async function updateNotificationStatus(
  notificationId: string,
  updates: { is_read?: boolean; is_action_taken?: boolean }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update(updates)
    .eq("id", notificationId);

  return { error };
}

// Fungsi untuk mark all notifications sebagai read untuk user tertentu
export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false); // Only update unread notifications

  return { error };
}
