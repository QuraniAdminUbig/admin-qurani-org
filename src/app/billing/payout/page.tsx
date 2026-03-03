"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle,
    ChevronsUpDown, Sparkles, Wallet, ArrowUpRight, AlertCircle, BadgeCheck,
    SendHorizonal, RotateCcw,
} from "lucide-react"
import Image from "next/image"
import dummyData from "@/data/billing-dummy.json"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
    })
}

function formatRelativeTime(iso: string | null) {
    if (!iso) return "—"
    const now = new Date()
    const past = new Date(iso)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (diffInSeconds < 0) return "just now" // handles future dates slightly
    if (diffInSeconds < 60) return "just now"

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} hour${diffInMinutes > 1 ? "s" : ""} ago`.replace("hour", "minute") // shortcut logic

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`

    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`

    const diffInYears = Math.floor(diffInDays / 365)
    return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`
}

// ── Derive payout list from bookingDetails & bookings ─────────────────────────
const PLATFORM_COMMISSION = 0.15 // 15% platform fee

function buildPayoutList() {
    // Aggregate revenue per trainer from completed bookings
    const trainerMap: Record<number, {
        trainer: typeof dummyData.bookingDetails[0]["trainer"]
        grossRevenue: number
        completedOrders: number
        pendingOrders: number
    }> = {}

    dummyData.bookings.forEach(b => {
        if (!trainerMap[b.trainerId]) {
            // find trainer detail
            const detail = dummyData.bookingDetails.find(bd => bd.trainer.id === b.trainerId)
            if (!detail) return
            trainerMap[b.trainerId] = {
                trainer: detail.trainer,
                grossRevenue: 0,
                completedOrders: 0,
                pendingOrders: 0,
            }
        }
        if (b.status === "completed") {
            trainerMap[b.trainerId].grossRevenue += b.totalPayment
            trainerMap[b.trainerId].completedOrders += 1
        }
        if (b.status === "active") {
            trainerMap[b.trainerId].pendingOrders += 1
        }
    })

    // Static payout status for each trainer
    const payoutStaticData: Record<number, { status: "pending" | "approved" | "rejected"; bank: string; requestedAt: string }> = {
        301: { status: "pending", bank: "Bank Syariah Indonesia", requestedAt: "2026-02-20T08:00:00Z" },
        302: { status: "approved", bank: "Bank BCA", requestedAt: "2026-02-15T10:30:00Z" },
        303: { status: "pending", bank: "Bank Mandiri", requestedAt: "2026-02-22T09:00:00Z" },
        304: { status: "rejected", bank: "Bank BNI", requestedAt: "2026-02-10T14:00:00Z" },
        305: { status: "approved", bank: "Bank BCA Syariah", requestedAt: "2026-02-18T11:00:00Z" },
    }

    return Object.values(trainerMap).map(t => {
        const commission = t.grossRevenue * PLATFORM_COMMISSION
        const netPayout = t.grossRevenue - commission
        const extra = payoutStaticData[t.trainer.id] ?? { status: "pending" as const, bank: "Bank Mandiri", requestedAt: "2026-02-24T00:00:00Z" }
        return {
            ...t,
            ...extra,
            commission,
            netPayout,
        }
    })
}

type PayoutStatus = "all" | "pending" | "approved" | "rejected"
type SortField = "name" | "grossRevenue" | "netPayout" | "requestedAt"
type PayoutEntry = ReturnType<typeof buildPayoutList>[0] & { _status?: "pending" | "approved" | "rejected"; _rejectReason?: string }

const PAGE_SIZE = 10

