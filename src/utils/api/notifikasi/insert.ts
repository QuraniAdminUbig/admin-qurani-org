import { createClient } from "@supabase/supabase-js";
import { createNotificationWithPush } from "./server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! // Using publishable key consistently
);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  data?: Record<string, unknown>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationData {
  user_id: string;
  from_user_id?: string | null;
  type: string;
  group_id?: string;
  recap_id?: number;
  is_read?: boolean;
  is_action_taken?: boolean;
}

// Push notification functions moved to server.ts for server-side only execution

/**
 * Template untuk berbagai jenis notifikasi
 */
export const notificationTemplates = {
  // Ketika ada setoran hafalan baru
  newRecap: (
    reciterId: string,
    examinerId: string,
    recapId: number,
    reciterName: string
  ) => ({
    notificationData: {
      user_id: examinerId,
      from_user_id: reciterId,
      type: "recap_notification",
      recap_id: recapId,
    },
    pushPayload: {
      title: "📋 Setoran Hafalan Baru",
      body: `${reciterName} telah melakukan setoran hafalan yang perlu Anda periksa`,
      icon: "/icons/qurani-192.png",
      url: `/setoran/recap/${recapId}`,
      data: {
        type: "new_recap",
        recapId,
        reciterId,
      },
      tag: "new-recap",
    },
  }),

  // Ketika permintaan pertemanan baru
  friendRequest: (
    requesterId: string,
    recipientId: string,
    requesterName: string
  ) => ({
    notificationData: {
      user_id: recipientId,
      from_user_id: requesterId,
      type: "friend_request",
    },
    pushPayload: {
      title: "👥 Permintaan Pertemanan Baru",
      body: `${requesterName} ingin berteman dengan Anda`,
      icon: "/icons/qurani-192.png",
      url: "/friends",
      data: {
        type: "friend_request",
        fromUserId: requesterId,
      },
      tag: "friend-request",
    },
  }),

  // Ketika permintaan pertemanan diterima (menggunakan type friend_request)
  friendRequestAccepted: (
    requesterId: string,
    recipientId: string,
    recipientName: string
  ) => ({
    notificationData: {
      user_id: requesterId,
      from_user_id: recipientId,
      type: "friend_request", // Gunakan tipe existing
    },
    pushPayload: {
      title: "🎉 Permintaan Pertemanan Diterima",
      body: `${recipientName} telah menerima permintaan pertemanan Anda`,
      icon: "/icons/qurani-192.png",
      url: "/friends",
      data: {
        type: "friend_accepted",
        fromUserId: recipientId,
      },
      tag: "friend-accepted",
    },
  }),

  // Ketika diundang ke grup
  groupInvite: (
    inviterId: string,
    inviteeId: string,
    groupId: string,
    inviterName: string,
    groupName: string
  ) => ({
    notificationData: {
      user_id: inviteeId,
      from_user_id: inviterId,
      type: "group_invite",
      group_id: groupId,
    },
    pushPayload: {
      title: "🏠 Undangan Grup Baru",
      body: `${inviterName} mengundang Anda ke grup "${groupName}"`,
      icon: "/icons/qurani-192.png",
      url: "/groups",
      data: {
        type: "group_invite",
        fromUserId: inviterId,
        groupId,
      },
      tag: "group-invite",
    },
  }),

  // Reminder setoran hafalan (menggunakan type recap_notification)
  memorationReminder: (userId: string, userName: string) => ({
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", // Gunakan tipe existing
    },
    pushPayload: {
      title: "⏰ Reminder Setoran Hafalan",
      body: `Assalamu'alaikum ${userName}, jangan lupa setoran hafalan hari ini ya! 🤲`,
      icon: "/icons/qurani-192.png",
      url: "/setoran",
      data: { type: "memorization_reminder" },
      tag: "memorization-reminder",
    },
  }),

  // Test notification (menggunakan type recap_notification)
  test: (userId: string) => ({
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", // Gunakan tipe existing
    },
    pushPayload: {
      title: "🕌 Test Notifikasi Qurani",
      body: "Alhamdulillah, notifikasi push berhasil! Semoga Allah mudahkan hafalan Anda.",
      icon: "/icons/qurani-192.png",
      url: "/setoran",
      data: { type: "test", timestamp: Date.now() },
      tag: "test-notification",
    },
  }),

  // Custom notification (menggunakan type recap_notification)
  custom: (
    userId: string,
    title: string,
    message: string,
    icon?: string,
    url?: string
  ) => ({
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", // Gunakan tipe existing
    },
    pushPayload: {
      title: title || "🔔 Notifikasi Qurani",
      body: message || "Anda memiliki notifikasi baru",
      icon: icon || "/icons/qurani-192.png",
      url: url || "/setoran",
      data: { type: "custom", timestamp: Date.now() },
      tag: "custom-notification",
    },
  }),
};

