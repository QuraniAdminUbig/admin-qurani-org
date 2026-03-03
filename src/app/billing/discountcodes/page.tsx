"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ChevronLeft, ChevronRight, Tag, Gift, Percent, Banknote,
    Users, ChevronsUpDown, Sparkles, CheckCircle2, XCircle, Copy,
    ToggleLeft, ToggleRight, Trash2, UserCheck, Plus, Pencil,
    PauseCircle, PlayCircle, Zap, Eye,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}
function isExpired(until: string) { return new Date(until) < new Date() }
function isUpcoming(from: string) { return new Date(from) > new Date() }

// ── Types ──────────────────────────────────────────────────────────────────────
type DiscountCode = typeof dummyData.discountCodes[0] & { _deleted?: boolean }
type FilterStatus = "all" | "active" | "inactive" | "referral"
type FilterType = "all" | "percentage" | "fixed"
type SortField = "code" | "value" | "usageCount" | "validUntil" | "createdAt"

const PAGE_SIZE = 10

interface FormState {
    code: string
    description: string
    type: "percentage" | "fixed"
    value: string
    usageLimit: string
    minOrderAmount: string
    maxDiscountAmount: string
    validFrom: string
    validUntil: string
    isReferral: boolean
}

const EMPTY_FORM: FormState = {
    code: "", description: "", type: "percentage",
    value: "", usageLimit: "100", minOrderAmount: "0",
    maxDiscountAmount: "999999", validFrom: "", validUntil: "",
    isReferral: false,
}

function genId() { return Date.now() }

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, endpoint, onConfirm, onCancel }: {
    open: boolean; title: string; message: string; endpoint: string
    onConfirm: () => void; onCancel: () => void
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{message}</p>

                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Konfirmasi</button>
                </div>
            </div>
        </div>
    )
}

