"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ShoppingBag, Zap, CheckCircle2,
    BookOpen, User, Calendar, CreditCard,
    TrendingUp, ArrowRight, Filter, X,
    ChevronRight as Next, Trash2,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import {
    getSimOrders, addSimNotif,
    nextSimId, saveSimOrder, updateSimOrderPayment,
    type SimOrder,
} from "@/lib/sim-store"
import { SimToast, SimNotifBell } from "@/components/sim-notif"

// ─── Types ────────────────────────────────────────────────────────────────────
type PipelineStatus = "baru" | "aktif" | "selesai" | "lunas"

type PipelineOrder = {
    id: string | number
    member: string
    username: string
    memberAvatar: string
    guru: string
    paket: string
    sesi: number
    sesiSelesai: number
    harga: number
    tglPesan: string
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
    if (b.status === "completed") return "lunas"
    if (b.status === "cancelled") return "baru"
    if (b.completedSessions === 0) return "baru"
    if (b.completedSessions >= b.totalSessions) return "selesai"
    return "aktif"
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
        paket: b.packageName,
        sesi: b.totalSessions,
        sesiSelesai: b.completedSessions,
        harga: b.totalPayment,
        tglPesan: new Date(b.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: b.paymentGateway,
        status: getStage(b),
        isPendingPayment,
    }
}

