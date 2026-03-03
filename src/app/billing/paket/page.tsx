"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ChevronLeft, ChevronRight, Package, TrendingUp, Users,
    Sparkles, ChevronsUpDown, Eye, ToggleRight, ToggleLeft, GraduationCap, BadgeInfo,
} from "lucide-react"
import Image from "next/image"
import dummyData from "@/data/billing-dummy.json"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TrainerPackage = typeof dummyData.trainerPackages[0]
type FilterStatus = "all" | "active" | "inactive"
type SortField = "name" | "sessions" | "totalPrice" | "totalOrders" | "totalRevenue"

const PAGE_SIZE = 10



// unique trainers from packages
const TRAINERS = Array.from(
    new Map(
        dummyData.trainerPackages.map(p => [p.trainerId, { id: p.trainerId, name: p.trainerName, avatar: p.trainerAvatar }])
    ).values()
)

// ── Main Content ──────────────────────────────────────────────────────────────
function PaketContent() {
    const basePkgs: TrainerPackage[] = dummyData.trainerPackages
    const [pkgStatuses, setPkgStatuses] = useState<Record<string, "active" | "inactive">>({})

    const allPkgs = basePkgs.map(p => ({
        ...p,
        status: pkgStatuses[p.id] ?? p.status,
    } as TrainerPackage))

    function handleTogglePackage(pkg: TrainerPackage) {
        const currentStatus = pkgStatuses[pkg.id] ?? pkg.status
        const nextStatus = currentStatus === "active" ? "inactive" : "active"
        setPkgStatuses(prev => ({ ...prev, [pkg.id]: nextStatus }))
        if (nextStatus === "inactive") {
            showToast({ type: "info", title: `Paket "${pkg.name}" dinonaktifkan`, message: `Guru: ${pkg.trainerName}`, endpoint: `PUT /api/v1/Packages/${pkg.id}/deactivate` })
        } else {
            showToast({ type: "success", title: `Paket "${pkg.name}" diaktifkan`, message: `Guru: ${pkg.trainerName}`, endpoint: `PUT /api/v1/Packages/${pkg.id}/activate` })
        }
    }

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")

    const [selectedTrainer, setSelectedTrainer] = useState<number | "all">("all")
    const [sortField, setSortField] = useState<SortField>("totalRevenue")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const [page, setPage] = useState(1)

    // ── Overall summary stats ─────────────────────────────────────────────────
    const stats = useMemo(() => ({
        totalPkgs: allPkgs.length,
        totalTrainers: TRAINERS.length,
        totalOrders: allPkgs.reduce((s, p) => s + p.totalOrders, 0),
        totalRevenue: allPkgs.reduce((s, p) => s + p.totalRevenue, 0),
        activePkgs: allPkgs.filter(p => p.status === "active").length,
    }), [allPkgs])

    // ── Per-trainer stats (for the trainer selector cards) ────────────────────
    const trainerStats = useMemo(() => TRAINERS.map(t => {
        const pkgs = allPkgs.filter(p => p.trainerId === t.id)
        return {
            ...t,
            totalPkgs: pkgs.length,
            totalRevenue: pkgs.reduce((s, p) => s + p.totalRevenue, 0),
            totalOrders: pkgs.reduce((s, p) => s + p.totalOrders, 0),
            activePkgs: pkgs.filter(p => p.status === "active").length,
        }
    }), [allPkgs])

    // ── Filtered + sorted list ────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return allPkgs
            .filter(p => {
                const matchTrainer = selectedTrainer === "all" || p.trainerId === selectedTrainer
                const matchSearch = !q || p.name.toLowerCase().includes(q) || p.trainerName.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
                const matchStatus = statusFilter === "all" || p.status === statusFilter
                return matchTrainer && matchSearch && matchStatus
            })
            .sort((a, b) => {
                let av: number | string = a[sortField] ?? 0
                let bv: number | string = b[sortField] ?? 0
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [allPkgs, search, selectedTrainer, statusFilter, sortField, sortDir])

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

    function selectTrainer(id: number | "all") {
        setSelectedTrainer(id)
        setPage(1)
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Paket</h1>
                    <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5 text-emerald-700 dark:text-emerald-400">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Paket dibuat &amp; dikelola oleh masing-masing Guru
                    </div>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Paket", value: stats.totalPkgs, sub: `${stats.activePkgs} aktif`, icon: Package, color: "violet" },
                        { label: "Total Guru", value: stats.totalTrainers, sub: "punya paket", icon: GraduationCap, color: "emerald" },
                        { label: "Total Pesanan", value: stats.totalOrders, sub: "dari semua paket", icon: Users, color: "blue" },
                        { label: "Total Revenue", value: formatRupiah(stats.totalRevenue), sub: "dari paket", icon: TrendingUp, color: "amber" },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; icon: string }> = {
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                            amber: { bg: "bg-amber-100 dark:bg-amber-900/20", icon: "text-amber-600 dark:text-amber-400" },
                        }
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-9 h-9 rounded-lg ${clr[card.color].bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${clr[card.color].icon}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>
                            </div>
                        )
                    })}
                </div>

                {/* ── Trainer Selector Cards ── */}
                <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide">Filter per Guru</p>
                    <div className="flex gap-2 flex-wrap">
                        {/* ALL button */}
                        <button
                            onClick={() => selectTrainer("all")}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${selectedTrainer === "all"
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}>
                            <Sparkles className="w-3.5 h-3.5" />
                            Semua Guru
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${selectedTrainer === "all" ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                {stats.totalPkgs}
                            </span>
                        </button>

                        {/* Per-trainer cards */}
                        {trainerStats.map(t => (
                            <button key={t.id}
                                onClick={() => selectTrainer(t.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${selectedTrainer === t.id
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}>
                                <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                    <Image src={t.avatar} alt={t.name} fill className="object-cover" unoptimized />
                                </div>
                                <span className="max-w-[100px] truncate">{t.name}</span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${selectedTrainer === t.id ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                    {t.totalPkgs}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── When a specific trainer is selected, show their mini-stats ── */}
                {selectedTrainer !== "all" && (() => {
                    const t = trainerStats.find(x => x.id === selectedTrainer)!
                    return (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-200 dark:ring-emerald-800 flex-shrink-0">
                                    <Image src={t.avatar} alt={t.name} fill className="object-cover" unoptimized />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t.name}</p>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Paket milik guru ini</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Paket Aktif", value: `${t.activePkgs} / ${t.totalPkgs}` },
                                    { label: "Total Pesanan", value: `${t.totalOrders}x` },
                                    { label: "Revenue", value: formatRupiah(t.totalRevenue) },
                                ].map(s => (
                                    <div key={s.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                                        <p className="text-[10px] text-gray-400 font-medium mb-1">{s.label}</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })()}

                {/* ── Filters Row ── */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                        {(["all", "active", "inactive"] as FilterStatus[]).map(s => {
                            const label = s === "all" ? "Semua" : s === "active" ? "Aktif" : "Nonaktif"
                            const active = statusFilter === s
                            return (
                                <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${active ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}>
                                    {label}
                                </button>
                            )
                        })}
                    </div>



                    {/* Search */}
                    <div className="relative flex-1 max-w-md ml-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Cari nama paket, guru, atau deskripsi..."
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
                                    {/* Show Guru column only when viewing all */}
                                    {selectedTrainer === "all" && (
                                        <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                            Guru Pemilik
                                        </th>
                                    )}

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
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalRevenue")}>
                                        Revenue <SortIcon field="totalRevenue" />
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
                                        <td colSpan={selectedTrainer === "all" ? 8 : 7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada paket ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(pkg => {

                                    return (
                                        <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">

                                            {/* Nama Paket */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{pkg.name}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[200px] truncate">{pkg.description}</p>
                                            </td>

                                            {/* Guru Pemilik (all view only) */}
                                            {selectedTrainer === "all" && (
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-emerald-100 dark:ring-emerald-900/30">
                                                            <Image src={pkg.trainerAvatar} alt={pkg.trainerName} fill className="object-cover" unoptimized />
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                                                            {pkg.trainerName}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}



                                            {/* Sesi */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {pkg.sessions}x sesi
                                            </td>

                                            {/* Harga */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{formatRupiah(pkg.basePrice)}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">+{formatRupiah(pkg.serviceFee)} fee</p>
                                            </td>

                                            {/* Total Pesanan */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {pkg.totalOrders} pesanan
                                            </td>

                                            {/* Revenue */}
                                            <td className="px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatRupiah(pkg.totalRevenue)}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                {pkg.status === "active" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </td>

                                            {/* Aksi */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                                                        <Eye className="w-3.5 h-3.5" /> Detail
                                                    </button>
                                                    <button
                                                        onClick={() => handleTogglePackage(pkg)}
                                                        className={`flex items-center gap-1 text-xs font-semibold border px-2 py-1 rounded-lg transition-colors ${pkg.status === "active"
                                                            ? "text-orange-500 hover:text-orange-600 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20"
                                                            : "text-emerald-600 hover:text-emerald-700 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
                                                            }`}>
                                                        {pkg.status === "active"
                                                            ? <><ToggleRight className="w-3.5 h-3.5" /> Nonaktifkan</>
                                                            : <><ToggleLeft className="w-3.5 h-3.5" /> Aktifkan</>}
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
                            Menampilkan {filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} paket
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

export default function PaketPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PaketContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
