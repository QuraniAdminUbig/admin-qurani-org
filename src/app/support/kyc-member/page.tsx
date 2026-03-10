"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, Filter, MoreHorizontal, Calendar,
    ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
    CreditCard, RefreshCw, ChevronDown, Check,
    X, Phone, MapPin, User, Flag, Hash, Shield, RotateCcw, FileText
} from "lucide-react"
import rawData from "@/data/kyc-dummy.json"

// ─── Types ────────────────────────────────────────────────────────────────────
type KycMember = {
    id: number
    nama: string
    avatar: string
    avatarBg: string
    avatarUrl?: string
    tipeDokumen: string
    retryCount: number
    tglPengajuan: string
    status: "menunggu" | "disetujui" | "ditolak"
    noWhatsapp?: string
    tempatLahir?: string
    tanggalLahir?: string
    alamat?: string
    nik?: string
    namaResmi?: string
    username?: string
    email?: string
    ktpImage?: string
    selfieImage?: string
    rejectionReason?: string | null
    rejectionHistory?: { id: number; date: string; reason: string }[]
    notes?: string
}

const DATA: KycMember[] = rawData.kyc_member as KycMember[]

const STATUS_CONFIG = {
    menunggu: { label: "Pending", cls: "bg-amber-50 text-amber-600 border border-amber-200", icon: Clock },
    disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle2 },
    ditolak: { label: "Ditolak", cls: "bg-red-50 text-red-600 border border-red-200", icon: XCircle },
}
const STATUS_BADGE: Record<string, string> = {
    menunggu: "bg-amber-100 text-amber-700 border border-amber-200",
    disetujui: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    ditolak: "bg-red-100 text-red-600 border border-red-200",
}