function simOrderToPipeline(o: SimOrder): PipelineOrder {
    const sesiSelesai = o.completedSessions
    const sesi = o.totalSessions
    let status: PipelineStatus = "baru"
    if (o.paymentStatus === "paid" && sesiSelesai === 0) status = "baru"
    else if (o.paymentStatus === "paid" && sesiSelesai > 0 && sesiSelesai < sesi) status = "aktif"
    else if (o.paymentStatus === "paid" && sesiSelesai >= sesi) status = "lunas"
    return {
        id: o.id,
        member: o.member.name,
        username: toUsername(o.member.email, o.member.name),
        memberAvatar: initials(o.member.name),
        guru: o.trainer.name,
        paket: o.pkg.name,
        sesi,
        sesiSelesai,
        harga: o.pkg.price + o.pkg.serviceFee,
        tglPesan: new Date(o.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: o.paymentGateway || "—",
        status,
        isPendingPayment: o.paymentStatus === "pending",
        isSim: true,
    }
}

// ─── Stage Config ──────────────────────────────────────────────────────────────
const STAGES: {
    key: PipelineStatus
    label: string
    color: string
    bg: string
    border: string
    countBg: string
    dot: string
    illustration: React.ReactNode
    actionLabel: string
    actionColor: string
    nextStatus: PipelineStatus | null
}[] = [
        {
            key: "baru",
            label: "Pesanan Masuk",
            color: "text-sky-700 dark:text-sky-400",
            bg: "bg-sky-50 dark:bg-sky-900/10",
            border: "border-sky-200 dark:border-sky-800",
            countBg: "bg-sky-500",
            dot: "bg-sky-500",
            actionLabel: "Lunas",
            actionColor: "bg-emerald-500 hover:bg-emerald-600 text-white",
            nextStatus: "lunas",
            illustration: (
                <svg viewBox="0 0 80 56" className="w-full h-full" fill="none">
                    <rect x="12" y="14" width="56" height="34" rx="5" fill="#E0F2FE" stroke="#BAE6FD" strokeWidth="1.5" />
                    <rect x="18" y="6" width="44" height="12" rx="4" fill="#BAE6FD" />
                    <circle cx="30" cy="12" r="2" fill="#0EA5E9" />
                    <circle cx="40" cy="12" r="2" fill="#0EA5E9" />
                    <circle cx="50" cy="12" r="2" fill="#0EA5E9" />
                    <rect x="20" y="26" width="40" height="3.5" rx="1.75" fill="#BAE6FD" />
                    <rect x="20" y="33" width="28" height="3" rx="1.5" fill="#E0F2FE" stroke="#BAE6FD" strokeWidth="0.5" />
                    <rect x="20" y="39" width="18" height="3" rx="1.5" fill="#E0F2FE" stroke="#BAE6FD" strokeWidth="0.5" />
                    <circle cx="60" cy="42" r="7" fill="#0EA5E9" />
                    <path d="M57 42l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        },
        {
            key: "aktif",
            label: "Sedang Berjalan",
            color: "text-amber-700 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/10",
            border: "border-amber-200 dark:border-amber-700",
            countBg: "bg-amber-500",
            dot: "bg-amber-400",
            actionLabel: "Selesaikan",
            actionColor: "bg-amber-500 hover:bg-amber-600 text-white",
            nextStatus: "selesai",
            illustration: (
                <svg viewBox="0 0 80 56" className="w-full h-full" fill="none">
                    <circle cx="40" cy="27" r="18" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1.5" />
                    <path d="M40 16v11l7 4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="40" cy="27" r="2.5" fill="#F59E0B" />
                    <path d="M40 9 A18 18 0 0 1 58 27" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
                    <rect x="16" y="48" width="48" height="3.5" rx="1.75" fill="#FDE68A" />
                    <rect x="16" y="48" width="30" height="3.5" rx="1.75" fill="#F59E0B" />
                </svg>
            ),
        },
        {
            key: "selesai",
            label: "Sesi Selesai",
            color: "text-emerald-700 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
            border: "border-emerald-200 dark:border-emerald-800",
            countBg: "bg-emerald-500",
            dot: "bg-emerald-500",
            actionLabel: "Tandai Lunas",
            actionColor: "bg-emerald-500 hover:bg-emerald-600 text-white",
            nextStatus: "lunas",
            illustration: (
                <svg viewBox="0 0 80 56" className="w-full h-full" fill="none">
                    <circle cx="40" cy="26" r="17" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" />
                    <path d="M30 26l7 7 13-13" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="18" cy="48" r="3" fill="#A7F3D0" />
                    <circle cx="28" cy="51" r="2" fill="#A7F3D0" />
                    <circle cx="62" cy="48" r="3" fill="#A7F3D0" />
                    <circle cx="52" cy="51" r="2" fill="#A7F3D0" />
                    <path d="M13 40 Q40 56 67 40" stroke="#A7F3D0" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
            ),
        },
        {
            key: "lunas",
            label: "Lunas",
            color: "text-emerald-700 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
            border: "border-emerald-200 dark:border-emerald-800",
            countBg: "bg-emerald-600",
            dot: "bg-emerald-500",
            actionLabel: "",
            actionColor: "",
            nextStatus: null,
            illustration: (
                <svg viewBox="0 0 80 56" className="w-full h-full" fill="none">
                    <rect x="14" y="16" width="52" height="30" rx="5" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" />
                    <path d="M14 24h52" stroke="#A7F3D0" strokeWidth="1" />
                    <circle cx="40" cy="33" r="8" fill="#10B981" />
                    <path d="M36 33l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 39h8M50 39h8" stroke="#A7F3D0" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="64" cy="12" r="5" fill="#10B981" opacity="0.15" />
                    <circle cx="64" cy="12" r="2.5" fill="#10B981" opacity="0.4" />
                    <circle cx="16" cy="12" r="4" fill="#A7F3D0" opacity="0.6" />
                </svg>
            ),
        },
    ]

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
                                Pesan Sekarang <Next className="w-4 h-4" />
                            </button>
                        ) : step === 4 ? (
                            <button onClick={handlePay} disabled={!selGateway} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Konfirmasi Bayar <CheckCircle2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={() => setStep(s => s + 1)} disabled={(step === 1 && !selMember) || (step === 2 && !selTrainer)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Lanjut <Next className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, stage, onAdvance }: {
    order: PipelineOrder
    stage: typeof STAGES[0]
    onAdvance: (id: string | number, next: PipelineStatus) => void
}) {
    const router = useRouter()
    const progress = order.sesi > 0 ? Math.round((order.sesiSelesai / order.sesi) * 100) : 0
    const colorIdx = Math.abs(order.member.charCodeAt(0) + (order.member.charCodeAt(1) || 0)) % AVATAR_COLORS.length

    return (
        <div
            className={`bg-white dark:bg-gray-900 rounded-xl border ${stage.border} p-3.5 hover:shadow-md transition-all cursor-pointer`}
            onClick={() => router.push(`/billing/pesanan/${order.id}`)}
        >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-2.5">
                <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[colorIdx]} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-[11px] font-bold">{order.memberAvatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{order.member}</p>
                        {order.isSim && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded font-bold flex-shrink-0">SIM</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">@{order.username}</p>
                        {order.isPendingPayment && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 flex-shrink-0">
                                ⏳ Belum Lunas
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <User className="w-3 h-3 text-gray-300 flex-shrink-0" /><span className="truncate">{order.guru}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <BookOpen className="w-3 h-3 text-gray-300 flex-shrink-0" /><span>{order.paket}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3 text-gray-300 flex-shrink-0" /><span>{order.tglPesan}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <CreditCard className="w-3 h-3 text-gray-300 flex-shrink-0" /><span>{order.payment}</span>
                </div>
            </div>

            {/* Progress sesi */}
            {order.status === "aktif" && (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Progres sesi</span>
                        <span className="font-semibold text-gray-600 dark:text-gray-300">{order.sesiSelesai}/{order.sesi}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatRupiah(order.harga)}</span>
                <div className="flex items-center gap-1.5">
                    {stage.nextStatus && stage.actionLabel ? (
                        <button
                            onClick={e => { e.stopPropagation(); onAdvance(order.id, stage.nextStatus!) }}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${stage.actionColor}`}
                        >
                            {stage.actionLabel}
                        </button>
                    ) : !stage.nextStatus ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            ✓ Lunas
                        </span>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

// ─── Stage Column ──────────────────────────────────────────────────────────────
function StageColumn({ stage, orders, onAdvance }: {
    stage: typeof STAGES[0]
    orders: PipelineOrder[]
    onAdvance: (id: string | number, next: PipelineStatus) => void
}) {
    const total = orders.reduce((s, o) => s + o.harga, 0)

    return (
        <div className="flex flex-col min-w-[256px] max-w-[272px] flex-shrink-0">
            {/* Column Header */}
            <div className={`rounded-xl ${stage.bg} border ${stage.border} p-3 mb-3`}>
                <div className="h-14 mb-2.5 opacity-90">{stage.illustration}</div>
                <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${stage.color}`}>{stage.label}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stage.countBg} text-white`}>
                        {orders.length}
                    </span>
                </div>
                {orders.length > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">
                        Total: <span className="font-semibold text-gray-600 dark:text-gray-300">{formatRupiah(total)}</span>
                    </p>
                )}
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-1.5">
                            <ShoppingBag className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-xs text-gray-400">Tidak ada pesanan</p>
                    </div>
                ) : (
                    orders.map(order => <OrderCard key={order.id} order={order} stage={stage} onAdvance={onAdvance} />)
                )}
            </div>
        </div>
    )
}

// ─── Main Content ──────────────────────────────────────────────────────────────
function PesananContent() {
    const [search, setSearch] = useState("")
    const [simOrders, setSimOrders] = useState<SimOrder[]>([])
    const [showSim, setShowSim] = useState(false)
    // Local status overrides (advance pesanan di UI tanpa mengubah JSON)
    const [statusOverrides, setStatusOverrides] = useState<Record<string | number, PipelineStatus>>({})

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

        const msgs: Record<PipelineStatus, { msg: string; type: "new_order" | "payment_success" }> = {
            aktif: { msg: `Pesanan #${id} diproses — Sesi dimulai`, type: "new_order" },
            selesai: { msg: `Sesi Selesai ✅ — ${order.member}`, type: "payment_success" },
            lunas: { msg: `Pembayaran Lunas 💰 — ${order.member}`, type: "payment_success" },
            baru: { msg: "", type: "new_order" },
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
    }, [simOrders, statusOverrides])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        if (!q) return allOrders
        return allOrders.filter(o =>
            o.member.toLowerCase().includes(q) ||
            o.guru.toLowerCase().includes(q) ||
            String(o.id).includes(q) ||
            o.paket.toLowerCase().includes(q) ||
            o.username.includes(q)
        )
    }, [search, allOrders])

    const byStage = (key: PipelineStatus) => filtered.filter(o => o.status === key)

    const stats = useMemo(() => ({
        total: allOrders.length,
        baru: allOrders.filter(o => o.status === "baru").length,
        aktif: allOrders.filter(o => o.status === "aktif").length,
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

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pesanan</h1>
                        <p className="text-sm text-gray-400 mt-0.5"></p>
                    </div>
                    <div className="flex items-center gap-2">
                        {simOrders.length > 0 && (
                            <button onClick={handleResetSim}
                                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Reset Sim
                            </button>
                        )}
                        <SimNotifBell />
                        <button onClick={() => setShowSim(true)}
                            className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-medium">
                            <Zap className="w-3.5 h-3.5" /> Simulasi
                        </button>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                        { label: "Total", value: stats.total, icon: ShoppingBag, cls: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
                        { label: "Masuk", value: stats.baru, icon: ShoppingBag, cls: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/20" },
                        { label: "Aktif", value: stats.aktif, icon: Zap, cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
                        { label: "Revenue Lunas", value: formatRupiah(stats.revenue), icon: TrendingUp, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                    ].map(s => {
                        const Icon = s.icon
                        return (
                            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`w-4 h-4 ${s.cls}`} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Search ── */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Cari member, guru, atau paket..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-64 pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                        <Filter className="w-3.5 h-3.5" />
                        <span>{filtered.length} pesanan</span>
                    </div>
                </div>

                {/* ── Pipeline Board ── */}
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-2.5 min-w-max">
                        {STAGES.map((stage, i) => (
                            <div key={stage.key} className="flex items-start gap-2.5">
                                <StageColumn stage={stage} orders={byStage(stage.key)} onAdvance={handleAdvance} />
                                {i < STAGES.length - 1 && (
                                    <div className="flex items-start pt-[88px] flex-shrink-0">
                                        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}
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
