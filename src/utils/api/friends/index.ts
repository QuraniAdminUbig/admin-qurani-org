"use server";
import { generateId } from "@/lib/generateId";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "../../supabase/server";
import { sendNotificationWithTemplate } from "@/utils/api/notifikasi/server";

// Simple in-memory cache for search results
const searchCache = new Map<
  string,
  {
    data: {
      users: UserWithFriendshipStatus[];
      hasMore: boolean;
      total: number;
    };
    timestamp: number;
  }
>();
const CACHE_DURATION = 30000; // 30 seconds

function getCacheKey(
  userId: string,
  searchQuery: string,
  page: number
): string {
  return `${userId}-${searchQuery}-${page}`;
}

function getCachedData(key: string) {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  searchCache.delete(key);
  return null;
}

function setCachedData(
  key: string,
  data: { users: UserWithFriendshipStatus[]; hasMore: boolean; total: number }
) {
  searchCache.set(key, { data, timestamp: Date.now() });
}

function clearUserCache(userId: string) {
  // Clear all cache entries for this user
  for (const [key] of searchCache) {
    if (key.startsWith(`${userId}-`)) {
      searchCache.delete(key);
    }
  }
}

export interface FriendWithProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  relationshipType: "friends" | "pending_sent" | "pending_received";
  lastActive: string;
  mutualFriends?: number;
  friendshipDate: string;
}

export interface UserWithFriendshipStatus {
  id: string;
  name: string;
  nickname?: string;
  username?: string;
  email: string;
  avatar?: string;
  countryName?: string;
  countryId?: number | null;
  isVerify: boolean;
  stateName?: string;
  stateId?: number | null;
  cityName?: string;
  cityId?: number | null;
  friendshipStatus:
    | "friends"
    | "pending_sent"
    | "pending_received"
    | "not_friends"
    | null;
}

export interface GetFriendData {
  id: string;
  name: string;
  nickname?: string;
  username?: string;
  email: string;
  avatar?: string;
  countryName?: string;
  countryId?: number | null;
  stateName?: string;
  stateId?: number | null;
  cityName?: string;
  cityId?: number | null;
  isVerify: boolean;
}

// interface FriendData {
//   id: string;
//   requester_id: string;
//   recipient_id: string;
//   created_at: string;
// }

export async function getFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<UserWithFriendshipStatus["friendshipStatus"] | null> {
  try {
    const supabase = await createClient();
    // Cari apakah saya (currentUserId) sudah mengirim permintaan ke dia (targetUserId)
    const { data: sentData, error: sentError } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("requester_id", currentUserId)
      .eq("recipient_id", targetUserId)
      .limit(1);

    if (sentError) throw sentError;

    // Cari apakah dia (targetUserId) sudah mengirim permintaan ke saya (currentUserId)
    const { data: receivedData, error: receivedError } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("requester_id", targetUserId)
      .eq("recipient_id", currentUserId)
      .limit(1);

    if (receivedError) throw receivedError;

    // Tentukan status berdasarkan hasil pencarian
    const isSent = sentData && sentData.length > 0;
    const isReceived = receivedData && receivedData.length > 0;

    if (isSent && isReceived) {
      return "friends"; // Saya mengirim dan dia mengirim = Berteman
    } else if (isSent && !isReceived) {
      return "pending_sent"; // Saya mengirim dan dia tidak = Permintaan dikirim
    } else if (!isSent && isReceived) {
      return "pending_received"; // Saya tidak mengirim dan dia mengirim = Permintaan masuk
    } else {
      return "not_friends"; // Tidak ada yang mengirim = Belum berteman
    }
  } catch (error) {
    console.error("Error fetching friendship status:", error);
    return null;
  }
}

