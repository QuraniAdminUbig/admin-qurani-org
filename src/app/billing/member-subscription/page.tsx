"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    RefreshCcw,
    Download,
    Filter,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronsUpDown,
    Wifi,
    MapPin,
    Sparkles,
} from "lucide-react"
import Link from "next/link"
import dummyData from "@/data/billing-dummy.json"

// ── types ────────────────────────────────────────────────────────────────────
type BookingStatus = "all" | "active" | "completed" | "cancelled"
type PackageKey = "all" | "1x" | "5x" | "10x"

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

// ── status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
    active: { label: "Aktif", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    completed: { label: "Selesai", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
    cancelled: { label: "Batal", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
} as const

// ── package badge ─────────────────────────────────────────────────────────────
const PACKAGE_CFG: Record<string, { label: string; cls: string }> = {
    "1x": { label: "1x Pertemuan", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    "5x": { label: "5x Pertemuan", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    "10x": { label: "10x Pertemuan", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
}

// ── session fraction badge ────────────────────────────────────────────────────
function SessionBadge({ completed, total }: { completed: number; total: number }) {
    const cls = completed === 0
        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}>
            {completed}/{total} sesi
        </span>
    )
}

const PAGE_SIZE = 10

function MemberSubscriptionContent() {
    const bookings = dummyData.bookings

    const [search, setSearch] = useState("")
    const [statusFilter, setStatus] = useState<BookingStatus>("all")
    const [packageFilter, setPackage] = useState<PackageKey>("all")
    const [page, setPage] = useState(1)
    const [sortField, setSortField] = useState<string>("id")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

    // Summary counts
    const summary = useMemo(() => ({
        total: bookings.length,
        active: bookings.filter(b => b.status === "active").length,
        completed: bookings.filter(b => b.status === "completed").length,
        cancelled: bookings.filter(b => b.status === "cancelled").length,
    }), [bookings])

    // Filter + search + sort
    const filtered = useMemo(() => {
        let list = [...bookings]
        if (statusFilter !== "all") list = list.filter(b => b.status === statusFilter)
        if (packageFilter !== "all") list = list.filter(b => b.packageKey === packageFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(b =>
                b.userName.toLowerCase().includes(q) ||
                b.userEmail.toLowerCase().includes(q) ||
                b.trainerName.toLowerCase().includes(q) ||
                b.packageName.toLowerCase().includes(q) ||
                (b as any).paymentGateway?.toLowerCase().includes(q) ||
                String(b.id).includes(q)
            )
        }
        list.sort((a, b) => {
            let av: number | string = (a as unknown as Record<string, number | string>)[sortField] ?? ""
            let bv: number | string = (b as unknown as Record<string, number | string>)[sortField] ?? ""
            if (typeof av === "string") av = av.toLowerCase()
            if (typeof bv === "string") bv = bv.toLowerCase()
            if (av < bv) return sortDir === "asc" ? -1 : 1
            if (av > bv) return sortDir === "asc" ? 1 : -1
            return 0
        })
        return list
    }, [bookings, statusFilter, packageFilter, search, sortField, sortDir])

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function handleSort(field: string) {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(field); setSortDir("asc") }
        setPage(1)
    }

    function SortIcon({ field }: { field: string }) {
        return (
            <ChevronsUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"
                }`} />
        )
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h1 className="text-2xl font-black text-gray-950 dark:text-white">
                        Member Subscription
                    </h1>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                            <RefreshCcw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Status tabs ── */}
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { key: "all", label: `Semua: ${summary.total}`, icon: Users, active: statusFilter === "all" },
                        { key: "active", label: `Aktif: ${summary.active}`, icon: Clock, active: statusFilter === "active" },
                        { key: "completed", label: `Selesai: ${summary.completed}`, icon: CheckCircle2, active: statusFilter === "completed" },
                        { key: "cancelled", label: `Dibatalkan: ${summary.cancelled}`, icon: XCircle, active: statusFilter === "cancelled" },
                    ].map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.key}
                                onClick={() => { setStatus(tab.key as BookingStatus); setPage(1) }}
                                className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg border transition-colors ${tab.active
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold"
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* ── Toolbar: search + paket filter ── */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, email, trainer, atau paket..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Paket:</span>
                        {[
                            { key: "all", label: "Semua" },
                            { key: "1x", label: "1x Pertemuan" },
                            { key: "5x", label: "5x Pertemuan" },
                            { key: "10x", label: "10x Pertemuan" },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setPackage(t.key as PackageKey); setPage(1) }}
                                className={`text-xs px-4 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${packageFilter === t.key
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold"
                                    : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold"
                                    }`}
                            >
                                {t.key === 'all' && <Sparkles className="w-3.5 h-3.5" />}
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("id")}>
                                        ID <SortIcon field="id" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("userName")}>
                                        Member <SortIcon field="userName" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("trainerName")}>
                                        Guru <SortIcon field="trainerName" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("packageName")}>
                                        Paket <SortIcon field="packageName" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("packageKey")}>
                                        Sesi <SortIcon field="packageKey" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("completedSessions")}>
                                        Progress <SortIcon field="completedSessions" />
                                    </th>

                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalPayment")}>
                                        Harga <SortIcon field="totalPayment" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("status")}>
                                        Status <SortIcon field="status" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("bookingDate")}>
                                        Tgl Pesan <SortIcon field="bookingDate" />
                                    </th>
                                    <th className="text-left text-xs font-extrabold text-slate-900 dark:text-slate-200 px-4 py-3 whitespace-nowrap">
                                        Payment
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada data yang ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(booking => {
                                    const st = STATUS_CFG[booking.status as keyof typeof STATUS_CFG]
                                    const pkg = PACKAGE_CFG[booking.packageKey] ?? { label: booking.packageKey, cls: "bg-gray-100 text-gray-600" }
                                    return (
                                        <tr key={booking.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            {/* ID */}
                                            <td className="px-4 py-3 text-xs text-slate-600 font-bold font-mono">
                                                #{booking.id}
                                            </td>
                                            {/* Member */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                        {booking.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-950 dark:text-white text-xs leading-tight">{booking.userName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Trainer */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-950 dark:text-gray-100">{booking.trainerName}</td>
                                            {/* Paket */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{booking.packageName}</td>
                                            {/* Sesi badge */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${pkg.cls}`}>
                                                    {pkg.label}
                                                </span>
                                            </td>
                                            {/* Progress — fraction badge */}
                                            <td className="px-4 py-3">
                                                <SessionBadge
                                                    completed={booking.completedSessions}
                                                    total={booking.totalSessions}
                                                />
                                            </td>

                                            {/* Harga */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-950 dark:text-white">
                                                {formatRupiah(booking.totalPayment)}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st?.bg ?? ""} ${st?.text ?? ""}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st?.dot ?? ""}`} />
                                                    {st?.label ?? booking.status}
                                                </span>
                                            </td>
                                            {/* Tgl Booking */}
                                            <td className="px-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                {formatDate(booking.bookingDate)}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-950 dark:text-slate-100">
                                                <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                                                    {(booking as any).paymentGateway}
                                                </span>
                                            </td>
                                            {/* Operate */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/billing/member-subscription/${booking.id}`}
                                                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                                                        <Eye className="w-3.5 h-3.5" /> Detail
                                                    </Link>
                                                    <span className="text-gray-200 dark:text-gray-700">|</span>
                                                    <button className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium">
                                                        Batalkan
                                                    </button>
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
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
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

export default function MemberSubscriptionPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <MemberSubscriptionContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