// ── Code Form Modal ────────────────────────────────────────────────────────────
function CodeFormModal({ open, editItem, onSave, onClose }: {
    open: boolean
    editItem: DiscountCode | null
    onSave: (form: FormState, isEdit: boolean) => void
    onClose: () => void
}) {
    const [form, setForm] = useState<FormState>(EMPTY_FORM)

    // sync form when editItem changes
    useMemo(() => {
        if (editItem) {
            setForm({
                code: editItem.code,
                description: editItem.description,
                type: editItem.type as "percentage" | "fixed",
                value: String(editItem.value),
                usageLimit: String(editItem.usageLimit),
                minOrderAmount: String(editItem.minOrderAmount),
                maxDiscountAmount: String(editItem.maxDiscountAmount),
                validFrom: editItem.validFrom.slice(0, 10),
                validUntil: editItem.validUntil.slice(0, 10),
                isReferral: editItem.isReferral,
            })
        } else {
            setForm(EMPTY_FORM)
        }
    }, [editItem, open])

    if (!open) return null

    function f(key: keyof FormState, val: string | boolean) {
        setForm(prev => ({ ...prev, [key]: val }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {editItem ? "Edit Kode Diskon" : "Buat Kode Diskon Baru"}
                        </h3>

                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl font-light">×</button>
                </div>
                <div className="px-6 py-4 space-y-4">
                    {/* Code */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kode *</label>
                        <input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())}
                            placeholder="HEMAT25, RAMADAN2026, dll."
                            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white" />
                    </div>
                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deskripsi *</label>
                        <input value={form.description} onChange={e => f("description", e.target.value)}
                            placeholder="Diskon spesial Ramadan 2026"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white" />
                    </div>
                    {/* Type + Value */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Diskon</label>
                            <select value={form.type} onChange={e => f("type", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white">
                                <option value="percentage">Persentase (%)</option>
                                <option value="fixed">Nominal (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Nilai {form.type === "percentage" ? "(%)" : "(Rp)"}
                            </label>
                            <input type="number" value={form.value} onChange={e => f("value", e.target.value)}
                                placeholder={form.type === "percentage" ? "15" : "50000"}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    {/* Usage Limit */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Batas Pemakaian</label>
                            <input type="number" value={form.usageLimit} onChange={e => f("usageLimit", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min. Order (Rp)</label>
                            <input type="number" value={form.minOrderAmount} onChange={e => f("minOrderAmount", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    {/* Validity */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Dari</label>
                            <input type="date" value={form.validFrom} onChange={e => f("validFrom", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Sampai</label>
                            <input type="date" value={form.validUntil} onChange={e => f("validUntil", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    {/* Referral toggle */}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => f("isReferral", !form.isReferral)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isReferral ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.isReferral ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Kode Referral</span>
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={() => onSave(form, !!editItem)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">
                        {editItem ? "Simpan Perubahan" : "Buat Kode"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Bulk Generate Modal ────────────────────────────────────────────────────────
function BulkModal({ open, onClose, onGenerate }: { open: boolean; onClose: () => void; onGenerate: (prefix: string, count: number, discount: number) => void }) {
    const [prefix, setPrefix] = useState("BULK")
    const [count, setCount] = useState(5)
    const [discount, setDiscount] = useState(10)
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Bulk Generate Kode</h3>

                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Prefix Kode</label>
                        <input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Jumlah Kode</label>
                            <input type="number" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Diskon (%)</label>
                            <input type="number" min={1} max={100} value={discount} onChange={e => setDiscount(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end mt-5">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={() => onGenerate(prefix, count, discount)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors">
                        <Zap className="w-3.5 h-3.5" /> Generate {count} Kode
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Content ───────────────────────────────────────────────────────────────
function DiscountCodesContent() {
    const [codes, setCodes] = useState<DiscountCode[]>(() => dummyData.discountCodes as DiscountCode[])
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
    const [typeFilter, setTypeFilter] = useState<FilterType>("all")
    const [sortField, setSortField] = useState<SortField>("code")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)
    const [copiedId, setCopiedId] = useState<number | null>(null)

    // Modals
    const [formOpen, setFormOpen] = useState(false)
    const [editItem, setEditItem] = useState<DiscountCode | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState<DiscountCode | null>(null)

    const liveCodes = codes.filter(c => !c._deleted)

    const stats = useMemo(() => ({
        total: liveCodes.length,
        active: liveCodes.filter(c => c.isActive).length,
        referral: liveCodes.filter(c => c.isReferral).length,
        totalUsage: liveCodes.reduce((s, c) => s + c.usageCount, 0),
    }), [liveCodes])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return liveCodes
            .filter(c => {
                const matchSearch = !q || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || (c.trainerName?.toLowerCase().includes(q) ?? false)
                const matchStatus = statusFilter === "all" || (statusFilter === "active" && c.isActive) || (statusFilter === "inactive" && !c.isActive) || (statusFilter === "referral" && c.isReferral)
                const matchType = typeFilter === "all" || c.type === typeFilter
                return matchSearch && matchStatus && matchType
            })
            .sort((a, b) => {
                let av: number | string = a.code
                let bv: number | string = b.code
                if (sortField === "value") { av = a.value; bv = b.value }
                else if (sortField === "usageCount") { av = a.usageCount; bv = b.usageCount }
                else if (sortField === "validUntil") { av = a.validUntil; bv = b.validUntil }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [liveCodes, search, statusFilter, typeFilter, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function handleSort(f: SortField) {
        if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(f); setSortDir("asc") }
        setPage(1)
    }
    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-40 inline-block" />
        return <span className="ml-0.5 text-emerald-500 inline-block">{sortDir === "asc" ? "↑" : "↓"}</span>
    }
    function handleCopy(id: number, code: string) {
        navigator.clipboard.writeText(code)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1500)
    }
    function getCodeStatus(c: DiscountCode) {
        if (!c.isActive) return { label: "Nonaktif", color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" }
        if (isExpired(c.validUntil)) return { label: "Kedaluwarsa", color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" }
        if (isUpcoming(c.validFrom)) return { label: "Terjadwal", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" }
        if (c.usageCount >= c.usageLimit) return { label: "Habis", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" }
        return { label: "Aktif", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" }
    }

    // ── CRUD handlers ──────────────────────────────────────────────────────────
    function handleSaveForm(form: FormState, isEdit: boolean) {
        if (!form.code || !form.value || !form.validFrom || !form.validUntil) {
            showToast({ type: "info", title: "Form tidak lengkap", message: "Kode, nilai, dan tanggal berlaku wajib diisi." })
            return
        }
        if (isEdit && editItem) {
            setCodes(prev => prev.map(c => c.id === editItem.id ? {
                ...c, code: form.code, description: form.description, type: form.type,
                value: Number(form.value), usageLimit: Number(form.usageLimit),
                minOrderAmount: Number(form.minOrderAmount), maxDiscountAmount: Number(form.maxDiscountAmount),
                validFrom: form.validFrom, validUntil: form.validUntil, isReferral: form.isReferral,
            } : c))
            showToast({ type: "success", title: "Kode berhasil diupdate", message: `Kode "${form.code}" telah disimpan.`, endpoint: `PUT /api/v1/DiscountCodes/${editItem.id}` })
        } else {
            const existing = liveCodes.find(c => c.code === form.code)
            if (existing) { showToast({ type: "info", title: "Kode sudah ada", message: `"${form.code}" sudah digunakan.` }); return }
            const newCode: DiscountCode = {
                id: genId(), code: form.code, description: form.description,
                type: form.type, value: Number(form.value), usageLimit: Number(form.usageLimit),
                usageCount: 0, minOrderAmount: Number(form.minOrderAmount),
                maxDiscountAmount: Number(form.maxDiscountAmount), validFrom: form.validFrom + "T00:00:00Z",
                validUntil: form.validUntil + "T00:00:00Z", isReferral: form.isReferral,
                isActive: true, createdBy: "Admin", trainerId: null, trainerName: null, campaignId: null,
                createdAt: new Date().toISOString(),
            }
            setCodes(prev => [newCode, ...prev])
            showToast({ type: "success", title: "Kode berhasil dibuat", message: `"${form.code}" ditambahkan ke daftar.`, endpoint: "POST /api/v1/DiscountCodes" })
        }
        setFormOpen(false)
        setEditItem(null)
    }

    function handleToggle(c: DiscountCode) {
        const next = !c.isActive
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, isActive: next } : x))
        if (next) {
            showToast({ type: "success", title: `Kode "${c.code}" diaktifkan`, endpoint: `POST /api/v1/DiscountCodes/${c.id}/activate` })
        } else {
            showToast({ type: "info", title: `Kode "${c.code}" dijeda`, endpoint: `POST /api/v1/DiscountCodes/${c.id}/pause` })
        }
    }

    function handleDelete(c: DiscountCode) {
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, _deleted: true } : x))
        setConfirmDelete(null)
        showToast({ type: "error", title: `Kode "${c.code}" dihapus`, message: "Data kode telah dihapus dari sistem.", endpoint: `DELETE /api/v1/DiscountCodes/${c.id}` })
    }

    function handleBulkGenerate(prefix: string, count: number, discount: number) {
        const now = new Date()
        const until = new Date(now); until.setMonth(until.getMonth() + 3)
        const generated: DiscountCode[] = Array.from({ length: count }, (_, i) => ({
            id: genId() + i, code: `${prefix}${String(i + 1).padStart(3, "0")}`,
            description: `Kode bulk generate — diskon ${discount}%`, type: "percentage" as const,
            value: discount, usageLimit: 50, usageCount: 0, minOrderAmount: 0, maxDiscountAmount: 999999,
            validFrom: now.toISOString(), validUntil: until.toISOString(), isReferral: false,
            isActive: true, createdBy: "Admin (Bulk)", trainerId: null, trainerName: null, campaignId: `BULK-${prefix}`,
            createdAt: now.toISOString(),
        }))
        setCodes(prev => [...generated, ...prev])
        setBulkOpen(false)
        showToast({ type: "success", title: `${count} kode berhasil digenerate`, message: `Prefix: ${prefix} — Diskon ${discount}%`, endpoint: "POST /api/v1/DiscountCodes/bulk-generate" })
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <ConfirmModal
                open={!!confirmDelete}
                title={`Hapus kode "${confirmDelete?.code}"?`}
                message="Kode yang sudah dihapus tidak bisa dikembalikan. Pengguna yang belum memakai kode ini tidak bisa menggunakannya lagi."
                endpoint={`DELETE /api/v1/DiscountCodes/${confirmDelete?.id}`}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
            />
            <CodeFormModal open={formOpen} editItem={editItem} onSave={handleSaveForm} onClose={() => { setFormOpen(false); setEditItem(null) }} />
            <BulkModal open={bulkOpen} onClose={() => setBulkOpen(false)} onGenerate={handleBulkGenerate} />

            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discounts Codes</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setBulkOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors">
                            <Zap className="w-3.5 h-3.5" /> Bulk Generate
                        </button>
                        <button onClick={() => { setEditItem(null); setFormOpen(true) }}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Buat Kode Baru
                        </button>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Kode", value: stats.total, icon: Tag, color: "violet" },
                        { label: "Aktif", value: stats.active, icon: CheckCircle2, color: "emerald" },
                        { label: "Kode Referral", value: stats.referral, icon: Gift, color: "purple" },
                        { label: "Total Pemakaian", value: stats.totalUsage, icon: Users, color: "blue" },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; icon: string }> = {
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            purple: { bg: "bg-purple-100 dark:bg-purple-900/20", icon: "text-purple-600 dark:text-purple-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                        }
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-9 h-9 rounded-lg ${clr[card.color].bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${clr[card.color].icon}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {(["all", "active", "inactive", "referral"] as FilterStatus[]).map(s => {
                            const label = s === "all" ? "Semua" : s === "active" ? "Aktif" : s === "inactive" ? "Nonaktif" : "Referral"
                            const active = statusFilter === s
                            return (
                                <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${active ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}>
                                    {s === "all" && <Sparkles className="w-3.5 h-3.5" />}
                                    {s === "referral" && <Gift className="w-3.5 h-3.5" />}
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {(["all", "percentage", "fixed"] as FilterType[]).map(t => {
                            const label = t === "all" ? "Semua Tipe" : t === "percentage" ? "Persentase (%)" : "Nominal (Rp)"
                            const active = typeFilter === t
                            return (
                                <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${active ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}>
                                    {t === "percentage" && <Percent className="w-3 h-3" />}
                                    {t === "fixed" && <Banknote className="w-3 h-3" />}
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative flex-1 max-w-md ml-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Cari kode, deskripsi, guru..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("code")}>
                                        Kode <SortIcon field="code" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Tipe</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("value")}>
                                        Nilai <SortIcon field="value" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("usageCount")}>
                                        Pemakaian <SortIcon field="usageCount" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("createdAt")}>
                                        Tgl Dibuat <SortIcon field="createdAt" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("validUntil")}>
                                        Berlaku s/d <SortIcon field="validUntil" />
                                    </th>

                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada kode diskon ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(c => {
                                    const st = getCodeStatus(c)
                                    const usagePercent = Math.min(100, Math.round((c.usageCount / c.usageLimit) * 100))
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            {/* Kode */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">{c.code}</code>
                                                    <button onClick={() => handleCopy(c.id, c.code)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-500 transition-all" title="Salin kode">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    {copiedId === c.id && <span className="text-[10px] text-emerald-500 font-semibold animate-pulse">Disalin!</span>}
                                                </div>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[220px] truncate">{c.description}</p>

                                            </td>
                                            {/* Tipe */}
                                            <td className="px-4 py-3">
                                                {c.isReferral ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"><Gift className="w-2.5 h-2.5" /> Referral</span>
                                                ) : c.type === "percentage" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"><Percent className="w-2.5 h-2.5" /> Persen</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Banknote className="w-2.5 h-2.5" /> Nominal</span>
                                                )}
                                            </td>
                                            {/* Nilai */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{c.type === "percentage" ? `${c.value}%` : formatRupiah(c.value)}</p>
                                                {c.minOrderAmount > 0 && <p className="text-[10px] text-gray-400 mt-0.5">Min. {formatRupiah(c.minOrderAmount)}</p>}
                                            </td>
                                            {/* Pemakaian */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 min-w-[60px]">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{c.usageCount}</span>
                                                            <span className="text-[10px] text-gray-400">/{c.usageLimit}</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${usagePercent}%` }} />
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 flex-shrink-0">{usagePercent}%</span>
                                                </div>
                                            </td>
                                            {/* Tgl Dibuat */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.createdAt ? formatDate(c.createdAt) : "-"}</p>
                                            </td>
                                            {/* Berlaku s/d */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatDate(c.validUntil)}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">Dari {formatDate(c.validFrom)}</p>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.color}`}>
                                                    {st.label === "Aktif" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {st.label}
                                                </span>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditItem(c); setFormOpen(true) }}
                                                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium transition-colors" title="Edit">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="text-gray-200 dark:text-gray-700">|</span>
                                                    <button onClick={() => handleToggle(c)}
                                                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${c.isActive ? "text-orange-500 hover:text-orange-600" : "text-emerald-600 hover:text-emerald-700"}`}>
                                                        {c.isActive ? <><PauseCircle className="w-3.5 h-3.5" /> Jeda</> : <><PlayCircle className="w-3.5 h-3.5" /> Aktifkan</>}
                                                    </button>
                                                    <span className="text-gray-200 dark:text-gray-700">|</span>
                                                    <button onClick={() => setConfirmDelete(c)}
                                                        className="text-red-500 hover:text-red-600 dark:text-red-400 transition-colors" title="Hapus">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan {filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                    {p}
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
        </div>
    )
}

export default function DiscountCodesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <DiscountCodesContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
