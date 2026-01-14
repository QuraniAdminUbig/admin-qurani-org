"use server";

import { generateId } from "@/lib/generateId";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Konfigurasi VAPID keys (server-side only)
webpush.setVapidDetails(
  "mailto:your-email@example.com", // Ganti dengan email Anda
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY! // Private key harus di server-side env
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! // Service role untuk akses server-side
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

/**
 * Mengirim push notification ke pengguna tertentu (SERVER-SIDE ONLY)
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    // 1. Ambil subscription data user dari database
    const { data: subscriptions, error: fetchError } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { success: false, message: "No subscriptions found" };
    }

    console.log(
      `Found ${subscriptions.length} subscription(s) for user ${userId}`
    );

    // 2. Kirim notifikasi ke semua subscription user tersebut
    const sendPromises = subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/Qurani - Icon2 Green.png",
        badge: "/icons/Qurani - Icon2 Green.png",
        url: payload.url || "/notifikasi",
        data: payload.data || {},
        timestamp: Date.now(),
        tag: payload.tag || "default",
      });

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
        return { success: true, subscription: subscription.id };
      } catch (error: unknown) {
        console.error("Failed to send push notification:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Jika subscription tidak valid (410 Gone), hapus dari database
        if (
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          error.statusCode === 410
        ) {
          console.log(`Removing invalid subscription: ${subscription.id}`);
          await supabase
            .from("user_push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }

        return {
          success: false,
          error: errorMessage,
          subscription: subscription.id,
        };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `Push notification results: ${successCount} success, ${failCount} failed`
    );

    return {
      success: successCount > 0,
      results,
      successCount,
      failCount,
      totalSent: subscriptions.length,
    };
  } catch (error) {
    console.error("Error in sendPushToUser:", error);
    throw error;
  }
}

/**
 * Membuat notifikasi di database dan mengirim push notification (SERVER-SIDE ONLY)
 */
export async function createNotificationWithPush(
  notificationData: NotificationData,
  pushPayload?: PushPayload
) {
  try {
    // 1. Simpan notifikasi ke database
    const { data: notification, error: dbError } = await supabase
      .from("notifications")
      .insert({
        id: generateId(),
        user_id: notificationData.user_id,
        from_user_id: notificationData.from_user_id,
        type: notificationData.type,
        group_id: notificationData.group_id,
        recap_id: notificationData.recap_id,
        is_read: notificationData.is_read ?? false,
        is_action_taken: notificationData.is_action_taken ?? false,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error creating notification:", dbError);
      throw dbError;
    }

    console.log("Notification created:", notification.id);

    // 2. Kirim push notification jika payload disediakan
    let pushResult = null;
    if (pushPayload) {
      try {
        pushResult = await sendPushToUser(
          notificationData.user_id,
          pushPayload
        );
        console.log(
          "Push notification sent for notification:",
          notification.id
        );
      } catch (pushError) {
        console.error("Failed to send push notification:", pushError);
        // Tidak throw error, karena notifikasi sudah tersimpan di DB
      }
    }

    return {
      success: true,
      notification,
      pushResult,
    };
  } catch (error) {
    console.error("Error in createNotificationWithPush:", error);
    throw error;
  }
}

/**
 * Template functions untuk berbagai jenis notifikasi
 */

// Ketika ada setoran hafalan baru
export async function createNewRecapNotification(
  reciterId: string,
  examinerId: string,
  recapId: number,
  reciterName: string
) {
  return {
    notificationData: {
      user_id: examinerId,
      from_user_id: reciterId,
      type: "recap_notification",
      recap_id: recapId,
    },
    pushPayload: {
      title: "📋 Setoran Hafalan Baru",
      body: `${reciterName} telah melakukan setoran hafalan yang perlu Anda periksa`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: `/setoran/recap/${recapId}`,
      data: {
        type: "new_recap",
        recapId,
        reciterId,
      },
      tag: "new-recap",
    },
  };
}

// Ketika permintaan pertemanan baru
export async function createFriendRequestNotification(
  requesterId: string,
  recipientId: string,
  requesterName: string
) {
  return {
    notificationData: {
      user_id: recipientId,
      from_user_id: requesterId,
      type: "friend_request",
    },
    pushPayload: {
      title: "Permintaan Pertemanan Baru",
      body: `${requesterName} ingin berteman dengan Anda`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: {
        type: "friend_request",
        fromUserId: requesterId,
      },
      tag: "friend-request",
    },
  };
}

// Ketika permintaan pertemanan diterima (menggunakan type friend_request)
export async function createFriendRequestAcceptedNotification(
  requesterId: string,
  recipientId: string,
  recipientName: string
) {
  return {
    notificationData: {
      user_id: requesterId,
      from_user_id: recipientId,
      type: "friend_request", // Gunakan tipe existing
    },
    pushPayload: {
      title: "🎉 Permintaan Pertemanan Diterima",
      body: `${recipientName} telah menerima permintaan pertemanan Anda`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: {
        type: "friend_accepted",
        fromUserId: recipientId,
      },
      tag: "friend-accepted",
    },
  };
}

// Ketika diundang ke grup
export async function createGroupInviteNotification(
  inviterId: string, // ID pengundang
  inviteeId: string, // ID yang diundang
  groupId: string,
  inviterName: string, // Nama pengundang
  groupName: string
) {
  return {
    notificationData: {
      user_id: inviteeId,
      from_user_id: inviterId,
      type: "group_invite",
      group_id: groupId,
    },
    pushPayload: {
      title: "Undangan Grup Baru",
      body: `${inviterName} mengundang Anda ke grup "${groupName}"`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: {
        type: "group_invite",
        fromUserId: inviterId,
        groupId,
      },
      tag: "group-invite",
    },
  };
}

// Reminder setoran hafalan (menggunakan type recap_notification)
export async function createMemorationReminderNotification(
  userId: string,
  userName: string
) {
  return {
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", // Gunakan tipe existing
    },
    pushPayload: {
      title: "Reminder Setoran Hafalan",
      body: `Assalamu'alaikum ${userName}, jangan lupa setoran hafalan hari ini ya! 🤲`,
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/notifikasi",
      data: { type: "memorization_reminder" },
      tag: "memorization-reminder",
    },
  };
}

// Test notification (menggunakan type recap_notification)
export async function createTestNotification(userId: string) {
  return {
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", // Gunakan tipe existing
    },
    pushPayload: {
      title: "Test Notifikasi Qurani",
      body: "Alhamdulillah, notifikasi push berhasil! Semoga Allah mudahkan hafalan Anda.",
      icon: "/icons/Qurani - Icon2 Green.png",
      url: "/setoran",
      data: { type: "test", timestamp: Date.now() },
      tag: "test-notification",
    },
  };
}

