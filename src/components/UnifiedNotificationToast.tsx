"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, X, ExternalLink, Users, UserPlus, Bell } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/hooks/use-auth"

interface TicketInfo {
    id: number
    ticket_number: string
    subject: string
    contact: string
    body?: string
    department?: string
}

interface ToastNotification {
    id: string
    type: string
    ticketId?: number
    ticket?: TicketInfo | null
    senderName: string
    message: string
    createdAt: string
    actionUrl?: string
}

export function UnifiedNotificationToast() {
    const router = useRouter()
    const { userId, isAuthenticated, loading } = useAuth()
    const [toast, setToast] = useState<ToastNotification | null>(null)
    const subscriptionSetupRef = useRef(false)
    const userIdRef = useRef<string | null>(null)
    // Deduplication: track recent toasts to prevent spam
    const recentToastsRef = useRef<Map<string, number>>(new Map())

    // Keep userId ref in sync
    useEffect(() => {
        userIdRef.current = userId ?? null
    }, [userId])

    const dismissToast = useCallback(() => {
        setToast(null)
    }, [])

    const handleAction = useCallback((url: string) => {
        router.push(url)
        dismissToast()
    }, [router, dismissToast])

    const showToast = useCallback(async (
        notificationId: string,
        type: string,
        ticketId?: number | null,
        fromUserId?: string | null
    ) => {
        // Skip if this is admin's own action (admin should not see their own replies)
        if (fromUserId && fromUserId === userIdRef.current) {
            console.log("🔔 Skipping notification from self:", notificationId)
            return
        }

        // Deduplication key: type + ticketId (or notificationId if no ticketId)
        const dedupKey = ticketId ? `${type}-${ticketId}` : notificationId
        const now = Date.now()
        const lastShown = recentToastsRef.current.get(dedupKey)
        if (lastShown && (now - lastShown) < 5000) {
            console.log(`🔔 Toast ${dedupKey} already shown ${Math.round((now - lastShown) / 1000)}s ago, skipping`)
            return
        }
        recentToastsRef.current.set(dedupKey, now)

        // Cleanup old entries
        const oneHourAgo = now - 3600000
        for (const [key, timestamp] of recentToastsRef.current.entries()) {
            if (timestamp < oneHourAgo) recentToastsRef.current.delete(key)
        }

        let supabase: ReturnType<typeof createClient>
        try {
            supabase = createClient()
        } catch {
            return
        }

        let senderName = "User"
        let ticketData: TicketInfo | null = null
        let message = ""
        let actionUrl = "/notification"

        // Fetch sender name
        if (fromUserId) {
            const { data } = await supabase
                .from("user_profiles")
                .select("name, username")
                .eq("id", fromUserId)
                .single()
            senderName = data?.name || data?.username || "User"
        }

        // Handle different notification types
        if (type === "ticket_new_message" || type === "ticket_replay") {
            // For ticket notifications - SET actionUrl IMMEDIATELY if ticketId exists
            if (ticketId) {
                actionUrl = `/support/tickets/${ticketId}`
            }

            // Fetch ticket data if we have a ticket ID  
            if (ticketId) {
                const { data } = await supabase
                    .from("tickets")
                    .select("id, ticket_number, subject, contact, body, department")
                    .eq("id", ticketId)
                    .single()
                ticketData = data as TicketInfo | null
            }

            if (type === "ticket_new_message") {
                message = ticketData?.contact
                    ? `Tiket baru dari ${ticketData.contact}`
                    : "Tiket support baru"
                senderName = ticketData?.contact || "User"
            } else {
                message = `Balasan baru dari ${senderName}`
            }

            // Final safety check - use ticketData.id as fallback
            if (actionUrl === "/notification" && ticketData?.id) {
                actionUrl = `/support/tickets/${ticketData.id}`
            }
        } else if (type === "friend_request") {
            message = `${senderName} mengirim permintaan pertemanan`
        } else if (type === "friend_accepted") {
            message = `${senderName} menerima permintaan Anda`
        } else if (type === "group_invitation") {
            message = `${senderName} mengundang Anda ke grup`
            actionUrl = "/groups"
        } else if (type === "group_join_request") {
            message = `${senderName} ingin bergabung ke grup Anda`
            actionUrl = "/groups"
        } else if (type === "recap_notification") {
            message = `Ada setoran baru dari ${senderName}`
        } else {
            message = `Notifikasi baru dari ${senderName}`
        }

        const newToast: ToastNotification = {
            id: notificationId,
            type,
            ticketId: ticketId ?? undefined,
            ticket: ticketData,
            senderName,
            message,
            createdAt: new Date().toISOString(),
            actionUrl
        }

        console.log("🔔 Showing toast with actionUrl:", actionUrl, "ticketId:", ticketId, "ticketData:", ticketData)
        setToast(newToast)
    }, [])

    useEffect(() => {
        if (loading) {
            console.log("🔔 UnifiedToast: Auth loading...")
            return
        }

        if (!isAuthenticated || !userId) {
            console.log("🔔 UnifiedToast: Not authenticated", { isAuthenticated, userId })
            return
        }

        if (subscriptionSetupRef.current) {
            console.log("🔔 UnifiedToast: Subscription already setup")
            return
        }

        let supabase: ReturnType<typeof createClient>
        try {
            supabase = createClient()
        } catch (error) {
            console.error("Failed to init realtime client:", error)
            return
        }

        console.log("🔔 UnifiedToast: Setting up realtime subscription for user:", userId)
        subscriptionSetupRef.current = true

        const channel = supabase
            .channel(`unified-toast-${userId}-${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications"
                },
                (payload) => {
                    console.log("🔔 New notification received:", payload)
                    const notification = payload.new as {
                        id: string
                        type: string
                        ticket_id: number | null
                        user_id: string | null
                        from_user_id: string | null
                    }

                    // Debug log
                    console.log("🔔 Notification details:", {
                        type: notification.type,
                        ticketId: notification.ticket_id,
                        userId: notification.user_id,
                        fromUserId: notification.from_user_id,
                        currentUserId: userId
                    })

                    // Show toast for:
                    // 1. Ticket notifications (any type) with ticket_id
                    // 2. Notifications targeted to current user
                    const isTicketNotification =
                        (notification.type === "ticket_new_message" || notification.type === "ticket_replay")
                        && notification.ticket_id

                    const isTargetedToMe = notification.user_id === userId

                    if (isTicketNotification || isTargetedToMe) {
                        console.log("🔔 Processing notification:", notification.type)
                        showToast(
                            notification.id,
                            notification.type,
                            notification.ticket_id,
                            notification.from_user_id
                        )
                    } else {
                        console.log("🔔 Skipping notification (not relevant):", notification.type)
                    }
                }
            )
            .subscribe((status) => {
                console.log("🔔 UnifiedToast subscription status:", status)
            })

        return () => {
            console.log("🔔 Cleaning up subscription")
            subscriptionSetupRef.current = false
            supabase?.removeChannel(channel)
        }
    }, [loading, isAuthenticated, userId, showToast])

    if (!toast) return null

    const getIcon = () => {
        switch (toast.type) {
            case "ticket_new_message":
            case "ticket_replay":
                return <MessageSquare className="w-5 h-5 text-white" />
            case "friend_request":
            case "friend_accepted":
                return <UserPlus className="w-5 h-5 text-white" />
            case "group_invitation":
            case "group_join_request":
                return <Users className="w-5 h-5 text-white" />
            default:
                return <Bell className="w-5 h-5 text-white" />
        }
    }

    const getTitle = () => {
        switch (toast.type) {
            case "ticket_new_message":
                return "Tiket Baru"
            case "ticket_replay":
                return "Balasan Tiket"
            case "friend_request":
                return "Permintaan Pertemanan"
            case "friend_accepted":
                return "Pertemanan Diterima"
            case "group_invitation":
                return "Undangan Grup"
            case "group_join_request":
                return "Permintaan Bergabung"
            case "recap_notification":
                return "Setoran Baru"
            default:
                return "Notifikasi"
        }
    }

    return (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-[9999] sm:w-[340px] animate-in slide-in-from-right-5 fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                {getIcon()}
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">{getTitle()}</p>
                                {toast.ticket && (
                                    <p className="text-white/80 text-xs">#{toast.ticket.ticket_number}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={dismissToast}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                            {toast.senderName.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{toast.senderName}</p>
                    </div>

                    {toast.ticket ? (
                        <>
                            <h3 className="font-medium text-gray-800 dark:text-gray-200 text-sm mb-1.5 line-clamp-2">
                                {toast.ticket.subject}
                            </h3>
                            {toast.ticket.body && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {toast.ticket.body}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{toast.message}</p>
                    )}
                </div>

                <div className="px-4 pb-4 flex gap-2">
                    <button
                        onClick={() => {
                            // Priority: use ticket.id, then ticketId, then actionUrl
                            const url = toast.ticket?.id
                                ? `/support/tickets/${toast.ticket.id}`
                                : toast.ticketId
                                    ? `/support/tickets/${toast.ticketId}`
                                    : (toast.actionUrl || "/notification")
                            console.log("🔔 Button clicked, navigating to:", url)
                            handleAction(url)
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Lihat Detail
                    </button>
                    <button
                        onClick={dismissToast}
                        className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    )
}