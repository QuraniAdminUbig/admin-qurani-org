"use client"

import { use, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    ArrowLeft,
    User,
    BookOpen,
    CreditCard,
    Star,
    CheckCircle2,
    Clock,
    XCircle,
    Wifi,
    MapPin,
    Phone,
    Mail,
    Calendar,
    ChevronDown,
    MessageSquare,
    GraduationCap,
} from "lucide-react"
import Link from "next/link"
import dummyData from "@/data/billing-dummy.json"
import { getSimOrderById, type SimOrder } from "@/lib/sim-store"

// ── helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}
function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("id-ID", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
    })
}
function formatDateTime(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

// ── session status config ─────────────────────────────────────────────────────
const SESSION_STATUS = {
    completed: { label: "Selesai", icon: CheckCircle2, cls: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    ongoing: { label: "Berlangsung", icon: Clock, cls: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
    scheduled: { label: "Terjadwal", icon: Clock, cls: "text-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    cancelled: { label: "Batal", icon: XCircle, cls: "text-red-400", bg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
} as const

// ── booking status ────────────────────────────────────────────────────────────
const BOOKING_STATUS = {
    active: { label: "Aktif", dotCls: "bg-emerald-500", badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    completed: { label: "Selesai", dotCls: "bg-blue-500", badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    cancelled: { label: "Batal", dotCls: "bg-red-500", badgeCls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
} as const

const PACKAGE_CFG: Record<string, { cls: string }> = {
    "1x": { cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
    "5x": { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    "10x": { cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
}

// ── Back URL ──────────────────────────────────────────────────────────────────
const BACK_URL = "/billing/orders"

// ── Sim Order Detail View ─────────────────────────────────────────────────────
function SimOrderDetail({ order }: { order: SimOrder }) {
    const isPaid = order.paymentStatus === "paid"
    const isCancelled = order.status === "cancelled"
    const isActive = isPaid && order.completedSessions > 0
    const statusLabel = isCancelled ? "Batal" : isActive ? "Aktif" : isPaid ? "Lunas" : "Menunggu Bayar"
    const statusCls = isCancelled
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : isActive
            ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
            : isPaid
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    const statusDot = isCancelled ? "bg-red-500" : isActive ? "bg-sky-500" : isPaid ? "bg-emerald-500" : "bg-amber-500"

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1200px] mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={BACK_URL}
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-emerald-600 hover:border-emerald-400 transition-all shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Info Paket */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-3">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Informasi Pesanan
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wider mb-1">Nama Paket</p>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{order.pkg.name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wider mb-1">Metode Mengaji</p>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                            <Wifi className="w-3 h-3" /> Online
                                        </span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 italic border-l border-gray-200 dark:border-gray-700 pl-2">{order.paymentMethod}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wider mb-1">Mulai Sesi</p>
                                    <p className="font-bold text-gray-700 dark:text-gray-300">{new Date(order.bookingDate).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                    <span>Progress Sesi</span>
                                    <span>{order.completedSessions}/{order.totalSessions} Selesai</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round(order.completedSessions / order.totalSessions * 100)}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Jadwal Sesi */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                    <Calendar className="w-4 h-4 text-emerald-500" /> Jadwal Pertemuan
                                </div>
                                {isPaid && order.sessions?.length > 0 && (
                                    <span className="text-[11px] text-gray-400 font-medium">{order.sessions.length} pertemuan terjadwal</span>
                                )}
                            </div>
                            {!order.sessions?.length ? (
                                <p className="text-sm text-gray-400 text-center py-6">
                                    {isCancelled ? "Tidak ada jadwal" : "Jadwal sesi akan ditentukan setelah pembayaran dikonfirmasi"}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {order.sessions.map(sess => {
                                        const sessDate = new Date(sess.date)
                                        const dateStr = sessDate.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                                        const isSched = sess.status === "scheduled"
                                        const isDone = sess.status === "completed"
                                        return (
                                            <div key={sess.sessionNo} className={`flex items-center gap-4 px-4 py-3 rounded-xl border bg-gray-50/60 dark:bg-gray-800/20 ${isCancelled ? "border-rose-100 dark:border-rose-900/30" : "border-gray-100 dark:border-gray-800"}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${isCancelled
                                                        ? "bg-rose-100 dark:bg-rose-900/30 text-rose-500"
                                                        : isDone ? "bg-emerald-500 text-white" : isSched ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                    }`}>
                                                    {sess.sessionNo}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Pertemuan {sess.sessionNo}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{sess.startTime} – {sess.endTime}</p>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${isCancelled
                                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                                            : isDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : isSched ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" : "bg-gray-100 text-gray-500"
                                                        }`}>
                                                        {isCancelled ? "Dibatalkan" : isDone ? "Selesai" : isSched ? "Terjadwal" : "Batal"}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ── Detail Pembatalan (hanya jika cancelled) ── */}
                        {isCancelled && (
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-rose-200 dark:border-rose-800/50 p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider border-b border-rose-100 dark:border-rose-900/30 pb-3 mb-4">
                                    <XCircle className="w-4 h-4" /> Detail Pembatalan
                                </div>
                                <div className="space-y-3 text-xs">
                                    {/* Kategori */}
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">Kategori</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">Metode Mengajar Tidak Cocok</span>
                                    </div>
                                    {/* Pesan */}
                                    <div className="space-y-1">
                                        <p className="text-gray-400 font-semibold uppercase tracking-wider">Pesan / Ulasan</p>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-rose-50/60 dark:bg-rose-900/10 rounded-lg px-3 py-2 border border-rose-100 dark:border-rose-900/30 italic">
                                            &ldquo;Materi yang diajarkan tidak sesuai dengan ekspektasi. Guru kurang komunikatif dalam menjelaskan tajwid untuk pemula.&rdquo;
                                        </p>
                                    </div>
                                    {/* Resolusi */}
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">Resolusi Diminta</span>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                            🔄 Ganti Guru Baru
                                        </span>
                                    </div>
                                    {/* Lampiran */}
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="text-gray-400 font-semibold uppercase tracking-wider">Lampiran</span>
                                        <span className="text-gray-400 italic">Tidak ada lampiran</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pembayaran */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                                <CreditCard className="w-4 h-4 text-emerald-500" /> Informasi Pembayaran
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">#Invoice</p><p className="font-bold text-gray-900 dark:text-white">{order.invoiceNo}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Metode</p><p className="font-bold text-gray-900 dark:text-white">{order.paymentGateway || "—"}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isCancelled
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            : isActive
                                                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                                : isPaid
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        }`}>
                                        {isCancelled ? "❌ Batal" : isActive ? "🟢 Aktif" : isPaid ? "✅ Lunas" : "⏳ Pending"}
                                    </span>
                                </div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Harga Paket</p><p className="font-bold text-gray-900 dark:text-white">{formatRupiah(order.pkg.price)}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Pajak (12%)</p><p className="font-bold text-gray-900 dark:text-white">{formatRupiah(Math.round(order.pkg.price * 0.12))}</p></div>
                                <div><p className="text-gray-400 uppercase tracking-wider mb-1">Biaya Layanan</p><p className={`font-bold ${order.pkg.serviceFee === 0 ? "text-emerald-600" : "text-gray-900 dark:text-white"}`}>{order.pkg.serviceFee === 0 ? "Gratis" : formatRupiah(order.pkg.serviceFee)}</p></div>
                                <div className="col-span-2 md:col-span-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center"><p className="text-xs font-black text-gray-950 dark:text-white uppercase">Total Bayar</p><p className="font-black text-emerald-600 text-base">{formatRupiah(order.pkg.price + Math.round(order.pkg.price * 0.12) + order.pkg.serviceFee)}</p></div>
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-4">
                        {/* Member */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(order.member.name)}&background=10b981&color=fff`} alt={order.member.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base">{order.member.name}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Mail className="w-3.5 h-3.5 text-emerald-500" />{order.member.email}</div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Phone className="w-3.5 h-3.5 text-emerald-500" />{order.member.phone}</div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{order.member.location}</div>
                            </div>
                        </div>

                        {/* Guru */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">

                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0">
                                    <img src={order.trainer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.trainer.name)}&background=10b981&color=fff`} alt={order.trainer.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base">{order.trainer.name}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold">@{order.trainer.email.split("@")[0]}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded text-amber-600 font-bold text-[10px]">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{order.trainer.rating}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400">{order.trainer.totalStudents} Murid</span>
                                </div>
                                {(order.trainer as any).location && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>{(order.trainer as any).location}</span>
                                    </div>
                                )}
                                {(order.trainer as any).yearsExperience && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>{(order.trainer as any).yearsExperience} Tahun Pengalaman</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-400 font-bold">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />{order.trainer.specialization}
                                </div>
                                {(order.trainer as any).subjects?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                        {(order.trainer as any).subjects.map((s: string) => (
                                            <span key={s} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BookingDetailContent({ id }: { id: number }) {
    const [simOrder, setSimOrder] = useState<SimOrder | null | undefined>(undefined)
    // ⚠️ Must be declared BEFORE any early return (Rules of Hooks)
    const [openFeedback, setOpenFeedback] = useState<Record<number, boolean>>({})
    const toggleFeedback = (no: number) => setOpenFeedback(prev => ({ ...prev, [no]: !prev[no] }))

    useEffect(() => {
        if (id >= 9001) {
            setSimOrder(getSimOrderById(id))
        } else {
            setSimOrder(null)
        }
    }, [id])

    if (simOrder === undefined) return null
    if (simOrder !== null) return <SimOrderDetail order={simOrder} />

    const booking = dummyData.bookings.find(b => b.id === id)
    const detail = dummyData.bookingDetails.find(d => d.bookingId === id)

    if (!booking || !detail) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex flex-col items-center justify-center gap-4">
                <div className="text-6xl">🔍</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pesan tidak ditemukan</h2>
                <p className="text-gray-500 text-sm">ID #{id} tidak ada dalam data.</p>
                <Link href={BACK_URL}
                    className="text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Pesanan
                </Link>
            </div>
        )
    }

    const bStatus = BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS]
    const isBookingCancelled = booking.status === "cancelled"
    const isBookingActive = !isBookingCancelled && booking.status === "active" && booking.completedSessions > 0
    const paidStr = isBookingCancelled ? "Dibatalkan"
        : detail.payment.status === "paid"
            ? (isBookingActive ? "Aktif" : "Lunas")
            : "Belum Dibayar"
    const paidCls = isBookingCancelled
        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
        : detail.payment.status === "paid"
            ? (isBookingActive
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400")
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    const sessCompleted = detail.sessions.filter(s => s.status === "completed").length
    const pct = Math.round((sessCompleted / booking.totalSessions) * 100)
    const isPaid = detail.payment.status === "paid"



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1200px] mx-auto space-y-4">

                {/* ── Back ── */}
                <div className="flex items-center gap-3">
                    <Link href={BACK_URL}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-emerald-600 hover:border-emerald-400 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-10">

                    {/* ── LEFT column ── */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Booking Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Informasi Pesanan
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Nama Paket</p>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{booking.packageName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Metode Belajar</p>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${booking.mode === "online" ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                                            {booking.mode === "online" ? <Wifi className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                            {booking.mode === "online" ? "Online" : "Offline"}
                                        </span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 italic border-l border-gray-200 dark:border-gray-700 pl-2">{booking.paymentMethod}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Mulai Sesi</p>
                                    <p className="text-sm font-bold text-gray-950 dark:text-gray-200">{formatDate(booking.bookingDate)}</p>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1.5">
                                    <p className="text-[11px] font-bold text-gray-950 dark:text-gray-300">Progress Sesi</p>
                                    <p className="text-[11px] font-bold text-emerald-600">{sessCompleted} / {booking.totalSessions} Selesai</p>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Session List */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 px-5 py-4 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-emerald-500" /> Jadwal Pertemuan
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 normal-case tracking-normal">
                                    {detail.sessions.length} pertemuan terjadwal
                                </span>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {detail.sessions.map(s => {
                                    const sc = SESSION_STATUS[s.status as keyof typeof SESSION_STATUS]
                                    const Icon = sc?.icon ?? Clock
                                    const isDone = s.status === "completed"
                                    const fb = (s as unknown as { feedback?: { rating: number; pesan: string } }).feedback
                                    const isOpen = openFeedback[s.no]
                                    return (
                                        <div key={s.no}>
                                            {/* ── Row sesi ── */}
                                            <div
                                                className={`flex items-center gap-4 px-5 py-3 transition-colors ${isDone && isPaid ? "cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/40"}`}
                                                onClick={() => isDone && isPaid && toggleFeedback(s.no)}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30" : s.status === "cancelled" ? "bg-red-100 dark:bg-red-900/30" : "bg-sky-100 dark:bg-sky-900/30"}`}>
                                                    <Icon className={`w-4 h-4 ${sc?.cls}`} />
                                                </div>
                                                {/* date di kiri bawah nama */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold text-gray-950 dark:text-white">Pertemuan {s.no}</span>
                                                        <span className={`text-[9px] rounded-full px-2 py-0.5 font-bold uppercase ${booking.status === "cancelled"
                                                                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                                                                : sc?.bg
                                                            }`}>
                                                            {booking.status === "cancelled" ? "Dibatalkan" : sc?.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{s.date}</p>
                                                </div>
                                                <div className="text-right shrink-0 flex items-center gap-3">
                                                    <p className="text-xs font-bold text-gray-950 dark:text-gray-300">{s.time}</p>
                                                    {isDone && isPaid && (
                                                        <ChevronDown className={`w-4 h-4 text-emerald-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* ── Feedback Accordion ── */}
                                            {isDone && isPaid && isOpen && fb && (
                                                <div className="px-5 pb-4 pt-3 bg-emerald-50/50 dark:bg-emerald-900/10 border-t border-emerald-100 dark:border-emerald-900/30">
                                                    <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                        <MessageSquare className="w-3 h-3" /> Feedback Member
                                                    </p>
                                                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-emerald-100 dark:border-emerald-900/40 p-3 space-y-2">
                                                        {/* Bintang rating */}
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star
                                                                    key={star}
                                                                    className={`w-4 h-4 ${star <= fb.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700"}`}
                                                                />
                                                            ))}
                                                            <span className="ml-1.5 text-[10px] font-bold text-amber-500">{fb.rating}/5</span>
                                                        </div>
                                                        {/* Pesan */}
                                                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{fb.pesan}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ── Cancellation Card (below jadwal, for cancelled bookings) ── */}
                        {isBookingCancelled && (detail as any).cancellationInfo && (
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-rose-200 dark:border-rose-800/50 p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider border-b border-rose-100 dark:border-rose-900/30 pb-3 mb-4">
                                    <XCircle className="w-4 h-4" /> Detail Pembatalan
                                </div>
                                <div className="space-y-3 text-xs">
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">Kategori</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">{(detail as any).cancellationInfo.kategori}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-gray-400 font-semibold uppercase tracking-wider">Pesan / Ulasan</p>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-rose-50/60 dark:bg-rose-900/10 rounded-lg px-3 py-2 border border-rose-100 dark:border-rose-900/30 italic">
                                            &ldquo;{(detail as any).cancellationInfo.ulasan}&rdquo;
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">Resolusi Diminta</span>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                            🔄 {(detail as any).cancellationInfo.resolusi}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="text-gray-400 font-semibold uppercase tracking-wider">Lampiran</span>
                                        <span className="text-gray-400 italic">{(detail as any).cancellationInfo.lampiran ?? "Tidak ada lampiran"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payment Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <CreditCard className="w-4 h-4 text-emerald-500" /> Informasi Pembayaran
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter"># Invoice</span>
                                        <span className="font-mono font-bold text-gray-950 dark:text-gray-300">{detail.payment.invoiceNo}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Ref. Gateway</span>
                                        <span className="font-mono text-gray-600 dark:text-gray-400 text-right truncate max-w-[150px]">{detail.payment.receiptRef}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Payment</span>
                                        <span className="font-bold text-gray-950 dark:text-gray-300">{detail.payment.method}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Status</span>
                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${paidCls}`}>{paidStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Waktu Bayar</span>
                                        <span className="text-gray-600 font-bold dark:text-gray-300 text-right">{formatDateTime(detail.payment.paidAt)}</span>
                                    </div>
                                </div>
                                <div className="border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-3 md:pt-0 md:pl-6 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Harga Paket</span>
                                        <span className="font-bold text-gray-950 dark:text-white">{formatRupiah(detail.payment.pricePackage)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Pajak (12%)</span>
                                        <span className="font-bold text-gray-950 dark:text-white">{formatRupiah((detail.payment as { tax?: number }).tax ?? Math.round(detail.payment.pricePackage * 0.12))}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Biaya Layanan</span>
                                        <span className={`font-bold ${detail.payment.serviceFee === 0 ? "text-emerald-600" : "text-gray-950 dark:text-white"}`}>
                                            {detail.payment.serviceFee === 0 ? "Gratis" : formatRupiah(detail.payment.serviceFee)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-gray-950 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="uppercase">Total Bayar</span>
                                        <span className="text-emerald-600">{formatRupiah(detail.payment.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT column ── */}
                    <div className="space-y-4">
                        {/* Member Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">

                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full border-2 border-emerald-100 p-0.5 flex-shrink-0">
                                    <div className="w-full h-full rounded-full overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(detail.member.name)}&background=10b981&color=fff`} alt={detail.member.name} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base leading-tight">{detail.member.name}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold">@{detail.member.email.split("@")[0]}</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400"><Mail className="w-3.5 h-3.5 text-emerald-500" />{detail.member.email}</div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400"><Phone className="w-3.5 h-3.5 text-emerald-500" />{detail.member.phone}</div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{detail.member.location}</div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                    Bergabung {new Date(detail.member.joinDate).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                                </div>
                            </div>
                        </div>

                        {/* Guru Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">

                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-100 shadow-sm flex-shrink-0">
                                    <img
                                        src={(detail.trainer as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.trainer.name)}&background=10b981&color=fff`}
                                        alt={detail.trainer.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base leading-tight">{detail.trainer.name}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">@{detail.trainer.email.split("@")[0]}</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded text-amber-600 font-bold text-[10px]">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{detail.trainer.rating}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-tight">{detail.trainer.totalStudents} Murid</span>
                                </div>
                                {(detail.trainer as any).location && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>{(detail.trainer as any).location}</span>
                                    </div>
                                )}
                                {(detail.trainer as any).yearsExperience && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>{(detail.trainer as any).yearsExperience} Tahun Pengalaman</span>
                                    </div>
                                )}
                                <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-400 font-bold">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{detail.trainer.specialization}</span>
                                </div>
                                {(detail.trainer as any).subjects?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                        {(detail.trainer as any).subjects.map((s: string) => (
                                            <span key={s} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function PesananDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const numId = Number(id)

    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <BookingDetailContent id={numId} />
            </I18nProvider>
        </DashboardLayout>
    )
}
