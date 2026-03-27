"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ShoppingBag, Zap, CheckCircle2, X,
    TrendingUp, MoreHorizontal, ChevronLeft,
    ChevronRight, Trash2,
    ChevronDown, Check, Timer, BarChart2, History, Calendar,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import {
    getSimOrders, addSimNotif,
    nextSimId, saveSimOrder, updateSimOrderPayment,
    type SimOrder,
} from "@/lib/sim-store"
import { SimToast, SimNotifBell } from "@/components/sim-notif"

// ─── Types ────────────────────────────────────────────────────────────────────
type PipelineStatus = "baru" | "lunas" | "aktif" | "gagal"

// ─── Filter Range Tanggal ─────────────────────────────────────────────────────────
type FilterKey =
    | "all"
    | "today" | "yesterday"
    | "this_week" | "this_month" | "this_year" | "last_year"
    | "last_week" | "last_month"
    | "last_7_days" | "last_30_days"

const FILTER_OPTIONS: { key: FilterKey; label: string; group: string }[] = [
    { key: "all",        label: "All (Semua)",  group: "Quick" },
    { key: "today",      label: "Today",        group: "Quick" },
    { key: "yesterday",  label: "Yesterday",    group: "Quick" },
    { key: "this_week",  label: "This week",    group: "Period" },
    { key: "this_month", label: "This month",   group: "Period" },
    { key: "this_year",  label: "This year",    group: "Period" },
    { key: "last_week",  label: "Last week",    group: "Historical" },
    { key: "last_month", label: "Last month",   group: "Historical" },
    { key: "last_year",  label: "Last year",    group: "Historical" },
    { key: "last_7_days",  label: "Last 7 days",  group: "Historical" },
    { key: "last_30_days", label: "Last 30 days", group: "Historical" },
]
const GROUP_ICONS: Record<string, React.ReactNode> = {
    Quick:      <Timer    className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
    Period:     <BarChart2 className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
    Historical: <History  className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
}