/**
 * Fungsi helper untuk mengirim notifikasi dengan template
 */
export async function sendNotificationWithTemplate(
  templateName: keyof typeof notificationTemplates,
  ...params: unknown[]
) {
  try {
    const template = notificationTemplates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const { notificationData, pushPayload } = (
      template as (...args: unknown[]) => {
        notificationData: NotificationData;
        pushPayload: PushPayload;
      }
    )(...params);

    return await createNotificationWithPush(notificationData, pushPayload);
  } catch (error) {
    console.error(
      `Error sending notification with template ${templateName}:`,
      error
    );
    throw error;
  }
}

/**
 * Fungsi untuk mengirim notifikasi ke multiple users
 */
export async function sendNotificationToMultipleUsers(
  userIds: string[],
  notificationDataTemplate: Omit<NotificationData, "user_id">,
  pushPayload: PushPayload
) {
  const results = [];

  for (const userId of userIds) {
    try {
      const result = await createNotificationWithPush(
        { ...notificationDataTemplate, user_id: userId },
        pushPayload
      );
      results.push({ userId, success: true, result });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to send notification to user ${userId}:`, error);
      results.push({
        userId,
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Fungsi untuk mengirim undangan grup dengan push notification
 */
export async function sendGroupInviteNotification(
  username: string,
  groupId: string,
  inviterId?: string
) {
  try {
    // 1. Cari user berdasarkan username (pastikan ada @ prefix untuk database)
    const dbUsername = username.startsWith("@") ? username : `@${username}`;
    const { data: inviteeUser, error: userError } = await supabase
      .from("user_profiles")
      .select("id, full_name, username")
      .eq("username", dbUsername)
      .single();

    if (userError || !inviteeUser) {
      return {
        success: false,
        error: `User dengan username ${dbUsername} tidak ditemukan`,
      };
    }

    // 2. Ambil data grup
    const { data: groupData, error: groupError } = await supabase
      .from("grup")
      .select("id, name, owner_id")
      .eq("id", groupId)
      .single();

    if (groupError || !groupData) {
      return {
        success: false,
        error: "Grup tidak ditemukan",
      };
    }

    // 3. Tentukan inviter (jika tidak disediakan, gunakan owner grup)
    const actualInviterId = inviterId || groupData.owner_id;

    // 4. Ambil data inviter
    const { data: inviterData, error: inviterError } = await supabase
      .from("user_profiles")
      .select("full_name, username")
      .eq("id", actualInviterId)
      .single();

    if (inviterError || !inviterData) {
      return {
        success: false,
        error: "Data undangan tidak valid",
      };
    }

    const inviterName =
      inviterData.full_name || inviterData.username || "Seseorang";

    // 5. Cek apakah user sudah menjadi anggota grup
    const { data: existingMember } = await supabase
      .from("grup_members")
      .select("id")
      .eq("grup_id", groupId)
      .eq("user_id", inviteeUser.id)
      .single();

    if (existingMember) {
      return {
        success: false,
        error: `${dbUsername} sudah menjadi anggota grup ${groupData.name}`,
      };
    }

    // 6. Kirim notifikasi dengan push menggunakan template
    const result = await sendNotificationWithTemplate(
      "groupInvite",
      actualInviterId,
      inviteeUser.id,
      groupId,
      inviterName,
      groupData.name
    );

    console.log(`✅ Group invite notification with push sent to ${dbUsername}`);

    return {
      success: true,
      message: `Undangan grup berhasil dikirim ke ${dbUsername}`,
      result,
    };
  } catch (error) {
    console.error("Error in sendGroupInviteNotification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim undangan",
    };
  }
}

/**
 * Fungsi untuk cek apakah user punya subscription
 */
export async function checkUserHasSubscription(userId: string) {
  try {
    const { data: subscriptions, error } = await supabase
      .from("user_push_subscriptions")
      .select("id, created_at")
      .eq("user_id", userId);

    if (error) throw error;

    return {
      hasSubscription: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        created_at: sub.created_at,
      })),
    };
  } catch (error) {
    console.error("Error checking user subscription:", error);
    throw error;
  }
}
