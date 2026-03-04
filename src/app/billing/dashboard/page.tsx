"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    CreditCard,
    RefreshCcw,
    Users,
    DollarSign,
    CheckCircle2,
    Clock,
    XCircle,
    ArrowUpRight,
    Banknote,
    Calendar,
    ChevronDown,
    Check,
    Timer,
    BarChart2,
    History,
} from "lucide-react"
import rawData from "@/data/billing-dummy.json"

// ─── Types ────────────────────────────────────────────────────────────────────
type Payment = {
    id: number
    userId: number
    userName: string
    userEmail: string
    userUsername?: string
    trainerId: number
    trainerName: string
    trainerUsername?: string
    bookingId: number
    packageName: string
    amount: number
    currency: string
    status: string
    paymentMethod: string
    paymentGatewayRef: string
    isPaidOut: boolean
    refundRequested: boolean
    createdAt: string
    paidAt: string | null
    paidOutAt: string | null
    notes: string | null
}

type Booking = {
    id: number
    userId: number
    userName: string
    userEmail: string
    trainerId: number
    trainerName: string
    packageName: string
    packageKey: string
    totalSessions: number
    completedSessions: number
    mode: string
    pricePackage: number
    serviceFee: number
    totalPayment: number
    currency: string
    status: string
    bookingDate: string
    paymentMethod: string
    paymentGateway: string
}

const allPayments: Payment[] = (rawData as { payments?: Payment[] }).payments ?? []
const allBookings: Booking[] = (rawData as { bookings?: Booking[] }).bookings ?? []

// ─── Filter Config ────────────────────────────────────────────────────────────
type FilterKey =
    | "today" | "yesterday"
    | "this_week" | "this_month" | "this_year" | "last_year"
    | "last_7_days" | "last_30_days"

const FILTER_OPTIONS: { key: FilterKey; label: string; group: string }[] = [
    { key: "today", label: "Today", group: "Quick" },
    { key: "yesterday", label: "Yesterday", group: "Quick" },
    { key: "this_week", label: "This week", group: "Period" },
    { key: "this_month", label: "This month", group: "Period" },
    { key: "this_year", label: "This year", group: "Period" },
    { key: "last_year", label: "Last year", group: "Period" },
    { key: "last_7_days", label: "Last 7 days", group: "Historical" },
    { key: "last_30_days", "label": "Last 30 days", "group": "Historical" },
]

const GROUP_ICONS: Record<string, React.ReactNode> = {
    Quick: <Timer className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
    Period: <BarChart2 className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
    Historical: <History className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
}

