"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, Filter, MoreHorizontal, Calendar,
    ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
    Building2, Users, ChevronDown, Check
} from "lucide-react"
import rawData from "@/data/kyc-dummy.json"

// ─── Types ────────────────────────────────────────────────────────────────────
type KycOrg = {
    id: number
    nama: string
    singkatan?: string
    avatar: string
    avatarBg: string
    tipe: string[]
    kategori: string
    user: string
    tglPengajuan: string
    status: "menunggu" | "disetujui" | "ditolak"
}

const DATA: KycOrg[] = rawData.kyc_organisasi as KycOrg[]

// ─── Tipe badge config ────────────────────────────────────────────────────────
const TIPE_CONFIG: Record<string, { cls: string; icon: React.ReactNode }> = {
    YAYASAN: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    PESANTREN: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    LEMBAGA: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    KOMUNITAS: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    MADRASAH: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    PENDIDIKAN: { cls: "bg-blue-100 text-blue-700 border border-blue-200", icon: <Users className="w-3 h-3 mr-1 inline" /> },
}

const STATUS_CONFIG = {
    menunggu: { label: "Pending", cls: "bg-amber-50 text-amber-600 border border-amber-200", icon: Clock },
    disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle2 },
    ditolak: { label: "Ditolak", cls: "bg-red-50 text-red-600 border border-red-200", icon: XCircle },
}

// ─── Per-Page Custom Dropdown ────────────────────────────────────────────────
const PER_PAGE_OPTIONS = [10, 25, 50, 100]

function PerPageSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative inline-block ml-2">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                {value} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {open && (
                <div
                    className="absolute bottom-full left-0 mb-1 w-28 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1"
                    onMouseLeave={() => setOpen(false)}
                >
                    {PER_PAGE_OPTIONS.map(n => (
                        <button
                            key={n}
                            onClick={() => { onChange(n); setOpen(false) }}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${value === n
                                ? "bg-orange-50 dark:bg-emerald-900/20 text-gray-900 dark:text-white font-medium"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                }`}
                        >
                            {n}
                            {value === n && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Dropdown Aksi ────────────────────────────────────────────────────────────
function AksiDropdown({ id }: { id: number }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    onMouseLeave={() => setOpen(false)}
                >
                    {[
                        { label: "Lihat Detail" },
                        { label: "Setujui" },
                        { label: "Tolak" },
                    ].map(item => (
                        <button
                            key={item.label}
                            onClick={() => setOpen(false)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function KycOrganisasiContent() {
    const [activeTab, setActiveTab] = useState<"menunggu" | "disetujui" | "ditolak" | "semua">("menunggu")
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(10)

    const filteredData = useMemo(() => {
        let data = DATA
        if (activeTab !== "semua") data = data.filter(d => d.status === activeTab)
        if (search.trim()) data = data.filter(d =>
            d.nama.toLowerCase().includes(search.toLowerCase()) ||
            d.user.toLowerCase().includes(search.toLowerCase())
        )
        return data
    }, [activeTab, search])

    const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage))
    const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage)

    const tabCounts = {
        menunggu: DATA.filter(d => d.status === "menunggu").length,
        disetujui: DATA.filter(d => d.status === "disetujui").length,
        ditolak: DATA.filter(d => d.status === "ditolak").length,
        semua: DATA.length,
    }

    const tabs: { key: typeof activeTab; label: string }[] = [
        { key: "menunggu", label: "Menunggu" },
        { key: "disetujui", label: "Disetujui" },
        { key: "ditolak", label: "Ditolak" },
        { key: "semua", label: "Semua" },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
            <div className="max-w-[1600px] mx-auto">

                {/* ── Search + Filter Bar (OUTSIDE the table card) ── */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama organisasi..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Search className="w-3.5 h-3.5" /> Cari
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-2 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                </div>

                {/* ── Tabs (OUTSIDE the table card) ── */}
                <div className="flex gap-0 mb-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1) }}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab.key
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            {tab.label}
                            {/* count badge hanya muncul di tab aktif */}
                            {activeTab === tab.key && tabCounts[tab.key] > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                                    {tabCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Table Card (SEPARATE white card below tabs) ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-5 py-3 w-[33%]">Organisasi</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[18%]">Tipe &amp; Kategori</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">User</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">Tgl Pengajuan</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[12%]">Status</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[7%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20 text-gray-400 text-sm">
                                            Tidak ada data organisasi ditemukan
                                        </td>
                                    </tr>
                                ) : paginatedData.map(org => {
                                    const status = STATUS_CONFIG[org.status]
                                    const StatusIcon = status.icon
                                    return (
                                        <tr key={org.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">

                                            {/* Organisasi */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full ${org.avatarBg} flex items-center justify-center flex-shrink-0`}>
                                                        <span className="text-white text-xs font-bold">{org.avatar}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{org.nama}</p>
                                                        {org.singkatan && (
                                                            <p className="text-gray-400 text-xs mt-0.5">{org.singkatan}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tipe & Kategori */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {org.tipe.map(t => {
                                                        const conf = TIPE_CONFIG[t] ?? { cls: "bg-gray-100 text-gray-600 border border-gray-200", icon: null }
                                                        return (
                                                            <span key={t} className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${conf.cls}`}>
                                                                {conf.icon}{t}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                                <p className="text-xs text-gray-400">{org.kategori}</p>
                                            </td>

                                            {/* User */}
                                            <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{org.user}</td>

                                            {/* Tgl Pengajuan */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    {org.tglPengajuan}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                            </td>

                                            {/* Aksi */}
                                            <td className="px-4 py-4">
                                                <AksiDropdown id={org.id} />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* card ends here */}
                </div>

                {/* ── Pagination (OUTSIDE the card, on gray background) ── */}
                <div className="flex items-center justify-between px-1 py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-1">
                        Menampilkan{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {filteredData.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filteredData.length)}
                        </span>{" "}
                        dari <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredData.length}</span> data
                        &nbsp;
                        <span className="text-gray-400">Baris:</span>
                        <PerPageSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${page === p
                                        ? "bg-emerald-500 text-white"
                                        : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default function KycOrganisasiPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["common"]}>
                <KycOrganisasiContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