// Custom notification (menggunakan type recap_notification)
export async function createCustomNotification(
  userId: string,
  title: string,
  message: string,
  icon?: string,
  url?: string
) {
  return {
    notificationData: {
      user_id: userId,
      from_user_id: null,
      type: "recap_notification", // Gunakan tipe existing
    },
    pushPayload: {
      title: title || "🔔 Notifikasi Qurani",
      body: message || "Anda memiliki notifikasi baru",
      icon: icon || "/icons/Qurani - Icon2 Green.png",
      url: url || "/setoran",
      data: { type: "custom", timestamp: Date.now() },
      tag: "custom-notification",
    },
  };
}

/**
 * Fungsi helper untuk mengirim notifikasi dengan template (SERVER-SIDE ONLY)
 */
export async function sendNotificationWithTemplate(
  templateName: string,
  ...params: unknown[]
) {
  try {
    let templateResult: {
      notificationData: NotificationData;
      pushPayload: PushPayload;
    };

    switch (templateName) {
      case "recap_notification":
        templateResult = await createNewRecapNotification(
          params[0] as string,
          params[1] as string,
          params[2] as number,
          params[3] as string
        );
        break;
      case "friendRequest":
        templateResult = await createFriendRequestNotification(
          params[0] as string,
          params[1] as string,
          params[2] as string
        );
        break;
      case "friendRequestAccepted":
        templateResult = await createFriendRequestAcceptedNotification(
          params[0] as string,
          params[1] as string,
          params[2] as string
        );
        break;
      case "groupInvite":
        templateResult = await createGroupInviteNotification(
          params[0] as string,
          params[1] as string,
          params[2] as string,
          params[3] as string,
          params[4] as string
        );
        break;
      case "memorationReminder":
        templateResult = await createMemorationReminderNotification(
          params[0] as string,
          params[1] as string
        );
        break;
      case "test":
        templateResult = await createTestNotification(params[0] as string);
        break;
      case "custom":
        templateResult = await createCustomNotification(
          params[0] as string,
          params[1] as string,
          params[2] as string,
          params[3] as string,
          params[4] as string
        );
        break;
      default:
        throw new Error(`Template ${templateName} not found`);
    }

    return await createNotificationWithPush(
      templateResult.notificationData,
      templateResult.pushPayload
    );
  } catch (error) {
    console.error(
      `Error sending notification with template ${templateName}:`,
      error
    );
    throw error;
  }
}

/**
 * Fungsi untuk mengirim undangan grup dengan push notification (SERVER-SIDE ONLY)
 */
export async function sendGroupInviteNotification(
  username: string,
  groupId: string,
  userId?: string
) {
  try {
    // 1. Cari user berdasarkan username (pastikan ada @ prefix untuk database)
    const dbUsername = username.startsWith("@") ? username : `@${username}`;
    const { data: inviterUser, error: userError } = await supabase
      .from("user_profiles")
      .select("id, name, username")
      .eq("username", dbUsername)
      .single();

    if (userError || !inviterUser) {
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
    const actualInviterId = userId || groupData.owner_id;

    // 4. Ambil data inviter
    const { data: inviterData, error: inviterError } = await supabase
      .from("user_profiles")
      .select("name, username")
      .eq("id", actualInviterId)
      .single();

    if (inviterError || !inviterData) {
      return {
        success: false,
        error: "Data undangan tidak valid",
      };
    }

    const inviterName = inviterData.name || inviterData.username || "Seseorang";

    // 5. Cek apakah user sudah menjadi anggota grup
    const { data: existingMember } = await supabase
      .from("grup_members")
      .select("id")
      .eq("grup_id", groupId)
      .eq("user_id", inviterUser.id)
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
      actualInviterId, // yang invite (admin atau owner grup)
      inviterUser.id, // yang diinvite
      groupId,
      inviterName, // yang invite (admin atau owner grup)
      groupData.name
    );

    return {
      success: true,
      message: `Undangan grup berhasil dikirim ke ${username}`,
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