function getDateRange(filter: FilterKey): { from: Date; to: Date } | null {
    if (filter === "all") return null
    const now = new Date()
    const sod = (d: Date) => { d.setHours(0, 0, 0, 0); return d }
    const eod = (d: Date) => { d.setHours(23, 59, 59, 999); return d }
    switch (filter) {
        case "today":      return { from: sod(new Date(now)), to: eod(new Date(now)) }
        case "yesterday":  { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: sod(y), to: eod(new Date(y)) } }
        case "this_week":  { const d = now.getDay(); const m = new Date(now); m.setDate(now.getDate() - (d === 0 ? 6 : d - 1)); return { from: sod(m), to: eod(new Date(now)) } }
        case "this_month": return { from: sod(new Date(now.getFullYear(), now.getMonth(), 1)), to: eod(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
        case "this_year":  return { from: sod(new Date(now.getFullYear(), 0, 1)), to: eod(new Date(now.getFullYear(), 11, 31)) }
        case "last_week":  { const d = now.getDay(); const end = new Date(now); end.setDate(now.getDate() - (d === 0 ? 7 : d)); const start = new Date(end); start.setDate(end.getDate() - 6); return { from: sod(start), to: eod(end) } }
        case "last_month": return { from: sod(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: eod(new Date(now.getFullYear(), now.getMonth(), 0)) }
        case "last_year":  return { from: sod(new Date(now.getFullYear() - 1, 0, 1)), to: eod(new Date(now.getFullYear() - 1, 11, 31)) }
        case "last_7_days":  { const f = new Date(now); f.setDate(now.getDate() - 6);  return { from: sod(f), to: eod(new Date(now)) } }
        case "last_30_days": { const f = new Date(now); f.setDate(now.getDate() - 29); return { from: sod(f), to: eod(new Date(now)) } }
    }
}

function FilterDropdown({ value, onChange }: { value: FilterKey; onChange: (k: FilterKey) => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const displayDate = useMemo(() => {
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, "0")
        const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
        switch (value) {
            case "all":        return "Semua Data"
            case "today":      return fmt(now)
            case "yesterday":  { const y = new Date(now); y.setDate(y.getDate() - 1); return fmt(y) }
            case "this_week":  { const d = now.getDay(); const m = new Date(now); m.setDate(now.getDate() - (d === 0 ? 6 : d - 1)); const s = new Date(m); s.setDate(m.getDate() + 6); return `${pad(m.getDate())} – ${pad(s.getDate())} ${now.toLocaleDateString("en-US", { month: "short", year: "numeric" })}` }
            case "this_month": return now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
            case "this_year":  return `Year ${now.getFullYear()}`
            case "last_week":  { const d = now.getDay(); const end = new Date(now); end.setDate(now.getDate() - (d === 0 ? 7 : d)); const start = new Date(end); start.setDate(end.getDate() - 6); return `${fmt(start)} – ${fmt(end)}` }
            case "last_month": { const m = new Date(now.getFullYear(), now.getMonth() - 1, 1); return m.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
            case "last_year":  return `Year ${now.getFullYear() - 1}`
            case "last_7_days":  { const f = new Date(now); f.setDate(now.getDate() - 6); return `${fmt(f)} – ${pad(now.getDate())}` }
            case "last_30_days": { const f = new Date(now); f.setDate(now.getDate() - 29); return `${f.toLocaleDateString("en-US", { month: "short", day: "2-digit" })} – ${fmt(now)}` }
        }
    }, [value])
    useEffect(() => {
        function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener("mousedown", h)
        return () => document.removeEventListener("mousedown", h)
    }, [])
    const groups = ["Quick", "Period", "Historical"]
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-500 transition-all shadow-sm"
            >
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-left font-medium text-xs">{displayDate}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1.5">
                    {groups.map((group, gi) => {
                        const items = FILTER_OPTIONS.filter(o => o.group === group)
                        return (
                            <div key={group}>
                                {gi > 0 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3 my-1" />}
                                <div className="px-2">
                                    {items.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => { onChange(opt.key); setOpen(false) }}
                                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${value === opt.key
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                                }`}
                                        >
                                            {opt.label}
                                            {value === opt.key && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

type PipelineOrder = {
    id: string | number
    member: string
    username: string
    memberAvatar: string
    guru: string
    guruUsername: string
    paket: string
    sesi: number
    sesiSelesai: number
    harga: number
    tglPesan: string
    rawDate: Date
    payment: string
    status: PipelineStatus
    isPendingPayment?: boolean
    isSim?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
}

function toUsername(email: string, name: string) {
    if (email && email.includes("@")) return email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()
    return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function initials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

// ─── Mapping booking status → pipeline stage ───────────────────────────────
function getStage(b: typeof dummyData.bookings[0]): PipelineStatus {
    if (b.status === "cancelled") return "gagal"
    if (b.status === "active" && b.completedSessions > 0) return "aktif"
    if (b.status === "completed" || b.status === "active") return "lunas"
    return "baru"
}

// ─── Convert JSON bookings → PipelineOrder ──────────────────────────────────
const AVATAR_COLORS = ["bg-emerald-500", "bg-violet-500", "bg-sky-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-orange-500"]

function bookingToPipeline(b: typeof dummyData.bookings[0]): PipelineOrder {
    const detail = dummyData.bookingDetails.find(d => d.bookingId === b.id)
    const isPendingPayment = detail ? detail.payment.status === "pending" : false
    return {
        id: b.id,
        member: b.userName,
        username: toUsername(b.userEmail, b.userName),
        memberAvatar: initials(b.userName),
        guru: b.trainerName,
        guruUsername: `@${toUsername("", b.trainerName)}`, // Dummy username for static data
        paket: b.packageName,
        sesi: b.totalSessions,
        sesiSelesai: b.completedSessions,
        harga: b.totalPayment,
        tglPesan: new Date(b.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: b.paymentGateway,
        rawDate: new Date(b.bookingDate),
        status: getStage(b),
        isPendingPayment,
    }
}

function simOrderToPipeline(o: SimOrder): PipelineOrder {
    let status: PipelineStatus = "baru"
    if (o.status === "cancelled") status = "gagal"
    else if (o.paymentStatus === "paid" && o.completedSessions > 0) status = "aktif"
    else if (o.paymentStatus === "paid") status = "lunas"
    return {
        id: o.id,
        member: o.member.name,
        username: toUsername(o.member.email, o.member.name),
        memberAvatar: initials(o.member.name),
        guru: o.trainer.name,
        guruUsername: `@${toUsername(o.trainer.email, o.trainer.name)}`,
        paket: o.pkg.name,
        sesi: o.totalSessions,
        sesiSelesai: o.completedSessions,
        harga: o.pkg.price + o.pkg.serviceFee,
        tglPesan: new Date(o.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: o.paymentGateway || "—",
        rawDate: new Date(o.bookingDate),
        status,
        isPendingPayment: o.paymentStatus === "pending",
        isSim: true,
    }
}

// ─── Table Config ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 7

const STATUS_CONFIG: Record<PipelineStatus, { label: string; dotCls: string; badgeCls: string }> = {
    baru:  { label: "Menunggu Bayar", dotCls: "bg-amber-500",  badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas: { label: "Lunas",          dotCls: "bg-emerald-500", badgeCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    aktif: { label: "Aktif",          dotCls: "bg-sky-500",     badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal: { label: "Batal",          dotCls: "bg-rose-500",    badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
}

// ─── Simulasi Modal ────────────────────────────────────────────────────────────
const SIM_MEMBERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((m: any) => m.id === d.member.id)) acc.push(d.member)
    return acc
}, [] as any[])

const SIM_TRAINERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((t: any) => t.id === d.trainer.id)) acc.push(d.trainer)
    return acc
}, [] as any[])

function SimModal({ onClose, onOrderCreated }: { onClose: () => void; onOrderCreated: () => void }) {
    const [step, setStep] = useState(1)
    const [selMember, setSelMember] = useState<any>(null)
    const [selTrainer, setSelTrainer] = useState<any>(null)
    const [selPkg, setSelPkg] = useState<any>(null)
    const [selGateway, setSelGateway] = useState("")
    const [pendingOrderId, setPendingOrderId] = useState<number | null>(null)
    const [done, setDone] = useState(false)

    const trainerPackages = useMemo(() => {
        if (!selTrainer) return []
        return dummyData.trainerPackages.filter((p: any) => p.trainerId === selTrainer.id)
    }, [selTrainer])

    function handleOrder() {
        if (!selMember || !selTrainer || !selPkg) return
        const id = nextSimId()
        const order: SimOrder = {
            id,
            member: { id: selMember.id, name: selMember.name, email: selMember.email, phone: selMember.phone || "", location: selMember.location || "", joinDate: selMember.joinDate || "" },
            trainer: { id: selTrainer.id, name: selTrainer.name, email: selTrainer.email || "", avatar: selTrainer.avatar || "", rating: selTrainer.rating, totalStudents: selTrainer.totalStudents, specialization: selTrainer.specialization },
            pkg: { key: `${selPkg.sessions}x` as "1x" | "5x" | "10x", name: selPkg.name, sessions: selPkg.sessions, price: selPkg.basePrice, serviceFee: selPkg.serviceFee },
            mode: "online",
            paymentGateway: "",
            paymentMethod: "Ummi",
            status: "pending",
            paymentStatus: "pending",
            bookingDate: new Date().toISOString(),
            paidAt: null,
            invoiceNo: `INV-SIM-${id}`,
            completedSessions: 0,
            totalSessions: selPkg.sessions,
            sessions: [],
        }
        saveSimOrder(order)
        setPendingOrderId(id)
        addSimNotif({
            type: "new_order",
            message: "Pesanan Baru — Menunggu Bayar",
            subMessage: `${selMember.name} • ${selPkg.name} • ${selTrainer.name}`,
            isRead: false,
            orderId: id,
        })
        onOrderCreated()
        setStep(4)
    }

    function handlePay() {
        if (!pendingOrderId || !selGateway) return
        updateSimOrderPayment(pendingOrderId, selGateway)
        addSimNotif({
            type: "payment_success",
            message: "Pembayaran Berhasil ✅",
            subMessage: `${selMember?.name} • ${selGateway} • ${formatRupiah((selPkg?.basePrice || 0) + (selPkg?.serviceFee || 0))}`,
            isRead: false,
            orderId: pendingOrderId,
        })
        onOrderCreated()
        setDone(true)
    }

    const stepLabel = ["", "Pilih Member", "Pilih Guru", "Pilih Paket", "Pembayaran"]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Simulasi Pesanan Baru</p>
                    </div>
                    <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Step indicator */}
                {!done && (
                    <div className="flex items-center px-5 pt-4 gap-1">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className="flex items-center gap-1 flex-1">
                                <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${s < step ? "bg-emerald-500 text-white" : s === step ? "bg-emerald-600 text-white ring-2 ring-emerald-200" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                    {s < step ? "✓" : s}
                                </div>
                                <p className={`text-[10px] font-medium truncate ${s === step ? "text-emerald-600" : "text-gray-400"}`}>{stepLabel[s]}</p>
                                {s < 4 && <div className={`flex-1 h-px mx-1 ${s < step ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Body */}
                <div className="p-5 space-y-3 min-h-[240px]">
                    {done ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">Pembayaran Berhasil!</p>
                            <p className="text-sm text-gray-500">Pesanan #{pendingOrderId} sudah masuk</p>
                            <button onClick={onClose} className="mt-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">Tutup</button>
                        </div>
                    ) : step === 1 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih member yang memesan:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_MEMBERS.map((m: any) => (
                                    <button key={m.id} onClick={() => setSelMember(m)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selMember?.id === m.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{m.name.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</p>
                                            <p className="text-[11px] text-gray-400">{m.email}</p>
                                        </div>
                                        {selMember?.id === m.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : step === 2 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih guru:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_TRAINERS.map((t: any) => (
                                    <button key={t.id} onClick={() => { setSelTrainer(t); setSelPkg(null) }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selTrainer?.id === t.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        <img src={t.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=10b981&color=fff`} alt={t.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                                            <p className="text-[11px] text-gray-400">⭐ {t.rating} · {t.totalStudents} murid</p>
                                        </div>
                                        {selTrainer?.id === t.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : step === 3 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih paket dari {selTrainer?.name}:</p>
                            {trainerPackages.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">Tidak ada paket tersedia</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {trainerPackages.map((p: any) => (
                                        <button key={p.id} onClick={() => setSelPkg(p)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${selPkg?.id === p.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                                <p className="text-[11px] text-gray-400">{p.sessions}x sesi · {p.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-emerald-600">{formatRupiah(p.totalPrice)}</p>
                                                {selPkg?.id === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto mt-1" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selPkg && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-xs space-y-1 border border-gray-200 dark:border-gray-700">
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Ringkasan:</p>
                                    <div className="flex justify-between"><span className="text-gray-500">Member</span><span className="font-semibold text-gray-900 dark:text-white">{selMember?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Guru</span><span className="font-semibold text-gray-900 dark:text-white">{selTrainer?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Paket</span><span className="font-semibold text-gray-900 dark:text-white">{selPkg?.name}</span></div>
                                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Total</span>
                                        <span className="font-bold text-emerald-600">{formatRupiah(selPkg.totalPrice)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih metode pembayaran:</p>
                            <div className="space-y-1.5">
                                {["GoPay", "QRIS", "OVO"].map(g => (
                                    <button key={g} onClick={() => setSelGateway(g)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${selGateway === g ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        {g}
                                        {selGateway === g && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                ⚠️ Pesanan #{pendingOrderId} sudah masuk. Pilih metode untuk konfirmasi.
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!done && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => step > 1 && step < 4 ? setStep(s => s - 1) : onClose()} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                            {step === 1 ? "Batal" : step < 4 ? "← Kembali" : ""}
                        </button>
                        {step === 3 ? (
                            <button onClick={handleOrder} disabled={!selPkg} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Pesan Sekarang <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : step === 4 ? (
                            <button onClick={handlePay} disabled={!selGateway} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Konfirmasi Bayar <CheckCircle2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={() => setStep(s => s + 1)} disabled={(step === 1 && !selMember) || (step === 2 && !selTrainer)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Lanjut <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}



// ─── Main Content ──────────────────────────────────────────────────────────────
function PesananContent() {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [dateFilter, setDateFilter] = useState<FilterKey>("this_year")
    const [statusTab, setStatusTab] = useState<"all" | PipelineStatus>("all")
    const [simOrders, setSimOrders] = useState<SimOrder[]>([])
    const [showSim, setShowSim] = useState(false)
    const [statusOverrides, setStatusOverrides] = useState<Record<string | number, PipelineStatus>>({})
    const [page, setPage] = useState(1)

    const refreshSim = useCallback(() => setSimOrders(getSimOrders()), [])

    useEffect(() => {
        refreshSim()
        window.addEventListener("sim-notif-update", refreshSim)
        return () => window.removeEventListener("sim-notif-update", refreshSim)
    }, [refreshSim])

    function handleAdvance(id: string | number, next: PipelineStatus) {
        const allOrders = [...simOrders.map(simOrderToPipeline), ...dummyData.bookings.map(bookingToPipeline)]
        const order = allOrders.find(o => String(o.id) === String(id))
        if (!order) return

        const prev = statusOverrides[id] ?? order.status
        setStatusOverrides(prev2 => ({ ...prev2, [id]: next }))

        const numId = typeof id === "number" ? id : parseInt(String(id)) || 0

        // Jika dari "baru" langsung ke "lunas", kirim dua notifikasi sekaligus
        if (prev === "baru" && next === "lunas") {
            addSimNotif({
                type: "new_order",
                message: `Pesanan #${id} diproses — Sesi dimulai`,
                subMessage: `${order.paket} • ${order.guru} • ${formatRupiah(order.harga)}`,
                isRead: false,
                orderId: numId,
            })
            addSimNotif({
                type: "payment_success",
                message: `Pembayaran Lunas 💰 — ${order.member}`,
                subMessage: `${order.paket} • ${order.guru} • ${formatRupiah(order.harga)}`,
                isRead: false,
                orderId: numId,
            })
            return
        }

        const msgs: Record<PipelineStatus, { msg: string; type: "new_order" | "payment_success" | "order_cancelled" }> = {
            lunas: { msg: `Pembayaran Lunas 💰 — ${order.member}`, type: "payment_success" },
            aktif: { msg: `Pesanan Aktif 🟢 — ${order.member}`, type: "payment_success" },
            gagal: { msg: `Pesanan Batal ❌ — ${order.member}`, type: "order_cancelled" },
            baru:  { msg: "", type: "new_order" },
        }
        const { msg, type } = msgs[next]
        if (msg) {
            addSimNotif({
                type,
                message: msg,
                subMessage: `${order.paket} • ${order.guru} • ${formatRupiah(order.harga)}`,
                isRead: false,
                orderId: numId,
            })
        }
    }

    const allOrders = useMemo<PipelineOrder[]>(() => {
        const simRows = simOrders.map(simOrderToPipeline)
        const staticRows = dummyData.bookings.map(bookingToPipeline)
        const combined = [...simRows, ...staticRows]
        // Apply local overrides
        return combined.map(o => statusOverrides[o.id] ? { ...o, status: statusOverrides[o.id] } : o)
            .filter(o => o.member !== "Ahmad Fauzi")
    }, [simOrders, statusOverrides])

    const filtered = useMemo(() => {
        const range = getDateRange(dateFilter)
        const q = search.toLowerCase()
        return allOrders.filter(o => {
            // If filter is "all", skip date check
            if (range !== null) {
                const inRange = o.rawDate >= range.from && o.rawDate <= range.to
                if (!inRange) return false
            }
            if (statusTab !== "all" && o.status !== statusTab) return false
            if (!q) return true
            return (
                o.member.toLowerCase().includes(q) ||
                o.guru.toLowerCase().includes(q) ||
                String(o.id).includes(q) ||
                o.paket.toLowerCase().includes(q) ||
                o.username.includes(q)
            )
        })
    }, [search, allOrders, dateFilter, statusTab])

    // Date-filtered only (no statusTab) — used for tab counts so they match the list
    const dateFiltered = useMemo(() => {
        const range = getDateRange(dateFilter)
        const q = search.toLowerCase()
        return allOrders.filter(o => {
            if (range !== null) {
                const inRange = o.rawDate >= range.from && o.rawDate <= range.to
                if (!inRange) return false
            }
            if (!q) return true
            return (
                o.member.toLowerCase().includes(q) ||
                o.guru.toLowerCase().includes(q) ||
                String(o.id).includes(q) ||
                o.paket.toLowerCase().includes(q) ||
                o.username.includes(q)
            )
        })
    }, [allOrders, dateFilter, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const stats = useMemo(() => ({
        total: allOrders.length,
        baru: allOrders.filter(o => o.status === "baru").length,
        gagal: allOrders.filter(o => o.status === "gagal").length,
        revenue: allOrders.filter(o => o.status === "lunas").reduce((s, o) => s + o.harga, 0),
    }), [allOrders])

    function handleResetSim() {
        import("@/lib/sim-store").then(m => { m.clearSimOrders(); setSimOrders([]) })
        setStatusOverrides({})
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
            <SimToast />

            <div className="max-w-[1600px] mx-auto">



                {/* ── Search + Filter + Buttons Row ── */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Cari member, guru, atau paket..." value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="w-64 pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all" />
                    </div>
                    <FilterDropdown value={dateFilter} onChange={k => { setDateFilter(k); setPage(1) }} />
                    <div className="ml-auto flex items-center gap-2">
                        {simOrders.length > 0 && (
                            <button onClick={handleResetSim}
                                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <SimNotifBell />
                        <button onClick={() => setShowSim(true)}
                            className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors font-medium whitespace-nowrap">
                            <Zap className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* ── Status Filter Tabs ── */}
                <div className="flex items-center gap-6 border-b border-gray-100 dark:border-gray-800 mb-0">
                    {([
                        { key: "all",   label: "Semua",   count: dateFiltered.length,                                    activeText: "text-emerald-600 dark:text-emerald-400", activeBorder: "border-emerald-500", activeCount: "text-emerald-500" },
                        { key: "lunas", label: "Lunas",   count: dateFiltered.filter(o => o.status === "lunas").length,  activeText: "text-emerald-600 dark:text-emerald-400", activeBorder: "border-emerald-500", activeCount: "text-emerald-500" },
                        { key: "aktif", label: "Aktif",   count: dateFiltered.filter(o => o.status === "aktif").length,  activeText: "text-sky-600 dark:text-sky-400",         activeBorder: "border-sky-500",     activeCount: "text-sky-500"     },
                        { key: "baru",  label: "Pending", count: dateFiltered.filter(o => o.status === "baru").length,   activeText: "text-amber-600 dark:text-amber-400",     activeBorder: "border-amber-500",   activeCount: "text-amber-500"   },
                        { key: "gagal", label: "Batal",   count: dateFiltered.filter(o => o.status === "gagal").length,  activeText: "text-rose-600 dark:text-rose-400",       activeBorder: "border-rose-500",    activeCount: "text-rose-500"    },
                    ] as { key: "all" | PipelineStatus; label: string; count: number; activeText: string; activeBorder: string; activeCount: string }[]).map(tab => (
                        <button key={tab.key} onClick={() => { setStatusTab(tab.key); setPage(1) }}
                            className={`flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${statusTab === tab.key
                                ? `${tab.activeBorder} ${tab.activeText}`
                                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}>
                            {tab.label}
                            <span className={`text-xs font-bold ${statusTab === tab.key ? tab.activeCount : "text-gray-400"}`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* ── Table List ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Member</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Guru</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Paket</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Tanggal</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Harga</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Payment</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada pesanan ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(order => {
                                    const colorIdx = Math.abs(order.member.charCodeAt(0) + (order.member.charCodeAt(1) || 0)) % AVATAR_COLORS.length
                                    const st = STATUS_CONFIG[order.status]
                                    return (
                                    <tr
                                        key={order.id}
                                        onClick={() => router.push(`/billing/orders/${order.id}`)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                                    >
                                            {/* Member */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[colorIdx]} flex items-center justify-center flex-shrink-0`}>
                                                        <span className="text-white text-[10px] font-bold">{order.memberAvatar}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{order.member}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">@{order.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Guru */}
                                            <td className="px-4 py-3">
                                                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{order.guru}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{order.guruUsername}</p>
                                            </td>
                                            {/* Paket */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{order.paket}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{order.sesi}x sesi</p>
                                            </td>
                                            {/* Tanggal */}
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{order.tglPesan}</td>
                                            {/* Harga */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatRupiah(order.harga)}</td>
                                            {/* Payment */}
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{order.payment}</td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badgeCls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls} inline-block`} />
                                                    {st.label}
                                                </span>

                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={e => e.stopPropagation()}
                                                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 transition-colors opacity-60 group-hover:opacity-100"
                                                >
                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                </button>
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
                            Menampilkan {filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} pesanan
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

            {showSim && <SimModal onClose={() => setShowSim(false)} onOrderCreated={refreshSim} />}
        </div>
    )
}

export default function PesananPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PesananContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
