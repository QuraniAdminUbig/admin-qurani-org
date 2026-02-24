"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    Star,
    Users,
    ChevronsUpDown,
    CheckCircle2,
    Clock,
    XCircle,
    Sparkles,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import dummyData from "@/data/billing-dummy.json"

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

// ── status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
    verified: { label: "Terverifikasi", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: CheckCircle2 },
    pending: { label: "Menunggu", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", icon: Clock },
    suspended: { label: "Nonaktif", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", icon: XCircle },
} as const

type GuruStatus = "all" | "verified" | "pending" | "suspended"

// ── Derive guru list from bookingDetails ─────────────────────────────────────
function buildGuruList() {
    const seen = new Set<number>()
    const rawList = dummyData.bookingDetails
        .map(bd => bd.trainer)
        .filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true })

    // Enrich with stats from bookings
    const guruStats: Record<number, { totalStudents: number; totalSessions: number; totalRevenue: number; activeBookings: number }> = {}
    dummyData.bookings.forEach(b => {
        if (!guruStats[b.trainerId]) guruStats[b.trainerId] = { totalStudents: 0, totalSessions: 0, totalRevenue: 0, activeBookings: 0 }
        guruStats[b.trainerId].totalStudents += 1
        guruStats[b.trainerId].totalSessions += b.completedSessions
        guruStats[b.trainerId].totalRevenue += b.totalPayment
        if (b.status === "active") guruStats[b.trainerId].activeBookings += 1
    })

    // Static extra data matched by id
    const extras: Record<number, { status: GuruStatus; paymentMethod: string; joinDate: string }> = {
        301: { status: "verified", paymentMethod: "Ummi", joinDate: "2024-03-10" },
        302: { status: "verified", paymentMethod: "Tilawati", joinDate: "2024-05-22" },
        303: { status: "verified", paymentMethod: "Qiroati", joinDate: "2024-01-15" },
        304: { status: "pending", paymentMethod: "Al-Baghdadi", joinDate: "2025-08-01" },
        305: { status: "verified", paymentMethod: "Talaqqi", joinDate: "2024-07-19" },
    }

    return rawList.map(t => {
        const extra = extras[t.id] ?? { status: "pending" as GuruStatus, paymentMethod: "Ummi", joinDate: "2025-01-01" }
        const isVerified = extra.status === "verified"
        // Guru yang belum terverifikasi belum dipublish, sehingga belum bisa punya murid/revenue
        const rawStats = guruStats[t.id] ?? { totalStudents: 0, totalSessions: 0, totalRevenue: 0, activeBookings: 0 }
        return {
            ...t,
            ...extra,
            rating: isVerified ? t.rating : 0,
            stats: isVerified ? rawStats : { totalStudents: 0, totalSessions: 0, totalRevenue: 0, activeBookings: 0 },
        }
    })
}

type SortField = "name" | "rating" | "totalStudents" | "totalRevenue"
const PAGE_SIZE = 10

function GuruContent() {
    const guruList = useMemo(() => buildGuruList(), [])

    const [search, setSearch] = useState("")
    const [statusFilter, setStatus] = useState<GuruStatus>("all")
    const [sortField, setSortField] = useState<SortField>("name")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return guruList
            .filter(g => {
                const matchSearch = !q || g.name.toLowerCase().includes(q) || g.specialization.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
                const matchStatus = statusFilter === "all" || g.status === statusFilter
                return matchSearch && matchStatus
            })
            .sort((a, b) => {
                let av: number | string = a.name, bv: number | string = b.name
                if (sortField === "rating") { av = a.rating; bv = b.rating }
                else if (sortField === "totalStudents") { av = a.stats.totalStudents; bv = b.stats.totalStudents }
                else if (sortField === "totalRevenue") { av = a.stats.totalRevenue; bv = b.stats.totalRevenue }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [guruList, search, statusFilter, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function handleSort(f: SortField) {
        if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(f); setSortDir("asc") }
        setPage(1)
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-40 inline-block" />
        return <span className="ml-0.5 text-emerald-500 inline-block">{sortDir === "asc" ? "↑" : "↓"}</span>
    }

    // summary counts
    const countVerified = guruList.filter(g => g.status === "verified").length
    const countPending = guruList.filter(g => g.status === "pending").length
    const countSuspended = guruList.filter(g => g.status === "suspended").length

    const STATUS_TABS: { key: GuruStatus; label: string; count: number; color: string }[] = [
        { key: "all", label: "Semua", count: guruList.length, color: "emerald" },
        { key: "verified", label: "Terverifikasi", count: countVerified, color: "blue" },
        { key: "pending", label: "Menunggu", count: countPending, color: "amber" },
        { key: "suspended", label: "Nonaktif", count: countSuspended, color: "red" },
    ]

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Guru</h1>
                </div>

                {/* ── Status filter tabs ── */}
                <div className="flex items-center gap-2 flex-wrap">
                    {STATUS_TABS.map(t => {
                        const active = statusFilter === t.key
                        const colorMap: Record<string, string> = {
                            emerald: active ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400",
                            blue: active ? "bg-blue-500 text-white border-blue-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400",
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

                {/* ── Search bar ── */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Cari nama, email, atau spesialisasi..."
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
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Guru
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("rating")}>
                                        Rating <SortIcon field="rating" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Metode Mengaji
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalStudents")}>
                                        Murid <SortIcon field="totalStudents" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalRevenue")}>
                                        Total Revenue <SortIcon field="totalRevenue" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Pesanan Aktif
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
                                        <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada data yang ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(guru => {
                                    const st = STATUS_CFG[guru.status as keyof typeof STATUS_CFG]
                                    return (
                                        <tr key={guru.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            {/* Guru */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/30">
                                                        <Image
                                                            src={guru.avatar}
                                                            alt={guru.name}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-xs leading-tight">{guru.name}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px]">{guru.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Rating */}
                                            <td className="px-4 py-3">
                                                {guru.rating > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{guru.rating.toFixed(1)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            {/* Metode */}
                                            <td className="px-4 py-3 text-xs italic font-semibold text-gray-700 dark:text-gray-300">
                                                {guru.paymentMethod}
                                            </td>
                                            {/* Murid */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {guru.status === "verified"
                                                    ? <>{guru.stats.totalStudents} murid</>
                                                    : <span className="text-gray-400 dark:text-gray-600">—</span>}
                                            </td>
                                            {/* Revenue */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {guru.status === "verified"
                                                    ? formatRupiah(guru.stats.totalRevenue)
                                                    : <span className="text-gray-400 dark:text-gray-600">—</span>}
                                            </td>
                                            {/* Aktif */}
                                            <td className="px-4 py-3">
                                                {guru.status === "verified" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        {guru.stats.activeBookings} aktif
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st?.bg ?? ""} ${st?.text ?? ""}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st?.dot ?? ""}`} />
                                                    {st?.label ?? guru.status}
                                                </span>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/billing/guru/${guru.id}`}
                                                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                                                        <Eye className="w-3.5 h-3.5" /> Detail
                                                    </Link>
                                                    <span className="text-gray-200 dark:text-gray-700">|</span>
                                                    {guru.status === "pending" ? (
                                                        <button className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium">
                                                            Verifikasi
                                                        </button>
                                                    ) : guru.status === "verified" ? (
                                                        <button className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium">
                                                            Nonaktifkan
                                                        </button>
                                                    ) : (
                                                        <button className="text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 font-medium">
                                                            Aktifkan Kembali
                                                        </button>
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
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page
                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}>
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
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

export default function GuruPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <GuruContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
