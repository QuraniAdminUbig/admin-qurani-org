"use client"

import { useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    ArrowLeft, MessageSquare, XCircle,
    Calendar, Star,
    BookOpen, CheckCircle2, X,
    AlertTriangle, Wallet
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface KeluhanItem {
    id: number
    type: "keluhan" | "pembatalan"
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
    trainerUsername: string
    trainerAvatar: string
    trainerRating: number
    // Order info
    metode: string
    mulaiSesi: string
    payment: string
    paymentStatus: string
    paket: string
    harga: number
    sesiTerpakai: number
    totalSesi: number
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
        trainerUsername: "indi.f",
        trainerAvatar: "https://c.superprof.com/i/m/22913978/600/20241221202313/22913978.webp",
        trainerRating: 4.9,
        metode: "Online · Ummi",
        mulaiSesi: "Sabtu, 05 April 2026",
        payment: "GoPay · Lunas",
        paymentStatus: "Lunas",
        paket: "5x Pertemuan",
        harga: 420000,
        sesiTerpakai: 2,
        totalSesi: 5,
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
        trainerUsername: "indi.f",
        trainerAvatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
        trainerRating: 4.8,
        metode: "Offline · Ummi",
        mulaiSesi: "Kamis, 03 April 2026",
        payment: "GoPay · Lunas",
        paymentStatus: "Lunas",
        paket: "3x Pertemuan",
        harga: 280000,
        sesiTerpakai: 0,
        totalSesi: 3,
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
        id: 5,
        type: "keluhan",
        user: {
            name: "Ahmad Rifai",
            email: "ahmad.rifai@email.com",
            phone: "0878-5566-7788",
            username: "ahmadrifai",
            avatar: "https://ui-avatars.com/api/?name=Ahmad+Rifai&background=ef4444&color=fff",
        },
        subject: "Penampilan Tidak Sesuai",
        pesan: "Penampilan guru mirip dengan tetangga saya sehingga saya merasa kurang nyaman untuk belajar secara efektif.",
        date: "2026-04-01T11:20:00.000Z",
        status: "menunggu",
        trainer: "Indi Fitriani",
        trainerUsername: "indi.f",
        trainerAvatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
        trainerRating: 4.9,
        metode: "Offline · Ummi",
        mulaiSesi: "Kamis, 05 Maret 2026",
        payment: "GoPay · Lunas",
        paymentStatus: "Lunas",
        paket: "5x Pertemuan",
        harga: 420000,
        sesiTerpakai: 0,
        totalSesi: 5,
        pembatalan: {
            pesananId: "#3005",
            paket: "5x Pertemuan",
            guru: "Indi Fitriani",
            kategori: "Penampilan tidak sesuai",
            ulasan: "Penampilan guru mirip dengan tetangga saya sehingga saya merasa kurang nyaman untuk belajar secara efektif.",
            resolusi: "Ganti guru baru",
            lampiran: "Tidak ada lampiran",
        },
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
        trainerUsername: "aminah.ustadzah",
        trainerAvatar: "https://c.superprof.com/i/m/14912671/600/20250903235026/14912671.webp",
        trainerRating: 4.5,
        metode: "Online · Tilawah",
        mulaiSesi: "Minggu, 30 Maret 2026",
        payment: "Transfer Bank · Lunas",
        paymentStatus: "Lunas",
        paket: "5x Pertemuan",
        harga: 420000,
        sesiTerpakai: 1,
        totalSesi: 5,
        pembatalan: {
            pesananId: "#3003",
            paket: "5x Pertemuan",
            guru: "Ustadzah Aminah",
            kategori: "Ketidaksesuaian Jadwal",
            ulasan: "Jadwal yang ditawarkan guru tidak sesuai dengan ketersediaan waktu saya, sehingga saya mengajukan pembatalan.",
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
        badgeCls: "bg-rose-500 text-white",
    },
    pembatalan: {
        label: "Pembatalan",
        icon: XCircle,
        badgeCls: "bg-orange-500 text-white",
    },
}

const STATUS_CONFIG = {
    menunggu: { label: "Baru", cls: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300" },
    selesai: { label: "Selesai", cls: "border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400" },
}

// ─── Toast Component ───────────────────────────────────────────────────────
type ToastData = { id: number; message: string; type: "success" | "error" | "info" }

function Toast({ toasts, onRemove }: { toasts: ToastData[]; onRemove: (id: number) => void }) {
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto
                        animate-in slide-in-from-right-5 duration-300
                        ${t.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                            : t.type === "error"
                                ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                                : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                        }`}
                >
                    {t.type === "success"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : t.type === "error"
                            ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            : <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    }
                    <span>{t.message}</span>
                    <button
                        onClick={() => onRemove(t.id)}
                        className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
    })
}

function formatShortDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
    })
}

function formatCurrency(val: number) {
    return new Intl.NumberFormat("id-ID").format(val)
}

// ─── Info Row ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-gray-800/80 last:border-0">
            {icon && <div className="mt-0.5 text-gray-400 dark:text-gray-500">{icon}</div>}
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-words">{value}</p>
            </div>
        </div>
    )
}

// ─── Section Card ────────────────────────────────────────────────────────────
function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
            <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800/80">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h3>
            </div>
            <div className="px-5 py-3">
                {children}
            </div>
        </div>
    )
}

// ─── Detail Page ──────────────────────────────────────────────────────────────
function KeluhanDetailContent() {
    const router = useRouter()
    const params = useParams()
    const id = Number(params.id)

    const item = DUMMY_KELUHAN.find(k => k.id === id)

    const [adminNote, setAdminNote] = useState("")
    const [toasts, setToasts] = useState<ToastData[]>([])

    const removeToast = useCallback((toastId: number) => {
        setToasts(prev => prev.filter(t => t.id !== toastId))
    }, [])

    const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
        const toastId = Date.now()
        setToasts(prev => [...prev, { id: toastId, message, type }])
        setTimeout(() => removeToast(toastId), 3500)
    }, [removeToast])

    if (!item) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-lg font-bold text-gray-600 dark:text-gray-400 mb-2">Data tidak ditemukan</p>
                    <button
                        onClick={() => router.push("/billing/keluhan")}
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                        ← Kembali ke Keluhan
                    </button>
                </div>
            </div>
        )
    }

    const cfg = TYPE_CONFIG[item.type]
    const statusCfg = STATUS_CONFIG[item.status]
    const Icon = cfg.icon

    const handleSelesaikan = () => {
        showToast(`✓ Keluhan "${item.subject}" telah diselesaikan`, "success")
    }

    const handleTolak = () => {
        showToast(`✗ Keluhan "${item.subject}" ditolak`, "error")
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
            <Toast toasts={toasts} onRemove={removeToast} />

            <div className="max-w-[1100px] mx-auto space-y-5">

                {/* ── Back link ── */}
                <button
                    onClick={() => router.push("/billing/keluhan")}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Kembali ke Keluhan
                </button>

                {/* ── Title Row ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg px-3 py-1.5 ${cfg.badgeCls}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                        </span>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white truncate">{item.subject}</h1>
                    </div>
                    <span className={`text-xs font-bold rounded-full px-4 py-1.5 ${statusCfg.cls} flex-shrink-0`}>
                        {statusCfg.label}
                    </span>
                </div>

                {/* ── Two Column Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                    {/* ──────── LEFT COLUMN (3/5) ──────── */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* Informasi user */}
                        <SectionCard title="Informasi user">
                            <div className="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-800/80">
                                <div className="relative flex-shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.user.avatar}
                                        alt={item.user.name}
                                        className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.user.name}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">@{item.user.username} · {formatShortDate(item.date)}</p>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-0 py-2 border-b border-gray-50 dark:border-gray-800/80">
                                <div className="px-1 py-2 border-r border-gray-50 dark:border-gray-800/80">
                                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Paket</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{item.paket}</p>
                                </div>
                                <div className="px-3 py-2 border-r border-gray-50 dark:border-gray-800/80">
                                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Harga</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">Rp {formatCurrency(item.harga)}</p>
                                </div>
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sesi terpakai</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{item.sesiTerpakai} / {item.totalSesi}</p>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Alasan / Pesan */}
                        <SectionCard title={item.type === "pembatalan" ? "Alasan pembatalan" : "Detail keluhan"}>
                            {/* Message quote */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3.5 my-2 border-l-4 border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                    {item.pembatalan ? item.pembatalan.ulasan : item.pesan}
                                </p>
                            </div>

                            {/* Kategori + Resolusi (for pembatalan) */}
                            {item.pembatalan && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Kategori</p>
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.pembatalan.kategori}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Resolusi diminta</p>
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.pembatalan.resolusi}</p>
                                    </div>
                                </div>
                            )}

                            {/* Lampiran */}
                            <div className="mt-4 pb-1">
                                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Lampiran</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">{item.pembatalan?.lampiran ?? "Tidak ada lampiran"}</p>
                            </div>
                        </SectionCard>

                        {/* Keputusan admin */}
                        <SectionCard title="Keputusan admin">
                            <div className="py-2">
                                <textarea
                                    rows={3}
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                    placeholder="Tulis alasan keputusan untuk arsip internal..."
                                    className="w-full px-4 py-3 text-sm border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-none transition-all"
                                />
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleTolak}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl text-sm font-bold transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        Selesai tanpa tindakan
                                    </button>
                                    <button
                                        onClick={handleSelesaikan}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Selesaikan masalah
                                    </button>
                                </div>
                            </div>
                        </SectionCard>
                    </div>

                    {/* ──────── RIGHT COLUMN (2/5) ──────── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Guru terkait */}
                        <SectionCard title="Guru terkait">
                            <div className="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-800/80">
                                <div className="relative flex-shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.trainerAvatar}
                                        alt={item.trainer}
                                        className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.trainer}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">@{item.trainerUsername}</p>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="py-3">
                                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Rating</p>
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.trainerRating} / 5.0</span>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Informasi pesanan */}
                        <SectionCard title="Informasi pesanan">
                            <InfoRow
                                label="Metode belajar"
                                value={item.metode}
                                icon={<BookOpen className="w-4 h-4" />}
                            />
                            <InfoRow
                                label="Mulai sesi"
                                value={item.mulaiSesi}
                                icon={<Calendar className="w-4 h-4" />}
                            />
                            <InfoRow
                                label="Payment"
                                value={item.payment}
                                icon={<Wallet className="w-4 h-4" />}
                            />
                        </SectionCard>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function KeluhanDetailPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["common"]}>
                <KeluhanDetailContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