// Get all friends and pending requests for a user - OPTIMIZED VERSION
// This is the main function to get all friends and pending requests for a user
export async function getFriendsData(userId: string) {
  try {
    const supabase = await createClient();

    // Optimized query with minimal fields for better performance
    const { data, error } = await supabase
      .from("friend_requests")
      .select(
        `
        requester_id,
        recipient_id,
        requester:requester_id (
          id,
          name,
          nickname,
          username,
          email,
          avatar,
          countryName,
          countryId,
          stateName,
          stateId,
          cityName,
          cityId,
          isVerify
        ),
        recipient:recipient_id (
          id,
          name,
          nickname,
          username,
          email,
          avatar,
          countryName,
          countryId,
          stateName,
          stateId,
          cityName,
          cityId,
          isVerify
        )
      `
      )
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("requester_id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        friends: [],
        pendingSent: [],
        pendingReceived: [],
        followers: [],
      };
    }

    const friends: GetFriendData[] = [];
    const pendingSent: GetFriendData[] = [];
    const pendingReceived: GetFriendData[] = [];
    const processedUserIds = new Set<string>();

    // Process all requests in a single pass
    for (const request of data) {
      const isSentByMe = request.requester_id === userId;
      const otherUser = isSentByMe ? request.recipient : request.requester;

      // Type guard untuk memastikan otherUser memiliki id
      if (
        !otherUser ||
        !(otherUser as any).id ||
        processedUserIds.has((otherUser as any).id)
      ) {
        continue;
      }

      // Check for mutual following by looking at existing requests
      const iFollowThem = data.some(
        (req) =>
          req.requester_id === userId &&
          req.recipient_id === (otherUser as any).id
      );
      const theyFollowMe = data.some(
        (req) =>
          req.requester_id === (otherUser as any).id &&
          req.recipient_id === userId
      );

      // Determine status based on mutual following
      let status: UserWithFriendshipStatus["friendshipStatus"];
      if (iFollowThem && theyFollowMe) {
        status = "friends";
      } else if (iFollowThem) {
        status = "pending_sent";
      } else if (theyFollowMe) {
        status = "pending_received";
      } else {
        status = "not_friends";
      }

      const userWithStatus: GetFriendData = {
        id: (otherUser as any).id,
        name: (otherUser as any).name || "Unknown",
        nickname: (otherUser as any).nickname,
        username: (otherUser as any).username,
        email: (otherUser as any).email || "",
        avatar: (otherUser as any).avatar,
        countryName: (otherUser as any).countryName,
        countryId: (otherUser as any).countryId,
        stateName: (otherUser as any).stateName,
        stateId: (otherUser as any).stateId,
        cityName: (otherUser as any).cityName,
        cityId: (otherUser as any).cityId,
        isVerify: (otherUser as any).isVerify,
      };

      // Add to appropriate list
      if (status === "friends") {
        friends.push(userWithStatus);
      } else if (status === "pending_sent") {
        pendingSent.push(userWithStatus);
      } else if (status === "pending_received") {
        pendingReceived.push(userWithStatus);
      }

      processedUserIds.add((otherUser as any).id);
    }

    const sortByName = (a: GetFriendData, b: GetFriendData) =>
      a.name.localeCompare(b.name, "id", { sensitivity: "base" });

    friends.sort(sortByName);
    pendingSent.sort(sortByName);
    pendingReceived.sort(sortByName);

    const followers: GetFriendData[] = [...pendingReceived, ...friends].sort(
      sortByName
    );

    return {
      friends,
      pendingSent,
      pendingReceived,
      followers,
    };
  } catch (error) {
    console.error("Error fetching friends data:", error);
    throw error;
  }
}

