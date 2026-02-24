"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    CreditCard,
    TrendingUp,
    RefreshCcw,
    Users,
    DollarSign,
    CheckCircle2,
    Clock,
    XCircle,
    ArrowUpRight,
    Banknote,
    BarChart3,
    Wallet,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"

// ─── helpers ────────────────────────────────────────────────────────────────
function formatRupiah(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

// ─── CircularGauge component ─────────────────────────────────────────────────
function CircularGauge({
    value,
    max,
    label,
    sublabel,
    color,
    displayValue,
}: {
    value: number
    max: number
    label: string
    sublabel: string
    color: string
    displayValue: string
}) {
    const r = 42
    const circumference = 2 * Math.PI * r
    const pct = Math.min(value / max, 1)
    const offset = circumference * (1 - pct)
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r={r} stroke="currentColor" strokeWidth="6" fill="none"
                        className="text-gray-200 dark:text-gray-700" />
                    <circle cx="48" cy="48" r={r} stroke="currentColor" strokeWidth="6" fill="none"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={`${offset}`}
                        className={`${color} transition-all duration-700`}
                        strokeLinecap="round" />
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

// ─── Main content ─────────────────────────────────────────────────────────────
function BillingDashboardContent() {
    const { stats, revenueByMonth, paymentMethodBreakdown, payments } = dummyData
    // bookings list available via dummyData.bookings

    const successRate = Math.round((stats.successfulPayments / stats.totalPayments) * 100)
    const activeSubRate = Math.round((stats.activeBookings / stats.totalBookings) * 100)

    // Overview cards (mirroring master-data style)
    const overviewCards = [
        {
            title: "Total Revenue",
            icon: DollarSign,
            value: formatRupiah(stats.totalRevenue),
            sub: `+${stats.revenueGrowth}% dari bulan lalu`,
            color: "emerald",
        },
        {
            title: "Total Pembayaran",
            icon: CreditCard,
            value: stats.totalPayments.toLocaleString("id-ID"),
            sub: `${stats.successfulPayments} berhasil`,
            color: "blue",
        },
        {
            title: "Pesanan Aktif",
            icon: Users,
            value: stats.activeBookings.toLocaleString("id-ID"),
            sub: `+${stats.bookingGrowth}% dari bulan lalu`,
            color: "violet",
        },
        {
            title: "Avg. Transaksi",
            icon: Banknote,
            value: formatRupiah(stats.avgTransactionValue),
            sub: `${stats.totalPayments} transaksi`,
            color: "amber",
        },
    ]

    // Status cards
    const statusCards = [
        { label: "Berhasil", icon: CheckCircle2, count: stats.successfulPayments, color: "emerald" },
        { label: "Pending", icon: Clock, count: stats.pendingPayments, color: "amber" },
        { label: "Gagal", icon: XCircle, count: stats.failedPayments, color: "red" },
        { label: "Refund", icon: RefreshCcw, count: stats.pendingRefunds, color: "blue" },
    ]

    // Chart: max value for scaling
    const maxRevenue = Math.max(...revenueByMonth.map(d => d.revenue))
    const chartH = 100
    const chartW = 400
    const pts = revenueByMonth.map((d, i) => {
        const x = (i / (revenueByMonth.length - 1)) * chartW
        const y = chartH - (d.revenue / maxRevenue) * chartH
        return `${x},${y}`
    })
    const polyline = pts.join(" ")
    const areaPath = `M${pts[0]} L${pts.slice(1).join(" L")} L${chartW},${chartH} L0,${chartH} Z`

    // Recent payments (latest 5)
    const recentPayments = [...payments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 5)

    const statusMap: Record<string, { label: string; cls: string }> = {
        completed: { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
        pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
        failed: { label: "Gagal", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
        refund_requested: { label: "Refund", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Dashboard</h1>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
                        Data: Feb 2026 <span className="ml-1 inline-block w-2 h-2 rounded-full bg-emerald-500 align-middle" />
                    </span>
                </div>

                {/* ── Row 1: Gauge + Revenue Trend ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Gauges */}
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
                                    color="text-emerald-500"
                                    displayValue={`${successRate}%`}
                                />
                                <CircularGauge
                                    value={activeSubRate} max={100}
                                    label="Pesanan Aktif"
                                    sublabel={`${stats.activeBookings} dari ${stats.totalBookings}`}
                                    color="text-blue-500"
                                    displayValue={`${activeSubRate}%`}
                                />
                                <CircularGauge
                                    value={stats.pendingPayouts} max={150}
                                    label="Payout Pending"
                                    sublabel={`${stats.pendingPayouts} menunggu`}
                                    color="text-amber-500"
                                    displayValue={`${stats.pendingPayouts}`}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Revenue spotlight */}
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
                                        +{stats.revenueGrowth}%
                                    </span>
                                    <span className="text-xs text-gray-400 ml-1">vs bulan lalu</span>
                                </div>
                            </div>
                            {/* Payment method split */}
                            <div className="space-y-2">
                                {paymentMethodBreakdown.map(m => (
                                    <div key={m.method}>
                                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                            <span>{m.method}</span>
                                            <span>{m.percentage}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-500"
                                                style={{ width: `${m.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Row 2: Overview cards (like master-data) ── */}
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-gray-900 dark:text-white text-base font-semibold">Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {overviewCards.map((card) => {
                                const Icon = card.icon
                                const colorMap: Record<string, string> = {
                                    emerald: "bg-emerald-100 dark:bg-emerald-900/20",
                                    blue: "bg-blue-100 dark:bg-blue-900/20",
                                    violet: "bg-violet-100 dark:bg-violet-900/20",
                                    amber: "bg-amber-100 dark:bg-amber-900/20",
                                }
                                const iconMap: Record<string, string> = {
                                    emerald: "text-emerald-600 dark:text-emerald-400",
                                    blue: "text-blue-600 dark:text-blue-400",
                                    violet: "text-violet-600 dark:text-violet-400",
                                    amber: "text-amber-600 dark:text-amber-400",
                                }
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

                    {/* Payment Status Statistics */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <CardTitle className="text-gray-900 dark:text-white text-base">Statistik Pembayaran</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-4">
                                {statusCards.map((s) => {
                                    const Icon = s.icon
                                    const colorMap: Record<string, string> = {
                                        emerald: "bg-emerald-100 dark:bg-emerald-900/20",
                                        amber: "bg-amber-100 dark:bg-amber-900/20",
                                        red: "bg-red-100 dark:bg-red-900/20",
                                        blue: "bg-blue-100 dark:bg-blue-900/20",
                                    }
                                    const iconMap: Record<string, string> = {
                                        emerald: "text-emerald-600 dark:text-emerald-400",
                                        amber: "text-amber-600 dark:text-amber-400",
                                        red: "text-red-600 dark:text-red-400",
                                        blue: "text-blue-600 dark:text-blue-400",
                                    }
                                    const badgeMap: Record<string, string> = {
                                        emerald: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
                                        amber: "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                                        red: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400",
                                        blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                                    }
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
                                                <span className={`text-sm px-2 py-1 rounded ${badgeMap[s.color]}`}>
                                                    Active
                                                </span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">{s.count}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue Trend Chart */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-gray-900 dark:text-white text-base">Tren Revenue</CardTitle>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Revenue
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Target
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="space-y-3">
                                {/* Chart */}
                                <div className="h-44 relative">
                                    <svg className="w-full h-full" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                                        {/* Grid */}
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <line key={i} x1="0" y1={i * 25} x2={chartW} y2={i * 25}
                                                stroke="currentColor" strokeWidth="0.5"
                                                className="text-gray-200 dark:text-gray-700" />
                                        ))}
                                        {/* Area fill */}
                                        <path d={areaPath} fill="currentColor" className="text-emerald-500 opacity-20" />
                                        {/* Line */}
                                        <polyline
                                            points={polyline}
                                            fill="none" stroke="currentColor" strokeWidth="2"
                                            className="text-emerald-500"
                                            strokeLinejoin="round" strokeLinecap="round"
                                        />
                                        {/* Dots */}
                                        {revenueByMonth.map((d, i) => {
                                            const x = (i / (revenueByMonth.length - 1)) * chartW
                                            const y = chartH - (d.revenue / maxRevenue) * chartH
                                            return <circle key={i} cx={x} cy={y} r="4" fill="white"
                                                stroke="currentColor" strokeWidth="2"
                                                className="text-emerald-500" />
                                        })}
                                    </svg>
                                </div>
                                {/* X-axis labels */}
                                <div className="flex justify-between px-1">
                                    {revenueByMonth.map(d => (
                                        <span key={d.month} className="text-[10px] text-gray-400 dark:text-gray-500">{d.month}</span>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Row 4: Recent Payments table ── */}
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                    <CardHeader className="pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-gray-900 dark:text-white text-base">Pembayaran Terbaru</CardTitle>
                            <a href="/billing/member-subscription"
                                className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                Lihat semua <ArrowUpRight className="w-3 h-3" />
                            </a>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2 px-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
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
                                    {recentPayments.map((p) => {
                                        const s = statusMap[p.status] || { label: p.status, cls: "bg-gray-100 text-gray-600" }
                                        return (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-3 text-xs text-gray-400 font-mono">#{p.id}</td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white text-xs">{p.userName}</p>
                                                        <p className="text-gray-400 dark:text-gray-500 text-[10px]">{p.userEmail}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{p.trainerName}</td>
                                                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{p.paymentMethod}</td>
                                                <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">
                                                    {formatRupiah(p.amount)}
                                                </td>
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
                    </CardContent>
                </Card>

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
