"use server";

import { createClient } from "@/utils/supabase/server";
import { PostgrestError } from "@supabase/supabase-js";

interface NotificationRaw {
  id: string;
  type: string;
  is_read: boolean;
  is_action_taken: boolean;
  is_accept_friend: boolean | null;
  created_at: string;
  group_id: string | null;
  from_user_id: string;
  user_id: string;
  recap_id: number | null;
  grup: {
    name: string;
  } | null;
  from_user: {
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
  recap: {
    recitation_type: string;
    conclusion?: string;
    memorization?: string;
    examiner: {
      name: string;
    } | null;
  } | null;
}

interface MappedNotification {
  id: string;
  type: string;
  is_read: boolean;
  is_action_taken: boolean;
  is_accept_friend: boolean | null;
  created_at: string;
  group_id: string | null;
  groupName: string;
  fromUserName: string;
  fromUserUsername: string;
  fromUserAvatar: string | null;
  fromUserProfileUser: string | null;
  fromUserId: string;
  userId: string;
  recap_id?: number | null;
  recitationType?: string;
  examinerName?: string;
  memorization?: string;
}

interface NotificationResponse {
  data: MappedNotification[] | null;
  error: PostgrestError | null;
}

export async function getNotifications(
  userId: string
): Promise<NotificationResponse> {
  const supabase = await createClient();

  // First try: Get notifications with proper join
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      type,
      is_read,
      is_action_taken,
      is_accept_friend,
      created_at,
      group_id,
      from_user_id,
      user_id,
      recap_id,
      grup:grup(name),
      from_user:user_profiles!notifications_from_user_id_fkey(
        name,
        username,
        avatar
      ),
      recap:recaps!notifications_recap_id_fkey(
        recitation_type,
        conclusion,
        memorization,
        examiner:user_profiles!recaps_examiner_id_fkey(
          name
        )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return { data: null, error };
  }

  // Cast the data to NotificationRaw type and map it
  const notifications = (data as unknown as NotificationRaw[]).map((notif) => ({
    id: notif.id,
    type: notif.type,
    is_read: notif.is_read,
    is_action_taken: notif.is_action_taken,
    is_accept_friend: notif.is_accept_friend,
    created_at: notif.created_at,
    group_id: notif.group_id,
    groupName: notif.grup?.name ?? "Tidak Diketahui",
    fromUserName: notif.from_user?.name ?? "Tidak Diketahui",
    fromUserUsername: notif.from_user?.username ?? "Tidak Diketahui",
    fromUserAvatar: notif.from_user?.avatar ?? null, // Priority 1: custom uploaded avatar
    fromUserProfileUser: notif.from_user?.avatar ?? null, // Priority 2: Google profile (stored in avatar field)
    fromUserId: notif.from_user_id,
    userId: notif.user_id,
    recap_id: notif.recap_id,
    recitationType: notif.recap?.recitation_type ?? undefined,
    examinerName: notif.recap?.examiner?.name ?? "Tidak Diketahui",
    conclusion: notif.recap?.conclusion ?? undefined,
    memorization: notif.recap?.memorization ?? undefined,
  }));

  return { data: notifications, error: null };
}
