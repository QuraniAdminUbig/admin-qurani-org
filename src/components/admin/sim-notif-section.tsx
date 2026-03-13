"use client"

import React, { useState, useEffect, useCallback } from "react"
import { CheckCircle2, ShoppingBag, Zap, Trash2, ExternalLink } from "lucide-react"
import { getSimNotifs, markSimNotifsRead, updateSimOrderPayment, addSimNotif, type SimNotif } from "@/lib/sim-store"
import { useRouter } from "next/navigation"

// ── Time ago helper ───────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Baru saja"
    if (mins < 60) return `${mins} menit yang lalu`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} jam yang lalu`
    const days = Math.floor(hours / 24)
    return `${days} hari yang lalu`
}

// ── Single Sim Notif Item ─────────────────────────────────────────────────────
function SimNotifItem({ notif, onItemClick, onPayClick }: {
    notif: SimNotif
    onItemClick: () => void
    onPayClick: (orderId: number) => void
}) {
    const isPaid = notif.type === "payment_success"
    const isPending = notif.type === "new_order"

    return (
        <div
            onClick={onItemClick}
            className={`group relative overflow-hidden rounded-xl border p-3 sm:p-4 transition-all duration-300 hover:shadow-lg cursor-pointer
                ${!notif.isRead
                    ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                }`}
        >
            {/* Unread indicator */}
            {!notif.isRead && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse z-10" />
            )}

            {/* SIMULASI badge */}
            <div className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Zap className="w-2.5 h-2.5" />
                SIM
            </div>

            <div className="flex items-start gap-3 mt-4">
                {/* Icon */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-lg
                    ${isPaid ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                    {isPaid
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        : <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 leading-tight">
                            {notif.message}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 whitespace-nowrap">
                            {timeAgo(notif.createdAt)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {notif.subMessage}
                    </p>

                    {/* Action button for pending orders */}
                    {isPending && notif.orderId && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPayClick(notif.orderId) }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all duration-150 active:scale-95 shadow-sm"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Lihat & Bayar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Main Section Component ────────────────────────────────────────────────────
export function SimNotifSection() {
    const router = useRouter()
    const [notifs, setNotifs] = useState<SimNotif[]>([])
    const [isExpanded, setIsExpanded] = useState(true)

    const refresh = useCallback(() => {
        setNotifs(getSimNotifs())
    }, [])

    useEffect(() => {
        refresh()
        // Mark all as read when section is viewed
        markSimNotifsRead()

        window.addEventListener("sim-notif-update", refresh)
        return () => window.removeEventListener("sim-notif-update", refresh)
    }, [refresh])

    if (notifs.length === 0) return null

    const unreadCount = notifs.filter(n => !n.isRead).length

    function handlePayClick(orderId: number) {
        // Langsung konfirmasi bayar sim order
        updateSimOrderPayment(orderId, "Transfer")
        addSimNotif({
            type: "payment_success",
            message: `Pembayaran Lunas 💰 — Pesanan #${orderId}`,
            subMessage: "Pembayaran dikonfirmasi via Notifikasi",
            isRead: false,
            orderId,
        })
        // Trigger refresh di halaman pesanan
        window.dispatchEvent(new Event("sim-notif-update"))
        router.push("/billing/pesanan")
    }

    function handleItemClick() {
        router.push("/billing/pesanan")
    }

    return (
        <div className="mb-4">
            {/* Section header */}
            <button
                onClick={() => setIsExpanded(o => !o)}
                className="w-full flex items-center justify-between px-1 py-2 mb-2 group"
            >
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <Zap className="w-3 h-3" />
                        NOTIFIKASI SIMULASI
                    </span>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <span>{notifs.length} notifikasi</span>
                    <span className="transition-transform duration-200" style={{ rotate: isExpanded ? "0deg" : "-90deg" }}>▼</span>
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="space-y-2">
                    {notifs.map((n, i) => (
                        <SimNotifItem
                            key={`${n.id}-${i}`}
                            notif={n}
                            onItemClick={handleItemClick}
                            onPayClick={handlePayClick}
                        />
                    ))}

                    {/* Info footer */}
                    <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-slate-400 dark:text-slate-500">
                        <Zap className="w-3 h-3 text-emerald-500" />
                        Data simulasi — disimpan di localStorage browser
                    </div>
                </div>
            )}
        </div>
    )
}
