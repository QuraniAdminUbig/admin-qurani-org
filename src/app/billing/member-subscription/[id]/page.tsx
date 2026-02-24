"use client"

import { use } from "react"
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
    Hash,
    Receipt,
} from "lucide-react"
import Link from "next/link"
import dummyData from "@/data/billing-dummy.json"

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
    scheduled: { label: "Terjadwal", icon: Clock, cls: "text-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    cancelled: { label: "Batal", icon: XCircle, cls: "text-red-400", bg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
} as const

// ── booking status ────────────────────────────────────────────────────────────
const BOOKING_STATUS = {
    active: { label: "Aktif", dotCls: "bg-emerald-500", badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    completed: { label: "Selesai", dotCls: "bg-blue-500", badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    cancelled: { label: "Batal", dotCls: "bg-red-500", badgeCls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
} as const

// ── package badge ─────────────────────────────────────────────────────────────
const PACKAGE_CFG: Record<string, { cls: string }> = {
    "1x": { cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
    "5x": { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    "10x": { cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
}

function BookingDetailContent({ id }: { id: number }) {
    const booking = dummyData.bookings.find(b => b.id === id)
    const detail = dummyData.bookingDetails.find(d => d.bookingId === id)

    if (!booking || !detail) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex flex-col items-center justify-center gap-4">
                <div className="text-6xl">🔍</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pesan tidak ditemukan</h2>
                <p className="text-gray-500 text-sm">ID #{id} tidak ada dalam data.</p>
                <Link href="/billing/member-subscription"
                    className="text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
                </Link>
            </div>
        )
    }

    const bStatus = BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS]
    const pkgCfg = PACKAGE_CFG[booking.packageKey] ?? { cls: "bg-gray-100 text-gray-600" }
    const paidStr = detail.payment.status === "paid" ? "Lunas" : "Belum Dibayar"
    const paidCls = detail.payment.status === "paid"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    const sessCompleted = detail.sessions.filter(s => s.status === "completed").length
    const pct = Math.round((sessCompleted / booking.totalSessions) * 100)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1200px] mx-auto space-y-4">

                {/* ── Back + Header ── */}
                <div className="flex items-center gap-3">
                    <Link href="/billing/member-subscription"
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Detail Pesan
                            </h1>
                            <span className="text-gray-400 font-mono text-sm">#{booking.id}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${bStatus?.badgeCls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${bStatus?.dotCls}`} />
                                {bStatus?.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-10">

                    {/* ── LEFT column (Main Info & Schedule) ── */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Booking Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Informasi Paket
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Nama Paket</p>
                                    <p className="text-sm font-bold text-gray-950 dark:text-white">{booking.packageName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Metode Belajar</p>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${booking.mode === "online"
                                            ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                            : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                            }`}>
                                            {booking.mode === "online" ? <Wifi className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                            {booking.mode === "online" ? "Online" : "Offline"}
                                        </span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 italic border-l border-gray-200 dark:border-gray-700 pl-2">
                                            {booking.paymentMethod}
                                        </span>
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
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Session List with Scrollbar */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 px-5 py-4 uppercase tracking-wider">
                                <Calendar className="w-4 h-4 text-emerald-500" /> Jadwal Sesi
                            </div>
                            <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800 custom-scrollbar">
                                {detail.sessions.map(s => {
                                    const sc = SESSION_STATUS[s.status as keyof typeof SESSION_STATUS]
                                    const Icon = sc?.icon ?? Clock
                                    return (
                                        <div key={s.no} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30"
                                                : s.status === "cancelled" ? "bg-red-100 dark:bg-red-900/30"
                                                    : "bg-sky-100 dark:bg-sky-900/30"
                                                }`}>
                                                <Icon className={`w-4 h-4 ${sc?.cls}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-gray-950 dark:text-white">
                                                        Pertemuan {s.no}
                                                    </span>
                                                    <span className={`text-[9px] rounded-full px-2 py-0.5 font-bold uppercase ${sc?.bg}`}>
                                                        {sc?.label}
                                                    </span>
                                                </div>
                                                {s.notes && (
                                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{s.notes}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-bold text-gray-950 dark:text-gray-300">{s.date}</p>
                                                <p className="text-[10px] text-gray-400">{s.time}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Payment Info - MOVED HERE */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <CreditCard className="w-4 h-4 text-emerald-500" /> Informasi Pembayaran
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-tighter"># Invoice</span>
                                        <span className="font-mono font-bold text-gray-950 dark:text-gray-300">{detail.payment.invoiceNo}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-tighter">Ref. Gateway</span>
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
                                        <span className="font-bold text-gray-950">{formatRupiah(detail.payment.pricePackage)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Biaya Layanan</span>
                                        <span className="font-bold text-gray-950">{formatRupiah(detail.payment.serviceFee)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-gray-950 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="uppercase">Total Bayar</span>
                                        <span className="text-emerald-600 active-shadow">{formatRupiah(detail.payment.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── RIGHT column (Member & Guru) ── */}
                    <div className="space-y-4">

                        {/* Member Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <User className="w-4 h-4 text-emerald-500" /> Informasi Member
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full border-2 border-emerald-100 p-0.5">
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
                                        {/* Fallback to initials if no photo */}
                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(detail.member.name)}&background=10b981&color=fff`} alt={detail.member.name} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base leading-tight">{detail.member.name}</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <Mail className="w-3.5 h-3.5 text-emerald-500" /> {detail.member.email}
                                </div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> {detail.member.phone}
                                </div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {detail.member.location}
                                </div>
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                    Bergabung {new Date(detail.member.joinDate).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                                </div>
                            </div>
                        </div>

                        {/* Trainer (Guru) Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 uppercase tracking-wider">
                                <BookOpen className="w-4 h-4 text-emerald-500" /> Guru
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-50 shadow-sm">
                                    <img
                                        src={(detail.trainer as any).avatar || (detail.trainer.id % 2 === 0
                                            ? `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop`
                                            : `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop`)}
                                        alt={detail.trainer.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-black text-gray-950 dark:text-white text-base leading-tight mb-1">{detail.trainer.name}</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded text-amber-600 font-bold text-[10px]">
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            {detail.trainer.rating}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 tracking-tight">{detail.trainer.totalStudents} Murid</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-400 font-medium">
                                    <Mail className="w-3.5 h-3.5 text-emerald-500" /> {detail.trainer.email}
                                </div>
                                <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-400 font-bold">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{detail.trainer.specialization}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

// Next.js dynamic route page
export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