// Get ONLY active/mutual friends (optimized for performance)
// Use this for contexts where only confirmed friendships are needed (e.g., setoran form)
export async function getActiveFriendsOnly(
  userId: string
): Promise<UserWithFriendshipStatus[]> {
  try {
    const supabase = await createClient();

    // Optimized query - only get mutual friendships
    const { data, error } = await supabase
      .from("friend_requests")
      .select(
        `
        requester_id,
        recipient_id,
        requester:requester_id (
          id,
          name,
          nickname,
          username,
          email,
          avatar,
          isVerify
        ),
        recipient:recipient_id (
          id,
          name,
          nickname,
          username,
          email,
          avatar,
          isVerify
        )
      `
      )
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("requester_id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    const friends: UserWithFriendshipStatus[] = [];
    const processedUserIds = new Set<string>();

    // Only process mutual friendships (both users follow each other)
    for (const request of data) {
      const isSentByMe = request.requester_id === userId;
      const otherUser = isSentByMe ? request.recipient : request.requester;

      if (
        !otherUser ||
        !(otherUser as any).id ||
        processedUserIds.has((otherUser as any).id)
      ) {
        continue;
      }

      // Check for mutual following
      const iFollowThem = data.some(
        (req) =>
          req.requester_id === userId &&
          req.recipient_id === (otherUser as any).id
      );
      const theyFollowMe = data.some(
        (req) =>
          req.requester_id === (otherUser as any).id &&
          req.recipient_id === userId
      );

      // ONLY add if mutual friendship exists
      if (iFollowThem && theyFollowMe) {
        friends.push({
          id: (otherUser as any).id,
          name: (otherUser as any).name || "Unknown",
          username: (otherUser as any).username,
          nickname: (otherUser as any).nickname,
          email: (otherUser as any).email || "",
          avatar: (otherUser as any).avatar,
          isVerify: (otherUser as any).isVerify,
          friendshipStatus: "friends",
        });

        processedUserIds.add((otherUser as any).id);
      }
    }

    return friends;
  } catch (error) {
    console.error("Error fetching active friends:", error);
    throw error;
  }
}

export async function searchUsersWithStatus(
  userId: string,
  searchQuery: string,
  page: number = 0,
  limit: number = 10
): Promise<{
  users: UserWithFriendshipStatus[];
  hasMore: boolean;
  total: number;
}> {
  try {
    // Check cache first
    const cacheKey = getCacheKey(userId, searchQuery, page);
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const supabase = await createClient();
    const offset = page * limit;

    // Query users first, then get friendship status separately
    const { data, error, count } = await supabase
      .from("user_profiles")
      .select(
        `
        id,
        name,
        username,
        nickname,
        email,
        avatar,
        countryName,
        countryId,
        stateName,
        stateId,
        cityName,
        cityId,
        isVerify
      `,
        { count: "exact" }
      )
      .neq("id", userId)
      .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
      .range(offset, offset + limit - 1)
      .order("name");

    if (error) throw error;

    // Handle empty results
    if (!data || data.length === 0) {
      return {
        users: [],
        hasMore: false,
        total: count || 0,
      };
    }

    // Get all user IDs from search results
    const userIds = data.map((user) => user.id);

    // Query friendship status for all users in parallel
    const friendshipStatuses = await Promise.all(
      userIds.map((targetUserId) => getFriendshipStatus(userId, targetUserId))
    );

    // Process users with friendship status in memory
    const usersWithStatus: UserWithFriendshipStatus[] = data.map(
      (user, index) => {
        return {
          id: user.id,
          name: user.name || "Unknown",
          username: user.username,
          nickname: user.nickname,
          email: user.email || "",
          avatar: user.avatar,
          countryName: user.countryName,
          countryId: user.countryId,
          stateName: user.stateName,
          stateId: user.stateId,
          cityName: user.cityName,
          cityId: user.cityId,
          isVerify: user.isVerify,
          friendshipStatus: friendshipStatuses[index] || "not_friends",
        };
      }
    );

    const hasMore = offset + limit < (count || 0);

    const result = {
      users: usersWithStatus,
      hasMore,
      total: count || 0,
    };

    // Cache the result
    setCachedData(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
}

export async function sendFriendRequest(
  requesterId: string,
  recipientId: string
) {
  try {
    const supabase = await createClient();

    // Check existing status first
    const status = await getFriendshipStatus(requesterId, recipientId);
    if (status !== "not_friends") {
      throw new Error("Invalid friendship status for sending request");
    }

    const { error } = await supabase.from("friend_requests").insert({
      id: generateId(),
      requester_id: requesterId,
      recipient_id: recipientId,
    });

    if (error) throw error;

    // Get requester name for push notification
    const { data: requesterProfile } = await supabase
      .from("user_profiles")
      .select("name, username")
      .eq("id", requesterId)
      .single();

    const requesterName =
      requesterProfile?.name || requesterProfile?.username || "Seseorang";

    // Create notification with push using template
    try {
      await sendNotificationWithTemplate(
        "friendRequest",
        requesterId,
        recipientId,
        requesterName
      );
      console.log("✅ Friend request notification with push sent successfully");
    } catch (notificationError) {
      console.error(
        "❌ Failed to send friend request notification with push:",
        notificationError
      );
      // Fallback: create notification without push
      const { error: fallbackError } = await supabase
        .from("notifications")
        .insert({
          id: generateId(),
          user_id: recipientId,
          type: "friend_request",
          from_user_id: requesterId,
          group_id: null,
        });

      if (fallbackError) throw fallbackError;
    }

    // Clear cache for both users
    clearUserCache(requesterId);
    clearUserCache(recipientId);

    return { status: "success" };
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
}

export async function acceptFriendRequest(
  requesterId: string,
  recipientId: string,
  notificationId?: string
) {
  try {
    const supabase = await createClient();

    // OPTIMIZATION: Skip getFriendshipStatus check for notification-based accepts
    // The notification existence itself validates the pending request
    if (!notificationId) {
      // Only check status for non-notification calls (like from cari-teman)
      const status = await getFriendshipStatus(recipientId, requesterId);
      if (status !== "pending_received") {
        throw new Error(
          `No pending friend request to accept. Current status: ${status}. Expected: pending_received`
        );
      }
    }

    // Send friend request back to create mutual friendship
    const { error } = await supabase.from("friend_requests").insert({
      id: generateId(),
      requester_id: recipientId,
      recipient_id: requesterId,
    });

    if (error) throw error;

    // Update notification with acceptance status
    if (notificationId) {
      // Update specific notification by ID
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          is_action_taken: true,
          is_accept_friend: true,
          is_read: true,
        })
        .eq("id", notificationId)
        .eq("type", "friend_request");

      if (notificationError) throw notificationError;
    } else {
      // Update notification by user IDs (fallback for cari-teman)
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          is_action_taken: true,
          is_accept_friend: true,
          is_read: true,
        })
        .eq("type", "friend_request")
        .eq("from_user_id", requesterId)
        .eq("user_id", recipientId)
        .eq("is_action_taken", false); // Only update pending notifications

      if (notificationError) throw notificationError;
    }

    // Clear cache for both users - do this asynchronously for better performance
    Promise.all([
      clearUserCache(requesterId),
      clearUserCache(recipientId),
    ]).catch((error) => console.error("Cache clearing error:", error));

    return { status: "success" };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
}

export async function rejectOrCancelFriendRequest(
  requesterId: string,
  recipientId: string,
  notificationId?: string
) {
  try {
    const supabase = await createClient();

    // Delete the friend request
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .or(
        `and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),` +
          `and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`
      );

    if (error) throw error;

    // Update notification with rejection status
    if (notificationId) {
      // Update specific notification by ID
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          is_action_taken: true,
          is_accept_friend: false,
          is_read: true,
        })
        .eq("id", notificationId)
        .eq("type", "friend_request");

      if (notificationError) throw notificationError;
    } else {
      // Update notification by user IDs (fallback for cari-teman)
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          is_action_taken: true,
          is_accept_friend: false,
          is_read: true,
        })
        .eq("type", "friend_request")
        .eq("from_user_id", requesterId)
        .eq("user_id", recipientId)
        .eq("is_action_taken", false); // Only update pending notifications

      if (notificationError) throw notificationError;
    }

    // Clear cache for both users - do this asynchronously for better performance
    Promise.all([
      clearUserCache(requesterId),
      clearUserCache(recipientId),
    ]).catch((error) => console.error("Cache clearing error:", error));

    return { status: "success" };
  } catch (error) {
    console.error("Error rejecting/canceling friend request:", error);
    throw error;
  }
}