// ── Display label per filter ──────────────────────────────────────────────────
function getFilterLabel(filter: FilterKey): string {
    const now = new Date()
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    switch (filter) {
        case "today": return `Data: ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
        case "yesterday": {
            const y = new Date(now.getTime() - 86400000)
            return `Data: ${y.getDate()} ${months[y.getMonth()]} ${y.getFullYear()}`
        }
        case "this_week": return `Data: Minggu ini`
        case "this_month": return `Data: ${months[now.getMonth()]} ${now.getFullYear()}`
        case "this_year": return `Data: Tahun ${now.getFullYear()}`
        case "last_year": return `Data: Tahun ${now.getFullYear() - 1}`
        case "last_7_days": return `Data: 7 hari terakhir`
        case "last_30_days": return `Data: 30 hari terakhir`
    }
}

// ── Slice dummy data differently per filter so data always changes ─────────────
// Each filter key returns a deterministic but DIFFERENT subset of the JSON data.
const FILTER_SLICES: Record<FilterKey, { paymentIdx: number[]; bookingIdx: number[] }> = {
    // today: payment id 1011 (Mar 04 07:30) & 1012 (Mar 04 09:15) → idx 10,11
    today: { paymentIdx: [10, 11], bookingIdx: [0] },
    // yesterday: payment id 1013 (Mar 03 14:20) & 1014 (Mar 03 10:00) → idx 12,13
    yesterday: { paymentIdx: [12, 13], bookingIdx: [1] },
    // this week: Mar 01-04 → idx 10-15
    this_week: { paymentIdx: [10, 11, 12, 13, 14, 15], bookingIdx: [0, 1, 2] },
    // this month (Mar 2026): idx 10-15
    this_month: { paymentIdx: [10, 11, 12, 13, 14, 15], bookingIdx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    // this year (all 2026): idx 0-15
    this_year: { paymentIdx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], bookingIdx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    // last year (2025): id 1005,1006,1010,1017,1018,1019,1020 → idx 4,5,9,16,17,18,19
    last_year: { paymentIdx: [4, 5, 9, 16, 17, 18, 19], bookingIdx: [4, 5] },
    // last 7 days (Feb 26 - Mar 04): idx 10-15
    last_7_days: { paymentIdx: [10, 11, 12, 13, 14], bookingIdx: [0, 1, 2] },
    // last 30 days (Feb 03 - Mar 04): idx 0,1,7,8,9,10,11,12,13,14,15
    last_30_days: { paymentIdx: [0, 1, 7, 8, 9, 10, 11, 12, 13, 14, 15], bookingIdx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
}

function getFilteredData(filter: FilterKey) {
    const { paymentIdx, bookingIdx } = FILTER_SLICES[filter]
    return {
        payments: paymentIdx.map(i => allPayments[i]).filter(Boolean),
        bookings: bookingIdx.map(i => allBookings[i]).filter(Boolean),
    }
}

// ── Chart groupings per filter ────────────────────────────────────────────────
function buildChartData(filter: FilterKey, payments: Payment[]) {
    const completed = payments.filter(p => p.status === "completed")
    const completed2 = [...completed]

    if (["today", "yesterday"].includes(filter)) {
        const labels = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
        const buckets = labels.map((label, i) => ({
            label,
            revenue: completed2[i] ? completed2[i % completed2.length].amount * (0.4 + i * 0.15) : 0
        }))
        return buckets
    }
    if (["this_week", "last_7_days"].includes(filter)) {
        const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
        return days.map((label, i) => ({
            label,
            revenue: completed2[i % Math.max(completed2.length, 1)]
                ? completed2[i % completed2.length].amount * (0.5 + i * 0.1)
                : 0
        }))
    }
    if (["this_month", "last_30_days"].includes(filter)) {
        const weeks = ["W1", "W2", "W3", "W4"]
        return weeks.map((label, i) => ({
            label,
            revenue: completed2.slice(i * 2, i * 2 + 2).reduce((s, p) => s + p.amount, 0)
        }))
    }
    // Year / last_year → by month
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const yearRev = filter === "last_year"
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => completed2[i % Math.max(completed2.length, 1)]?.amount * (0.6 + i * 0.05) || 0)
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => completed2[i % Math.max(completed2.length, 1)]?.amount * (0.8 + i * 0.03) || 0)
    return months.map((label, i) => ({ label, revenue: Math.round(yearRev[i] || 0) }))
}


// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ value, onChange }: { value: FilterKey; onChange: (k: FilterKey) => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    // Dynamic label on the button based on active filter
    const displayDate = useMemo(() => {
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, "0")
        const fmtShort = (d: Date) =>
            d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })

        switch (value) {
            case "today":
                return fmtShort(now)
            case "yesterday": {
                const y = new Date(now); y.setDate(y.getDate() - 1)
                return fmtShort(y)
            }
            case "this_week": {
                const day = now.getDay()
                const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
                const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
                return `${pad(mon.getDate())} – ${pad(sun.getDate())} ${now.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
            }
            case "this_month":
                return now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
            case "this_year":
                return `Year ${now.getFullYear()}`
            case "last_year":
                return `Year ${now.getFullYear() - 1}`
            case "last_7_days": {
                const from = new Date(now); from.setDate(now.getDate() - 6)
                return `${fmtShort(from)} – ${pad(now.getDate())}`
            }
            case "last_30_days": {
                const from = new Date(now); from.setDate(now.getDate() - 29)
                return `${from.toLocaleDateString("en-US", { month: "short", day: "2-digit" })} – ${fmtShort(now)}`
            }
        }
    }, [value])


    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const groups = ["Quick", "Period", "Historical"]

    return (
        <div className="relative" ref={ref}>
            {/* Trigger button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-500 transition-all shadow-sm min-w-[180px]"
            >
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-left font-medium text-xs">{displayDate}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {groups.map((group, gi) => {
                        const items = FILTER_OPTIONS.filter(o => o.group === group)
                        return (
                            <div key={group}>
                                {gi > 0 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3" />}
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center mb-1">
                                        {GROUP_ICONS[group]}{group}
                                    </p>
                                    {items.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => { onChange(opt.key); setOpen(false) }}
                                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${value === opt.key
                                                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                                }`}
                                        >
                                            {opt.label}
                                            {value === opt.key && <Check className="w-3 h-3 text-emerald-500" />}
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

// ─── CircularGauge — arc animates from 0 to target on mount ──────────────────
function CircularGauge({ value, max, label, sublabel, color, displayValue }: {
    value: number; max: number; label: string; sublabel: string; color: string; displayValue: string
}) {
    const r = 42
    const circumference = 2 * Math.PI * r
    const targetOffset = circumference * (1 - Math.min(value / max, 1))
    const [animOffset, setAnimOffset] = useState(circumference) // start = full (empty arc)

    useEffect(() => {
        setAnimOffset(circumference) // reset to empty first
        const t = setTimeout(() => setAnimOffset(targetOffset), 80)
        return () => clearTimeout(t)
    }, [targetOffset, circumference])

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r={r} stroke="currentColor" strokeWidth="6" fill="none"
                        className="text-gray-200 dark:text-gray-700" />
                    <circle cx="48" cy="48" r={r} stroke="currentColor" strokeWidth="6" fill="none"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={`${animOffset}`}
                        style={{ transition: "stroke-dashoffset 0.85s cubic-bezier(0.4,0,0.2,1)" }}
                        className={color} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{displayValue}</span>
                </div>
            </div>
            <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>
            </div>
        </div>
    )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function BillingDashboardContent() {
    const [activeFilter, setActiveFilter] = useState<FilterKey>("this_month")

    // Get different data slice per filter — data always changes when filter changes
    const { payments: filteredPayments, bookings: filteredBookings } = useMemo(
        () => getFilteredData(activeFilter),
        [activeFilter]
    )

    const label = useMemo(() => getFilterLabel(activeFilter), [activeFilter])

    // Compute stats from filtered slice
    const stats = useMemo(() => {
        const completed = filteredPayments.filter(p => p.status === "completed")
        const pending = filteredPayments.filter(p => p.status === "pending")
        const failed = filteredPayments.filter(p => p.status === "failed")
        const refundReq = filteredPayments.filter(p => p.refundRequested)
        const totalRev = completed.reduce((s, p) => s + p.amount, 0)
        const activeBook = filteredBookings.filter(b => b.status === "active")
        const pendingOut = filteredPayments.filter(p => p.status === "completed" && !p.isPaidOut).length

        const methodMap: Record<string, number> = {}
        completed.forEach(p => { methodMap[p.paymentMethod] = (methodMap[p.paymentMethod] || 0) + p.amount })
        const totalMethodRev = Object.values(methodMap).reduce((s, v) => s + v, 0) || 1
        const methodBreakdown = Object.entries(methodMap)
            .sort((a, b) => b[1] - a[1]).slice(0, 4)
            .map(([method, amount]) => ({ method, percentage: Math.round((amount / totalMethodRev) * 100), amount }))

        return {
            totalRevenue: totalRev,
            totalPayments: filteredPayments.length,
            successfulPayments: completed.length,
            pendingPayments: pending.length,
            failedPayments: failed.length,
            pendingRefunds: refundReq.length,
            activeBookings: activeBook.length,
            totalBookings: filteredBookings.length,
            pendingPayouts: pendingOut,
            avgTransaction: completed.length > 0 ? Math.round(totalRev / completed.length) : 0,
            methodBreakdown,
        }
    }, [filteredPayments, filteredBookings])

    // Build chart — different grouping per filter period
    const chartData = useMemo(
        () => buildChartData(activeFilter, filteredPayments),
        [activeFilter, filteredPayments]
    )

    const successRate = stats.totalPayments > 0
        ? Math.round((stats.successfulPayments / stats.totalPayments) * 100) : 0
    const activeSubRate = stats.totalBookings > 0
        ? Math.round((stats.activeBookings / stats.totalBookings) * 100) : 0

    const overviewCards = [
        { title: "Total Revenue", icon: DollarSign, value: formatRupiah(stats.totalRevenue), sub: `${stats.successfulPayments} transaksi berhasil`, color: "emerald" },
        { title: "Total Pembayaran", icon: CreditCard, value: stats.totalPayments.toLocaleString("id-ID"), sub: `${stats.successfulPayments} berhasil`, color: "blue" },
        { title: "Pesanan Aktif", icon: Users, value: stats.activeBookings.toLocaleString("id-ID"), sub: `dari ${stats.totalBookings} total pesanan`, color: "violet" },
        { title: "Avg. Transaksi", icon: Banknote, value: formatRupiah(stats.avgTransaction), sub: `${stats.successfulPayments} transaksi`, color: "amber" },
    ]

    const statusCards = [
        { label: "Berhasil", icon: CheckCircle2, count: stats.successfulPayments, color: "emerald" },
        { label: "Pending", icon: Clock, count: stats.pendingPayments, color: "amber" },
        { label: "Gagal", icon: XCircle, count: stats.failedPayments, color: "red" },
        { label: "Refund", icon: RefreshCcw, count: stats.pendingRefunds, color: "blue" },
    ]

    // Chart rendering
    const maxRevChart = Math.max(...chartData.map(d => d.revenue), 1)
    const chartH = 100
    const chartW = 400
    const pts = chartData.map((d, i) => {
        const x = chartData.length > 1 ? (i / (chartData.length - 1)) * chartW : chartW / 2
        const y = chartH - (d.revenue / maxRevChart) * chartH
        return `${x},${y}`
    })
    const polyline = pts.join(" ")
    const areaPath = pts.length > 1
        ? `M${pts[0]} L${pts.slice(1).join(" L")} L${chartW},${chartH} L0,${chartH} Z`
        : ""

    // Recent payments (latest 5)
    const recentPayments = [...filteredPayments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)

    const statusMap: Record<string, { label: string; cls: string }> = {
        completed: { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
        pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
        failed: { label: "Gagal", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
        refund_requested: { label: "Refund", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    }

    const colorMap: Record<string, string> = {
        emerald: "bg-emerald-100 dark:bg-emerald-900/20",
        blue: "bg-blue-100 dark:bg-blue-900/20",
        violet: "bg-violet-100 dark:bg-violet-900/20",
        amber: "bg-amber-100 dark:bg-amber-900/20",
        red: "bg-red-100 dark:bg-red-900/20",
    }
    const iconMap: Record<string, string> = {
        emerald: "text-emerald-600 dark:text-emerald-400",
        blue: "text-blue-600 dark:text-blue-400",
        violet: "text-violet-600 dark:text-violet-400",
        amber: "text-amber-600 dark:text-amber-400",
        red: "text-red-600 dark:text-red-400",
    }
    const badgeMap: Record<string, string> = {
        emerald: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
        red: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400",
        blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <style>{`
                @keyframes chartLineDraw {
                    from { stroke-dashoffset: 1200; }
                    to   { stroke-dashoffset: 0; }
                }
                .anim-chart-line {
                    stroke-dasharray: 1200;
                    stroke-dashoffset: 1200;
                    animation: chartLineDraw 1.1s ease forwards;
                }
            `}</style>

            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Dashboard</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
                    </div>
                    <FilterDropdown value={activeFilter} onChange={setActiveFilter} />
                </div>

                {/* key re-mounts children → triggers per-card animations on filter change */}
                <div key={activeFilter} className="space-y-4">

                    {/* ── Row 1: Gauge + Revenue ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-gray-900 dark:text-white text-base">Status Keuangan</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="grid grid-cols-3 gap-4">
                                    <CircularGauge
                                        value={successRate} max={100}
                                        label="Tingkat Sukses"
                                        sublabel={`${stats.successfulPayments} dari ${stats.totalPayments}`}
                                        color="text-emerald-500" displayValue={`${successRate}%`}
                                    />
                                    <CircularGauge
                                        value={activeSubRate} max={100}
                                        label="Pesanan Aktif"
                                        sublabel={`${stats.activeBookings} dari ${stats.totalBookings}`}
                                        color="text-blue-500" displayValue={`${activeSubRate}%`}
                                    />
                                    <CircularGauge
                                        value={stats.pendingPayouts} max={150}
                                        label="Payout Pending"
                                        sublabel={`${stats.pendingPayouts} menunggu`}
                                        color="text-amber-500" displayValue={`${stats.pendingPayouts}`}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-gray-900 dark:text-white text-base">Total Revenue</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 px-6 py-4">
                                <div>
                                    <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatRupiah(stats.totalRevenue)}
                                    </span>
                                    <div className="flex items-center gap-1 mt-1">
                                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                            {stats.successfulPayments} transaksi
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {stats.methodBreakdown.length > 0
                                        ? stats.methodBreakdown.map(m => (
                                            <div key={m.method}>
                                                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                                    <span>{m.method}</span>
                                                    <span>{m.percentage}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${m.percentage}%` }} />
                                                </div>
                                            </div>
                                        ))
                                        : <p className="text-xs text-gray-400 text-center py-2">Tidak ada data pada periode ini</p>
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Row 2: Overview cards ── */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <CardTitle className="text-gray-900 dark:text-white text-base font-semibold">Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {overviewCards.map((card) => {
                                    const Icon = card.icon
                                    return (
                                        <Card key={card.title} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                            <CardContent className="p-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg ${colorMap[card.color]} flex items-center justify-center`}>
                                                            <Icon className={`w-5 h-5 ${iconMap[card.color]}`} />
                                                        </div>
                                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{card.title}</h3>
                                                    </div>
                                                    <div>
                                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.sub}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Row 3: Statistics + Revenue Chart ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-gray-900 dark:text-white text-base">Statistik Pembayaran</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="grid grid-cols-2 gap-4">
                                    {statusCards.map((s) => {
                                        const Icon = s.icon
                                        return (
                                            <div key={s.label}
                                                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`w-12 h-12 rounded-lg ${colorMap[s.color]} flex items-center justify-center`}>
                                                        <Icon className={`w-6 h-6 ${iconMap[s.color]}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-white">{s.label}</h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Transaksi</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm px-2 py-1 rounded ${badgeMap[s.color]}`}>Active</span>
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{s.count}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                            <CardHeader className="pb-0">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-gray-900 dark:text-white text-base">Tren Revenue</CardTitle>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Revenue
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="space-y-3">
                                    <div className="h-44 relative">
                                        {chartData.every(d => d.revenue === 0) ? (
                                            <div className="h-full flex items-center justify-center text-xs text-gray-400">
                                                Tidak ada data revenue pada periode ini
                                            </div>
                                        ) : (
                                            <svg className="w-full h-full" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                                                {[0, 1, 2, 3, 4].map(i => (
                                                    <line key={i} x1="0" y1={i * 25} x2={chartW} y2={i * 25}
                                                        stroke="currentColor" strokeWidth="0.5"
                                                        className="text-gray-200 dark:text-gray-700" />
                                                ))}
                                                {areaPath && <path d={areaPath} fill="currentColor" className="text-emerald-500 opacity-20" />}
                                                {pts.length > 1 && (
                                                    <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="2"
                                                        className="text-emerald-500 anim-chart-line" strokeLinejoin="round" strokeLinecap="round" />
                                                )}
                                                {chartData.map((d, i) => {
                                                    const x = chartData.length > 1 ? (i / (chartData.length - 1)) * chartW : chartW / 2
                                                    const y = chartH - (d.revenue / maxRevChart) * chartH
                                                    return <circle key={i} cx={x} cy={y} r="4" fill="white"
                                                        stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
                                                })}
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex justify-between px-1">
                                        {chartData.map(d => (
                                            <span key={d.label} className="text-[10px] text-gray-400 dark:text-gray-500">{d.label}</span>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Row 4: Payments ── */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-gray-900 dark:text-white text-base">
                                    Pembayaran
                                    {filteredPayments.length === 0 && (
                                        <span className="ml-2 text-xs font-normal text-gray-400">— tidak ada data pada periode ini</span>
                                    )}
                                </CardTitle>
                                <span className="text-xs text-gray-400">{filteredPayments.length} transaksi</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2 px-0">
                            {filteredPayments.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    Tidak ada transaksi pada periode yang dipilih
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="max-h-80 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3">ID</th>
                                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">User</th>
                                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Trainer</th>
                                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Payment</th>
                                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Jumlah</th>
                                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</th>
                                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Tanggal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {filteredPayments
                                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                    .map((p) => {
                                                        const s = statusMap[p.status] || { label: p.status, cls: "bg-gray-100 text-gray-600" }
                                                        return (
                                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-6 py-3 text-xs text-gray-400 font-mono">#{p.id}</td>
                                                                <td className="px-4 py-3">
                                                                    <div>
                                                                        <p className="font-medium text-gray-900 dark:text-white text-xs">{p.userName}</p>
                                                                        <p className="text-gray-400 dark:text-gray-500 text-[10px]">@{p.userUsername ?? p.userEmail.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div>
                                                                        <p className="text-xs text-gray-600 dark:text-gray-400">{p.trainerName}</p>
                                                                        <p className="text-gray-400 dark:text-gray-500 text-[10px]">@{p.trainerUsername ?? p.trainerName.toLowerCase().replace(/[^a-z0-9]/g, "")}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{p.paymentMethod}</td>
                                                                <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">{formatRupiah(p.amount)}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
                                                                        {s.label}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px] text-gray-400">
                                                                    {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div> {/* end filter-animate */}
            </div>
        </div>
    )
}

export default function BillingDashboard() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <BillingDashboardContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
