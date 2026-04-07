"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import {
    MessageSquare, Lightbulb, XCircle, LayoutGrid,
    Phone, Mail, Calendar, ChevronRight, Search, Filter, GraduationCap
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
type KeluhanType = "semua" | "saran" | "keluhan" | "pembatalan"

interface KeluhanItem {
    id: number
    type: "saran" | "keluhan" | "pembatalan"
    user: {
        name: string
        email: string
        phone: string
        avatar?: string
        username: string
    }
    subject: string
    pesan: string
    date: string
    status: "menunggu" | "selesai"
    trainer: string
    trainerAvatar: string
    // only for pembatalan
    pembatalan?: {
        kategori: string
        ulasan: string
        resolusi: string
        lampiran?: string
        pesananId: string
        paket: string
        guru: string
    }
}

// ─── Dummy Data ──────────────────────────────────────────────────────────────
const DUMMY_KELUHAN: KeluhanItem[] = [
    {
        id: 1,
        type: "keluhan",
        user: {
            name: "Rahma Aulia",
            email: "rahma.aulia@email.com",
            phone: "0812-3456-7890",
            username: "rahmaaulia",
            avatar: "https://ui-avatars.com/api/?name=Rahma+Aulia&background=10b981&color=fff",
        },
        subject: "Guru tidak responsif",
        pesan: "Guru saya sudah 2 hari tidak membalas pesan saya di platform dan tidak hadir pada sesi yang sudah dijadwalkan. Saya sangat kecewa karena jadwal saya sudah terblokir.",
        date: "2026-04-05T10:30:00.000Z",
        status: "menunggu",
        trainer: "Indi Fitriani",
        trainerAvatar: "https://c.superprof.com/i/m/22913978/600/20241221202313/22913978.webp",
    },
    {
        id: 2,
        type: "saran",
        user: {
            name: "Zulfa Hanum",
            email: "zulfa.hanum@email.com",
            phone: "0813-9876-5432",
            username: "zulfhanum",
            avatar: "https://ui-avatars.com/api/?name=Zulfa+Hanum&background=6366f1&color=fff",
        },
        subject: "Tambahkan fitur rekam sesi",
        pesan: "Saya menyarankan agar platform Qurani menambahkan fitur perekaman sesi belajar secara otomatis, sehingga saya bisa menonton kembali materi yang sudah disampaikan guru.",
        date: "2026-04-04T14:15:00.000Z",
        status: "menunggu",
        trainer: "Hasyim asy'ari, Lc",
        trainerAvatar: "https://c.superprof.com/i/m/11946808/600/20251105122731/11946808.webp",
    },
    {
        id: 3,
        type: "pembatalan",
        user: {
            name: "Nur Hidayah",
            email: "nur.hidayah@email.com",
            phone: "0856-1122-3344",
            username: "nurhidayah",
            avatar: "https://ui-avatars.com/api/?name=Nur+Hidayah&background=f59e0b&color=fff",
        },
        subject: "Pembatalan Paket 3x Pertemuan",
        pesan: "Saya ingin membatalkan pesanan karena kondisi keluarga yang tidak memungkinkan untuk belajar saat ini.",
        date: "2026-04-03T09:00:00.000Z",
        status: "menunggu",
        trainer: "Indi Fitriani",
        trainerAvatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
        pembatalan: {
            pesananId: "#3006",
            paket: "3x Pertemuan",
            guru: "Indi Fitriani",
            kategori: "Kondisi Keluarga",
            ulasan: "Kondisi keluarga saya sedang tidak memungkinkan untuk mengikuti sesi belajar secara rutin dalam waktu dekat ini.",
            resolusi: "Refund Penuh",
            lampiran: "Tidak ada lampiran",
        },
    },
    {
        id: 4,
        type: "saran",
        user: {
            name: "Fauzia Nurrohma",
            email: "fauzia.nurrohma@email.com",
            phone: "0813-2233-4455",
            username: "fauzianurrohma",
            avatar: "https://ui-avatars.com/api/?name=Fauzia+Nurrohma&background=8b5cf6&color=fff",
        },
        subject: "Tampilan jadwal lebih informatif",
        pesan: "Alangkah lebih baik jika halaman jadwal pertemuan menampilkan zona waktu secara eksplisit, karena saya berada di Tangerang dan guru berada di kota berbeda.",
        date: "2026-04-02T16:45:00.000Z",
        status: "selesai",
        trainer: "Ustadz Iwan",
        trainerAvatar: "https://c.superprof.com/i/m/11668192/600/20250728190448/11668192.webp",
    },
    {
        id: 5,
        type: "keluhan",
        user: {
            name: "Ahmad Rifai",
            email: "ahmad.rifai@email.com",
            phone: "0878-5566-7788",
            username: "ahmadrifai",
            avatar: "https://ui-avatars.com/api/?name=Ahmad+Rifai&background=ef4444&color=fff",
        },
        subject: "Pembayaran tidak dikonfirmasi",
        pesan: "Saya sudah melakukan pembayaran via GoPay sejak 3 hari lalu namun status pesanan masih Menunggu Bayar. Bukti transfer sudah saya simpan.",
        date: "2026-04-01T11:20:00.000Z",
        status: "menunggu",
        trainer: "Indi Fitriani",
        trainerAvatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
    },
    {
        id: 6,
        type: "pembatalan",
        user: {
            name: "Siti Rahayu",
            email: "siti.rahayu@email.com",
            phone: "0821-4433-2211",
            username: "sitirahayu",
            avatar: "https://ui-avatars.com/api/?name=Siti+Rahayu&background=0ea5e9&color=fff",
        },
        subject: "Pembatalan — Ketidaksesuaian Jadwal",
        pesan: "Jadwal yang ditawarkan guru tidak sesuai dengan ketersediaan waktu saya, sehingga saya mengajukan pembatalan.",
        date: "2026-03-30T08:30:00.000Z",
        status: "selesai",
        trainer: "Ustadzah Aminah",
        trainerAvatar: "https://c.superprof.com/i/m/14912671/600/20250903235026/14912671.webp",
        pembatalan: {
            pesananId: "#3003",
            paket: "5x Pertemuan",
            guru: "Ustadzah Aminah",
            kategori: "Ketidaksesuaian Jadwal",
            ulasan: "Penampilan guru mirip dengan tetangga saya sehingga saya merasa kurang nyaman untuk belajar secara efektif.",
            resolusi: "Ganti Guru Baru",
            lampiran: "Tidak ada lampiran",
        },
    },
]