const STATUS_CFG = {
    pending: { label: "Menunggu", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", icon: Clock },
    approved: { label: "Disetujui", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: CheckCircle2 },
    rejected: { label: "Ditolak", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", icon: XCircle },
} as const

// ── Reject Modal ────────────────────────────────────────────────────────────────
function RejectModal({ open, trainerName, onConfirm, onCancel }: {
    open: boolean; trainerName: string
    onConfirm: (reason: string) => void; onCancel: () => void
}) {
    const [reason, setReason] = useState("")
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Tolak Payout</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Guru: <strong>{trainerName}</strong></p>

                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Alasan Penolakan *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder="Contoh: Verifikasi rekening gagal, dokumen tidak lengkap..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none mb-4" />
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={() => reason && onConfirm(reason)}
                        disabled={!reason}
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors">Tolak Payout</button>
                </div>
            </div>
        </div>
    )
}

function PayoutContent() {
    const basePayouts = useMemo(() => buildPayoutList(), [])
    const [payoutStates, setPayoutStates] = useState<Record<number, { status: "pending" | "approved" | "rejected"; rejectReason?: string }>>({})
    const [rejectTarget, setRejectTarget] = useState<PayoutEntry | null>(null)

    const payouts: PayoutEntry[] = basePayouts.map(p => ({
        ...p,
        status: payoutStates[p.trainer.id]?.status ?? p.status,
        _rejectReason: payoutStates[p.trainer.id]?.rejectReason,
    }))

    const [search, setSearch] = useState("")
    const [statusFilter, setStatus] = useState<PayoutStatus>("all")
    const [sortField, setSortField] = useState<SortField>("requestedAt")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const [page, setPage] = useState(1)

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return payouts
            .filter(p => {
                const matchSearch = !q || p.trainer.name.toLowerCase().includes(q) || p.bank.toLowerCase().includes(q)
                const matchStatus = statusFilter === "all" || p.status === statusFilter
                return matchSearch && matchStatus
            })
            .sort((a, b) => {
                let av: number | string = a.trainer.name, bv: number | string = b.trainer.name
                if (sortField === "grossRevenue") { av = a.grossRevenue; bv = b.grossRevenue }
                else if (sortField === "netPayout") { av = a.netPayout; bv = b.netPayout }
                else if (sortField === "requestedAt") { av = a.requestedAt; bv = b.requestedAt }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [payouts, search, statusFilter, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function handleSort(f: SortField) {
        if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(f); setSortDir("desc") }
        setPage(1)
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-40 inline-block" />
        return <span className="ml-0.5 text-emerald-500 inline-block">{sortDir === "asc" ? "↑" : "↓"}</span>
    }

    // Overview stats
    const totalPending = payouts.filter(p => p.status === "pending").length
    const totalApproved = payouts.filter(p => p.status === "approved").length
    const totalGross = payouts.reduce((s, p) => s + p.grossRevenue, 0)
    const totalNet = payouts.reduce((s, p) => s + p.netPayout, 0)

    const STATUS_TABS: { key: PayoutStatus; label: string; count: number; color: string }[] = [
        { key: "all", label: "Semua", count: payouts.length, color: "emerald" },
        { key: "pending", label: "Menunggu", count: payouts.filter(p => p.status === "pending").length, color: "amber" },
        { key: "approved", label: "Disetujui", count: payouts.filter(p => p.status === "approved").length, color: "emerald" },
        { key: "rejected", label: "Ditolak", count: payouts.filter(p => p.status === "rejected").length, color: "red" },
    ]

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <RejectModal
                open={!!rejectTarget}
                trainerName={rejectTarget?.trainer.name ?? ""}
                onConfirm={reason => {
                    if (!rejectTarget) return
                    setPayoutStates(prev => ({ ...prev, [rejectTarget.trainer.id]: { status: "rejected", rejectReason: reason } }))
                    showToast({ type: "info", title: `Payout ${rejectTarget.trainer.name} ditolak`, message: reason, endpoint: `POST /api/v1/Payouts/${rejectTarget.trainer.id}/reject` })
                    setRejectTarget(null)
                }}
                onCancel={() => setRejectTarget(null)}
            />
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout Guru</h1>
                </div>

                {/* ── Overview Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Menunggu Approval", value: totalPending, icon: Clock, color: "amber", suffix: "guru" },
                        { label: "Sudah Disetujui", value: totalApproved, icon: BadgeCheck, color: "emerald", suffix: "guru" },
                        { label: "Total Gross Revenue", value: formatRupiah(totalGross), icon: ArrowUpRight, color: "blue", suffix: "" },
                        { label: "Total Net Payout", value: formatRupiah(totalNet), icon: Wallet, color: "violet", suffix: "" },
                    ].map(card => {
                        const Icon = card.icon
                        const clrMap: Record<string, { bg: string; icon: string }> = {
                            amber: { bg: "bg-amber-100 dark:bg-amber-900/20", icon: "text-amber-600 dark:text-amber-400" },
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                        }
                        const clr = clrMap[card.color]
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-9 h-9 rounded-lg ${clr.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4.5 h-4.5 ${clr.icon}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {card.value}{card.suffix && <span className="text-xs font-normal text-gray-400 ml-1">{card.suffix}</span>}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* ── Filter tabs & Search ── */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        {STATUS_TABS.map(t => {
                            const active = statusFilter === t.key
                            const colorMap: Record<string, string> = {
                                emerald: active ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400",
                                amber: active ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-400",
                                red: active ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-red-400",
                            }
                            return (
                                <button key={t.key}
                                    onClick={() => { setStatus(t.key); setPage(1) }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${colorMap[t.color]}`}>
                                    {t.key === "all" && <Sparkles className="w-3.5 h-3.5" />}
                                    {t.label}: {t.count}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Cari nama guru atau bank..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("name")}>
                                        Guru <SortIcon field="name" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Bank Tujuan
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Pesanan Selesai
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("grossRevenue")}>
                                        Gross Revenue <SortIcon field="grossRevenue" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Komisi (15%)
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("netPayout")}>
                                        Net Payout <SortIcon field="netPayout" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("requestedAt")}>
                                        Tgl Request <SortIcon field="requestedAt" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Status
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada data payout</p>
                                        </td>
                                    </tr>
                                ) : paged.map(p => {
                                    const st = STATUS_CFG[p.status]
                                    return (
                                        <tr key={p.trainer.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            {/* Guru */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/30">
                                                        <Image src={p.trainer.avatar} alt={p.trainer.name} fill className="object-cover" unoptimized />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-xs leading-tight">{p.trainer.name}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px]">{p.trainer.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Bank */}
                                            <td className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                {p.bank}
                                            </td>
                                            {/* Pesanan Selesai */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {p.completedOrders}x selesai
                                            </td>
                                            {/* Gross Revenue */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {formatRupiah(p.grossRevenue)}
                                            </td>
                                            {/* Komisi */}
                                            <td className="px-4 py-3 text-xs font-semibold text-red-500 dark:text-red-400">
                                                -{formatRupiah(p.commission)}
                                            </td>
                                            {/* Net Payout */}
                                            <td className="px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatRupiah(p.netPayout)}
                                            </td>
                                            <td className="px-4 py-3 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                {formatRelativeTime(p.requestedAt)}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.bg} ${st.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                                    {st.label}
                                                </span>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    {p.status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setPayoutStates(prev => ({ ...prev, [p.trainer.id]: { status: "approved" } }))
                                                                    showToast({ type: "success", title: `Payout ${p.trainer.name} disetujui`, message: `Net: ${formatRupiah(p.netPayout)}`, endpoint: `POST /api/v1/Payouts/${p.trainer.id}/approve` })
                                                                }}
                                                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg transition-colors">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectTarget(p as PayoutEntry)}
                                                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
                                                                <XCircle className="w-3.5 h-3.5" /> Tolak
                                                            </button>
                                                        </>
                                                    )}
                                                    {p.status === "approved" && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    showToast({ type: "info", title: `Transfer ke ${p.trainer.name} diproses`, message: `${formatRupiah(p.netPayout)} → ${p.bank}`, endpoint: `POST /api/v1/Payouts/${p.trainer.id}/process` })
                                                                }}
                                                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                                                                <SendHorizonal className="w-3.5 h-3.5" /> Proses Transfer
                                                            </button>
                                                        </>
                                                    )}
                                                    {p.status === "rejected" && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setPayoutStates(prev => ({ ...prev, [p.trainer.id]: { status: "pending" } }))
                                                                    showToast({ type: "info", title: "Payout dikembalikan ke pending", endpoint: `PUT /api/v1/Payouts/${p.trainer.id}/status` })
                                                                }}
                                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg transition-colors">
                                                                <RotateCcw className="w-3 h-3" /> Reset
                                                            </button>
                                                            {p._rejectReason && (
                                                                <span className="text-[10px] text-red-400 italic truncate max-w-[100px]" title={p._rejectReason}>⚠ {p._rejectReason}</span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ── */}
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n} onClick={() => setPage(n)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${n === page ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                    {n}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default function PayoutPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PayoutContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