export async function rejectFromNotification(
  requesterId: string,
  recipientId: string
) {
  try {
    const supabase = await createClient();

    const { error: friendRequestError } = await supabase
      .from("friend_requests")
      .delete()
      .or(
        `and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),` +
          `and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`
      );
    if (friendRequestError) throw friendRequestError;

    const { error: notificationError } = await supabase
      .from("notifications")
      .update({
        is_action_taken: true,
        is_read: true,
        is_accept_friend: false,
      })
      .eq("type", "friend_request")
      .eq("from_user_id", requesterId)
      .eq("user_id", recipientId);
    if (notificationError) throw notificationError;
  } catch (error) {
    console.error("Error rejecting from notification:", error);
    throw error;
  }
}

export async function unfriend(userId: string, friendId: string) {
  try {
    const supabase = await createClient();

    // Validate input parameters
    if (!userId || !friendId) {
      throw new Error("Invalid user IDs provided");
    }

    if (userId === friendId) {
      throw new Error("Cannot unfriend yourself");
    }

    // Only unfriend if they are actually friends
    const status = await getFriendshipStatus(userId, friendId);
    if (status !== "friends") {
      throw new Error(`Users are not friends. Current status: ${status}`);
    }

    // Convert from mutual friendship to one-way follow by removing ONLY
    // the follow from current user -> friend. This keeps friend -> current user
    // so the friend remains as a follower after "unfriend".
    const { error, count } = await supabase
      .from("friend_requests")
      .delete({ count: "exact" })
      .match({ requester_id: userId, recipient_id: friendId });

    if (error) {
      console.error("Database error during unfriend:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Verify that at least one record was deleted
    if (count === 0) {
      console.warn("No friend requests found to delete");
      // This might happen due to race conditions, but we can still consider it a success
    }

    // Clear cache for both users
    clearUserCache(userId);
    clearUserCache(friendId);

    console.log(
      `Successfully unfriended: ${userId} -/-> ${friendId}, deleted ${count} record(s). Friend's follow remains intact.`
    );
    return { status: "success", deletedCount: count };
  } catch (error) {
    console.error("Error unfriending:", error);
    // Re-throw with more context for debugging
    if (error instanceof Error) {
      throw new Error(`Unfriend operation failed: ${error.message}`);
    } else {
      throw new Error("Unfriend operation failed: Unknown error");
    }
  }
}