// ─── Config ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    keluhan: {
        label: "Keluhan",
        icon: MessageSquare,
        dotCls: "bg-rose-500",
        badgeCls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        borderCls: "border-rose-200 dark:border-rose-800/50",
        iconBg: "bg-rose-50 dark:bg-rose-900/20",
        iconCls: "text-rose-500",
    },
    saran: {
        label: "Saran",
        icon: Lightbulb,
        dotCls: "bg-amber-500",
        badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        borderCls: "border-amber-200 dark:border-amber-800/50",
        iconBg: "bg-amber-50 dark:bg-amber-900/20",
        iconCls: "text-amber-500",
    },
    pembatalan: {
        label: "Pembatalan",
        icon: XCircle,
        dotCls: "bg-gray-500",
        badgeCls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        borderCls: "border-gray-200 dark:border-gray-700",
        iconBg: "bg-gray-50 dark:bg-gray-800",
        iconCls: "text-gray-500",
    },
}

const STATUS_CONFIG = {
    menunggu: { label: "Menunggu", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    selesai: { label: "Selesai", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
    })
}

// ─── Card Component ───────────────────────────────────────────────────────────
function KeluhanCard({ item }: { item: KeluhanItem }) {
    const cfg = TYPE_CONFIG[item.type]
    const statusCfg = STATUS_CONFIG[item.status]
    const Icon = cfg.icon

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden ${cfg.borderCls}`}>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <img
                            src={item.user.avatar}
                            alt={item.user.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dotCls}`} />
                    </div>

                    {/* User Info */}
                    <div>
                        <p className="font-black text-gray-900 dark:text-white text-sm leading-tight">{item.user.name}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">@{item.user.username}</p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.date)}
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[9px] font-black uppercase tracking-wider rounded-full px-2.5 py-1 ${cfg.badgeCls}`}>
                        <span className="flex items-center gap-1">
                            <Icon className="w-2.5 h-2.5" />
                            {cfg.label}
                        </span>
                    </span>
                    {item.type === "pembatalan" && statusCfg && (
                        <span className={`text-[9px] font-black uppercase tracking-wider rounded-full px-2.5 py-1 ${statusCfg.cls}`}>
                            {statusCfg.label}
                        </span>
                    )}
                </div>
            </div>

            {/* Subject - Hide if cancellation details exist */}
            {!item.pembatalan && (
                <>
                    <div className="px-5 pb-2">
                        <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">{item.subject}</p>
                    </div>

                    {/* Message */}
                    <div className="px-5 pb-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                            {item.pesan}
                        </p>
                    </div>
                </>
            )}

            {/* Pembatalan Detail */}
            {item.pembatalan && (
                <div className="mx-5 mb-4 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-900/10 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider border-b border-rose-100 dark:border-rose-900/20 pb-2">
                        <XCircle className="w-3.5 h-3.5" />
                        Detail Pembatalan — {item.pembatalan.pesananId}
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Paket</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-right">{item.pembatalan.paket} &bull; {item.pembatalan.guru}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Kategori</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-right">{item.pembatalan.kategori}</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 font-bold uppercase tracking-tighter">Pesan / Ulasan</p>
                            <p className="text-gray-600 dark:text-gray-400 italic leading-relaxed bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-rose-100 dark:border-rose-900/30">
                                &ldquo;{item.pembatalan.ulasan}&rdquo;
                            </p>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter whitespace-nowrap">Resolusi Diminta</span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                {item.pembatalan.resolusi}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Lampiran</span>
                            <span className="text-gray-400 italic">{item.pembatalan.lampiran ?? "Tidak ada lampiran"}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Trainer Info + Action */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3 border-t border-gray-50 dark:border-gray-800 pt-4">
                <div className="flex items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-emerald-100 shadow-sm">
                            <img src={item.trainerAvatar} alt={item.trainer} className="w-full h-full object-cover" />
                        </div>
                        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                            <span className="font-bold uppercase tracking-tighter text-[9px]">Guru:</span>
                            <span className="font-bold text-gray-900 dark:text-gray-200">{item.trainer}</span>
                        </span>
                    </div>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap">
                    <Phone className="w-3.5 h-3.5" />
                    Hubungi User
                </button>
            </div>
        </div>
    )
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────
const FILTER_ITEMS = [
    { key: "semua", label: "Semua", icon: LayoutGrid },
    { key: "saran", label: "Saran", icon: Lightbulb },
    { key: "keluhan", label: "Keluhan", icon: MessageSquare },
    { key: "pembatalan", label: "Pembatalan", icon: XCircle },
] as const

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KeluhanPage() {
    const [activeFilter, setActiveFilter] = useState<KeluhanType>("semua")
    const [search, setSearch] = useState("")

    const filtered = DUMMY_KELUHAN.filter(item => {
        const matchType = activeFilter === "semua" || item.type === activeFilter
        const q = search.toLowerCase()
        const matchSearch = !q || item.user.name.toLowerCase().includes(q) || item.subject.toLowerCase().includes(q) || item.pesan.toLowerCase().includes(q)
        return matchType && matchSearch
    })

    const counts = {
        semua: DUMMY_KELUHAN.length,
        saran: DUMMY_KELUHAN.filter(i => i.type === "saran").length,
        keluhan: DUMMY_KELUHAN.filter(i => i.type === "keluhan").length,
        pembatalan: DUMMY_KELUHAN.filter(i => i.type === "pembatalan").length,
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
                <div className="max-w-[1200px] mx-auto space-y-5">

                    {/* ── Page Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Keluhan</h1>
                            <p className="text-sm text-gray-400 mt-0.5">Kelola komplain, saran, dan pembatalan pesanan dari user</p>
                        </div>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            {DUMMY_KELUHAN.length} Masuk
                        </span>
                    </div>

                    {/* ── Search ── */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama user, subjek, atau isi pesan..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent shadow-sm"
                        />
                    </div>

                    {/* ── Content ── */}
                    <div className="flex gap-5 items-start">

                        {/* ── Left Filter Card ── */}
                        <div className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 sticky top-5 space-y-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 pb-2 border-b border-gray-100 dark:border-gray-800">Filter</p>
                            {FILTER_ITEMS.map(f => {
                                const Icon = f.icon
                                const isActive = activeFilter === f.key
                                return (
                                    <button
                                        key={f.key}
                                        onClick={() => setActiveFilter(f.key)}
                                        className={`cursor-pointer w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700"
                                            }`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <Icon className={`w-4 h-4 ${isActive ? "text-emerald-500" : "text-gray-400"}`} />
                                            {f.label}
                                        </span>
                                        <span className={`text-[10px] font-black rounded-full min-w-[20px] text-center px-1.5 py-0.5 ${isActive ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" : "text-gray-400"}`}>
                                            {counts[f.key]}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* ── Right — Card List ── */}
                        <div className="flex-1 min-w-0 space-y-4">
                            {filtered.length === 0 ? (
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center shadow-sm">
                                    <Filter className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-gray-400">Tidak ada data ditemukan</p>
                                </div>
                            ) : (
                                filtered.map(item => <KeluhanCard key={item.id} item={item} />)
                            )}

                            {filtered.length > 0 && (
                                <p className="text-xs text-gray-400 text-center pb-4">
                                    Menampilkan {filtered.length} dari {DUMMY_KELUHAN.length} entri
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
