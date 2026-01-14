"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useRealtime } from "./use-realtime";
import { getNotifications } from "@/utils/api/notifikasi/fetch";

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
}

export function useNotificationCount() {
  const { userId } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotificationCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const result = await getNotifications(userId);

      if (!result.error && result.data) {
        const notifications = result.data as MappedNotification[];
        const unread = notifications.filter((n) => !n.is_read).length;
        console.log("Notification count updated:", unread); // Debug log
        setUnreadCount(unread);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error loading notification count:", error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load notification count on mount and when user changes
  useEffect(() => {
    if (userId) {
      loadNotificationCount();
    }
  }, [userId, loadNotificationCount]);

  // Listen for realtime updates
  useRealtime({
    userId: userId,
    onDataChange: loadNotificationCount,
    enabled: !!userId,
    tables: ["notifications", "friend_requests"],
  });

  return {
    unreadCount,
    isLoading,
    refreshCount: loadNotificationCount,
  };
}