// ─── Per-Page Custom Dropdown ─────────────────────────────────────────────────
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
        <div className="relative" onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    onMouseLeave={() => setOpen(false)}
                >
                    {[
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

// ─── KTP Document (real image or placeholder) ────────────────────────────────────────────
function KtpCardPreview({ member }: { member: KycMember }) {
    if (member.ktpImage) {
        return (
            <div className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={member.ktpImage}
                    alt={`KTP ${member.namaResmi || member.nama}`}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
            </div>
        )
    }
    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl flex flex-col">
            {/* KTP header */}
            <div className="bg-red-600 text-white text-center py-2 px-3 rounded-t-xl">
                <p className="text-[10px] font-bold tracking-wider">PROVINSI</p>
                <p className="text-xs font-bold tracking-widest">INDONESIA</p>
            </div>
            <div className="flex-1 p-3 flex gap-3">
                {/* Photo placeholder */}
                <div className="w-16 h-20 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-gray-400" />
                </div>
                {/* Fields */}
                <div className="flex-1 space-y-1">
                    {[
                        ["NIK", member.nik || "—"],
                        ["Nama", member.nama],
                        ["Tempat/Tgl Lahir", `${member.tempatLahir || "—"}, ${member.tanggalLahir || "—"}`],
                        ["Alamat", member.alamat || "—"],
                    ].map(([label, val]) => (
                        <div key={label}>
                            <p className="text-[8px] text-gray-500 uppercase leading-tight">{label}</p>
                            <p className="text-[9px] font-semibold text-gray-800 dark:text-gray-200 leading-tight">{val}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Selfie Photo (real image or avatar placeholder) ─────────────────────────────────
function SelfiePlaceholder({ member }: { member: KycMember }) {
    if (member.selfieImage) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={member.selfieImage}
                alt={`Selfie ${member.nama}`}
                className="w-full h-full object-cover object-top"
            />
        )
    }
    return (
        <div className={`w-full h-full ${member.avatarBg} opacity-80 rounded-xl flex flex-col items-center justify-center gap-3`}>
            <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">{member.avatar}</span>
            </div>
            <p className="text-white/80 text-xs font-medium">Foto Selfie</p>
        </div>
    )
}
// ─── Filter Constants (Member) ───────────────────────────────────────────────
const TIPE_DOKUMEN_OPTIONS = ["KTP", "Kartu Pelajar"] as const
const RIWAYAT_OPTIONS = ["0x (Baru)", "1x Gagal", "2-3x Gagal", ">3x Gagal"] as const

type MemberFilterState = {
    tipeDokumen: string[]
    riwayat: string[]
}
const MEMBER_EMPTY_FILTER: MemberFilterState = { tipeDokumen: [], riwayat: [] }

// ─── Member FilterModal ───────────────────────────────────────────────────────
function MemberFilterModal({
    initial,
    onApply,
    onClose,
}: {
    initial: MemberFilterState
    onApply: (f: MemberFilterState) => void
    onClose: () => void
}) {
    const [draft, setDraft] = useState<MemberFilterState>({
        tipeDokumen: [...initial.tipeDokumen],
        riwayat: [...initial.riwayat],
    })

    const toggle = (key: keyof MemberFilterState, val: string) => {
        setDraft(prev => ({
            ...prev,
            [key]: prev[key].includes(val)
                ? prev[key].filter(v => v !== val)
                : [...prev[key], val],
        }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[480px]">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Filter Data</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                    <p className="text-sm text-emerald-500 mb-5">Tampilkan data spesifik berdasarkan kriteria.</p>

                    {/* ── Tipe Dokumen (checkbox style) ── */}
                    <div className="mb-1">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tipe Dokumen</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-4">
                            {TIPE_DOKUMEN_OPTIONS.map(t => (
                                <label
                                    key={t}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                    onClick={() => toggle("tipeDokumen", t)}
                                >
                                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${draft.tipeDokumen.includes(t)
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "border-gray-300 dark:border-gray-600 group-hover:border-emerald-400"
                                        }`}>
                                        {draft.tipeDokumen.includes(t) && (
                                            <Check className="w-2.5 h-2.5 text-white" />
                                        )}
                                    </span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{t}</span>
                                </label>
                            ))}
                        </div>
                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-gray-800 mb-4" />
                    </div>

                    {/* ── Riwayat Penolakan (pill chips) ── */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <RotateCcw className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Riwayat Penolakan</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {RIWAYAT_OPTIONS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => toggle("riwayat", r)}
                                    className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${draft.riwayat.includes(r)
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 bg-white dark:bg-gray-800"
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setDraft(MEMBER_EMPTY_FILTER)}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>
                        <button
                            onClick={() => { onApply(draft); onClose() }}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}



function KycMemberDetailModal({
    member,
    onClose,
    onUpdateStatus,
}: {
    member: KycMember
    onClose: () => void
    onUpdateStatus: (id: number, status: "disetujui" | "ditolak", rejectionReason?: string) => void
}) {
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const statusBadge = STATUS_BADGE[member.status]
    const statusLabel = STATUS_CONFIG[member.status].label.toUpperCase()

    // Status verifikasi card config
    const verifikasiConfig = {
        menunggu: { icon: Clock, cls: "border-amber-200 bg-amber-50 dark:bg-amber-900/20", iconCls: "text-amber-400", label: "Menunggu Persetujuan", sub: "Mohon periksa kelengkapan dokumen." },
        disetujui: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20", iconCls: "text-emerald-500", label: "Dokumen Disetujui", sub: "Verifikasi identitas berhasil." },
        ditolak: { icon: XCircle, cls: "border-red-200 bg-red-50 dark:bg-red-900/20", iconCls: "text-red-400", label: "Dokumen Ditolak", sub: "Dokumen tidak memenuhi syarat." },
    }
    const vConf = verifikasiConfig[member.status]
    const VIcon = vConf.icon

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Panel */}
            <div
                className="relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ maxWidth: "calc(100vw - 80px)", height: "96vh" }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    {/* Left: Avatar + Name */}
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${member.avatarBg} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                            {member.selfieImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={member.selfieImage} alt={member.nama} className="w-full h-full object-cover object-top" />
                            ) : (
                                <span className="text-white text-sm font-bold">{member.avatar}</span>
                            )}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{member.nama}</p>
                    </div>

                    {/* Right: Status Pengajuan + Close */}
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">STATUS PENGAJUAN</p>
                            <div className="flex items-center gap-2 justify-end mt-0.5">
                                <p className="text-sm text-gray-600 dark:text-gray-300">{member.tglPengajuan}</p>
                                <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${statusBadge}`}>
                                    {statusLabel}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left: User Info */}
                    <div
                        className="w-[360px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <div className="p-6">
                            {/* Section header */}
                            <div className="flex items-center gap-2 mb-4">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data &amp; Informasi User</span>
                            </div>

                            {/* Info card — persis MagangHub: card border + divider antar group */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                {/* Nama Lengkap */}
                                <div className="px-4 py-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nama Lengkap</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{member.nama}</p>
                                </div>

                                {/* No. WhatsApp */}
                                {member.noWhatsapp && (
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">No. WhatsApp</p>
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{member.noWhatsapp}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Tempat & Tgl Lahir */}
                                <div className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-800">
                                    <div className="px-4 py-3 border-r border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tempat Lahir</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{member.tempatLahir || "—"}</p>
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tanggal Lahir</p>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-gray-400" />
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{member.tanggalLahir || "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Alamat Domisili */}
                                {member.alamat && (
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Domisili (KTP)</p>
                                        <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{member.alamat}</p>
                                        </div>
                                    </div>
                                )}

                                {/* NIK */}
                                {member.nik && (
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nomor Induk Kependudukan (NIK)</p>
                                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                                            <Hash className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wide">{member.nik}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Tipe Dokumen */}
                                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tipe Dokumen</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">{member.tipeDokumen}</p>
                                </div>
                            </div>

                            {/* Status Verifikasi */}
                            <div className="mt-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Verifikasi</span>
                                </div>
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${vConf.cls}`}>
                                    <VIcon className={`w-5 h-5 flex-shrink-0 ${vConf.iconCls}`} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">{vConf.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{vConf.sub}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Document Images — isi penuh tinggi */}
                    <div className="flex-1 flex gap-5 p-6 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                        {/* Dokumen Asli */}
                        <div className="flex-1 flex flex-col gap-2 min-w-0">
                            <div className="flex items-center gap-2 bg-gray-800 dark:bg-gray-950 text-white text-xs font-semibold px-3 py-1.5 rounded-lg w-fit">
                                <CreditCard className="w-3.5 h-3.5" />
                                Dokumen Asli
                            </div>
                            <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                <KtpCardPreview member={member} />
                            </div>
                        </div>

                        {/* Foto Selfie */}
                        <div className="flex-1 flex flex-col gap-2 min-w-0">
                            <div className="flex items-center gap-2 bg-gray-800 dark:bg-gray-950 text-white text-xs font-semibold px-3 py-1.5 rounded-lg w-fit">
                                <User className="w-3.5 h-3.5" />
                                Foto Selfie
                            </div>
                            <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                <SelfiePlaceholder member={member} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        ID: #{member.id}
                    </span>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded-xl transition-colors">
                            <Flag className="w-3.5 h-3.5" /> Laporkan
                        </button>
                        {member.status !== "ditolak" && (
                            <button
                                onClick={() => { setRejectReason(""); setShowRejectModal(true) }}
                                className="flex items-center gap-2 px-5 py-2 border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold rounded-xl transition-colors"
                            >
                                <XCircle className="w-4 h-4" /> Tolak
                            </button>
                        )}
                        {member.status !== "disetujui" && (
                            <button
                                onClick={() => { onUpdateStatus(member.id, "disetujui"); onClose() }}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Setujui
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Reject Reason Modal ── */}
            {showRejectModal && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-[420px] mx-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Tolak Pengajuan</h3>
                        <p className="text-sm text-gray-500 mb-4">Berikan alasan penolakan untuk <span className="font-semibold text-gray-700 dark:text-gray-300">{member.nama}</span></p>
                        <textarea
                            rows={4}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Contoh: Foto identitas buram atau tidak terbaca."
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                        />
                        <div className="flex gap-2 mt-4 justify-end">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                disabled={!rejectReason.trim()}
                                onClick={() => { onUpdateStatus(member.id, "ditolak", rejectReason); setShowRejectModal(false); onClose() }}
                                className="px-5 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl transition-colors"
                            >
                                Konfirmasi Tolak
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function KycMemberContent() {
    const [activeTab, setActiveTab] = useState<"menunggu" | "disetujui" | "ditolak" | "semua">("menunggu")
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(10)
    const [selectedMember, setSelectedMember] = useState<KycMember | null>(null)
    const [members, setMembers] = useState<KycMember[]>(DATA)
    const [showFilter, setShowFilter] = useState(false)
    const [appliedFilter, setAppliedFilter] = useState<MemberFilterState>(MEMBER_EMPTY_FILTER)

    const handleUpdateStatus = (id: number, status: "disetujui" | "ditolak", rejectionReason?: string) => {
        setMembers(prev => prev.map(m =>
            m.id === id
                ? {
                    ...m,
                    status,
                    ...(rejectionReason ? { rejectionReason } : {}),
                }
                : m
        ))
        setSelectedMember(null)
    }

    const filteredData = useMemo(() => {
        let data = members
        if (activeTab !== "semua") data = data.filter(d => d.status === activeTab)
        if (search.trim()) data = data.filter(d =>
            d.nama.toLowerCase().includes(search.toLowerCase())
        )
        // Tipe Dokumen filter
        if (appliedFilter.tipeDokumen.length > 0) {
            data = data.filter(d => appliedFilter.tipeDokumen.some(t =>
                t === "Kartu Pelajar"
                    ? d.tipeDokumen.toLowerCase().includes("pelajar")
                    : d.tipeDokumen.toUpperCase() === t.toUpperCase()
            ))
        }
        // Riwayat Penolakan filter
        if (appliedFilter.riwayat.length > 0) {
            data = data.filter(d => {
                const rc = d.retryCount
                return appliedFilter.riwayat.some(r =>
                    r === "0x (Baru)" ? rc === 0 :
                        r === "1x Gagal" ? rc === 1 :
                            r === "2-3x Gagal" ? (rc >= 2 && rc <= 3) :
                                r === ">3x Gagal" ? rc > 3 : false
                )
            })
        }
        return data
    }, [activeTab, search, members, appliedFilter])

    const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage))
    const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage)

    const tabCounts = {
        menunggu: members.filter(d => d.status === "menunggu").length,
        disetujui: members.filter(d => d.status === "disetujui").length,
        ditolak: members.filter(d => d.status === "ditolak").length,
        semua: members.length,
    }

    const tabs: { key: typeof activeTab; label: string }[] = [
        { key: "menunggu", label: "Menunggu" },
        { key: "disetujui", label: "Disetujui" },
        { key: "ditolak", label: "Ditolak" },
        { key: "semua", label: "Semua" },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
            {/* Detail Modal */}
            {selectedMember && (
                <KycMemberDetailModal member={selectedMember} onClose={() => setSelectedMember(null)} onUpdateStatus={handleUpdateStatus} />
            )}

            {/* Filter Modal */}
            {showFilter && (
                <MemberFilterModal
                    initial={appliedFilter}
                    onApply={f => { setAppliedFilter(f); setPage(1) }}
                    onClose={() => setShowFilter(false)}
                />
            )}

            <div className="max-w-[1600px] mx-auto">

                {/* ── Search + Filter Bar ── */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama member..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Search className="w-3.5 h-3.5" /> Cari
                    </button>
                    <button
                        onClick={() => setShowFilter(true)}
                        className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${(appliedFilter.tipeDokumen.length + appliedFilter.riwayat.length) > 0
                            ? "border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <Filter className="w-4 h-4" /> Filter
                        {(appliedFilter.tipeDokumen.length + appliedFilter.riwayat.length) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                {appliedFilter.tipeDokumen.length + appliedFilter.riwayat.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Tabs ── */}
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
                            {activeTab === tab.key && tabCounts[tab.key] > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                                    {tabCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Table Card ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 w-[30%]">User</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-[18%]">Tipe Dokumen</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-[18%]">Tgl Pengajuan</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-[18%]">Status</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-[8%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20 text-gray-400 text-sm">
                                            Tidak ada data member ditemukan
                                        </td>
                                    </tr>
                                ) : paginatedData.map(member => {
                                    const status = STATUS_CONFIG[member.status]
                                    const StatusIcon = status.icon
                                    return (
                                        <tr
                                            key={member.id}
                                            onClick={() => setSelectedMember(member)}
                                            className="border-b border-gray-50 dark:border-gray-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer"
                                        >
                                            {/* User */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full ${member.avatarBg} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                                                        {member.selfieImage ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={member.selfieImage}
                                                                alt={member.nama}
                                                                className="w-full h-full object-cover object-top"
                                                            />
                                                        ) : (
                                                            <span className="text-white text-xs font-bold">{member.avatar}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{member.nama}</p>
                                                        {member.retryCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 px-1.5 py-0.5 rounded-full">
                                                                <RefreshCw className="w-2.5 h-2.5" />{member.retryCount}x
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tipe Dokumen */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <CreditCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    {member.tipeDokumen}
                                                </div>
                                            </td>

                                            {/* Tgl Pengajuan */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    {member.tglPengajuan}
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
                                                <AksiDropdown id={member.id} />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Pagination (OUTSIDE the card) ── */}
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

export default function KycMemberPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["common"]}>
                <KycMemberContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
