"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    Users,
    ChevronsUpDown,
    Sparkles,
    PackageOpen,
    TrendingUp,
    CheckCircle2,
    XCircle,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

// ── Static package catalogue derived from dummy data ─────────────────────────
const PACKAGES = [
    {
        id: "pkg-1x",
        name: "1x Pertemuan",
        key: "1x",
        sessions: 1,
        basePrice: 85000,
        serviceFee: 5000,
        totalPrice: 90000,
        status: "active" as const,
        category: "Satuan",
        description: "Cocok untuk murid yang ingin mencoba satu sesi sebelum berkomitmen.",
    },
    {
        id: "pkg-5x",
        name: "Paket Hemat 5x",
        key: "5x",
        sessions: 5,
        basePrice: 382500,
        serviceFee: 5000,
        totalPrice: 387500,
        status: "active" as const,
        category: "Hemat",
        description: "Paket populer untuk pembelajaran konsisten selama satu bulan.",
    },
    {
        id: "pkg-10x",
        name: "Paket Intensif 10x",
        key: "10x",
        sessions: 10,
        basePrice: 700000,
        serviceFee: 5000,
        totalPrice: 705000,
        status: "active" as const,
        category: "Intensif",
        description: "Paket paling hemat untuk murid yang serius dan ingin belajar cepat.",
    },
]

// ── Enrich packages with booking stats ───────────────────────────────────────
function buildPackageList() {
    const stats: Record<string, { totalOrders: number; totalRevenue: number; activeOrders: number; completedOrders: number }> = {}
    dummyData.bookings.forEach(b => {
        if (!stats[b.packageKey]) stats[b.packageKey] = { totalOrders: 0, totalRevenue: 0, activeOrders: 0, completedOrders: 0 }
        stats[b.packageKey].totalOrders += 1
        stats[b.packageKey].totalRevenue += b.totalPayment
        if (b.status === "active") stats[b.packageKey].activeOrders += 1
        if (b.status === "completed") stats[b.packageKey].completedOrders += 1
    })
    return PACKAGES.map(p => ({ ...p, stats: stats[p.key] ?? { totalOrders: 0, totalRevenue: 0, activeOrders: 0, completedOrders: 0 } }))
}

type PackageStatus = "all" | "active" | "inactive"
type SortField = "name" | "totalPrice" | "sessions" | "totalOrders"

const PAGE_SIZE = 10

function PaketContent() {
    const packages = useMemo(() => buildPackageList(), [])

    const [search, setSearch] = useState("")
    const [statusFilter, setStatus] = useState<PackageStatus>("all")
    const [sortField, setSortField] = useState<SortField>("name")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return packages
            .filter(p => {
                const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
                const matchStatus = statusFilter === "all" || p.status === statusFilter
                return matchSearch && matchStatus
            })
            .sort((a, b) => {
                let av: number | string = a.name, bv: number | string = b.name
                if (sortField === "totalPrice") { av = a.totalPrice; bv = b.totalPrice }
                else if (sortField === "sessions") { av = a.sessions; bv = b.sessions }
                else if (sortField === "totalOrders") { av = a.stats.totalOrders; bv = b.stats.totalOrders }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [packages, search, statusFilter, sortField, sortDir])

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

    const CATEGORY_COLORS: Record<string, string> = {
        Satuan: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
        Hemat: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        Intensif: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Paket</h1>
                </div>

                {/* ── Overview Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: "Total Paket", value: packages.length, icon: PackageOpen, color: "violet" },
                        { label: "Total Pesanan", value: packages.reduce((s, p) => s + p.stats.totalOrders, 0), icon: Users, color: "blue" },
                        { label: "Total Revenue", value: formatRupiah(packages.reduce((s, p) => s + p.stats.totalRevenue, 0)), icon: TrendingUp, color: "emerald" },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; icon: string }> = {
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                        }
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-9 h-9 rounded-lg ${clr[card.color].bg} flex items-center justify-center`}>
                                        <Icon className={`w-4.5 h-4.5 ${clr[card.color].icon}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                            </div>
                        )
                    })}
                </div>

                {/* ── Filter & Search ── */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        {(["all", "active", "inactive"] as PackageStatus[]).map(s => {
                            const label = s === "all" ? "Semua" : s === "active" ? "Aktif" : "Nonaktif"
                            const active = statusFilter === s
                            return (
                                <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${active ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}>
                                    {s === "all" && <Sparkles className="w-3.5 h-3.5" />}
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Cari nama atau kategori paket..."
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
                                        Nama Paket <SortIcon field="name" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Kategori
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("sessions")}>
                                        Sesi <SortIcon field="sessions" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalPrice")}>
                                        Harga <SortIcon field="totalPrice" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalOrders")}>
                                        Total Pesanan <SortIcon field="totalOrders" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Revenue
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
                                            <PackageOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada paket ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(pkg => (
                                    <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        {/* Nama */}
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-gray-900 dark:text-white text-xs">{pkg.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[200px] truncate">{pkg.description}</p>
                                        </td>
                                        {/* Kategori */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[pkg.category] ?? "bg-gray-100 text-gray-600"}`}>
                                                {pkg.category}
                                            </span>
                                        </td>
                                        {/* Sesi */}
                                        <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                            {pkg.sessions}x sesi
                                        </td>
                                        {/* Harga */}
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{formatRupiah(pkg.totalPrice)}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">+{formatRupiah(pkg.serviceFee)} fee</p>
                                        </td>
                                        {/* Total Pesanan */}
                                        <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                            {pkg.stats.totalOrders} pesanan
                                        </td>
                                        {/* Revenue */}
                                        <td className="px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatRupiah(pkg.stats.totalRevenue)}
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            {pkg.status === "active" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-3 h-3" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                    <XCircle className="w-3 h-3" /> Nonaktif
                                                </span>
                                            )}
                                        </td>
                                        {/* Aksi */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                                <button className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                                                    <Eye className="w-3.5 h-3.5" /> Detail
                                                </button>
                                                <span className="text-gray-200 dark:text-gray-700">|</span>
                                                <button className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium">
                                                    Nonaktifkan
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                    {p}
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

export default function PaketPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PaketContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
