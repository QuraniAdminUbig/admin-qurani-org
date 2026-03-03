"use client"

import { useState, useMemo, useEffect } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ChevronLeft, ChevronRight, Receipt, Plus, Pencil, Trash2,
    CheckCircle2, XCircle, ChevronsUpDown, Globe, Percent,
    ToggleLeft, ToggleRight, BookOpen, Filter,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── Dummy Data ──────────────────────────────────────────────────────────────────
const DUMMY_TAX_RATES = [
    { id: 1, code: "PPN-ID-11", name: "PPN Indonesia 11%", countryCode: "ID", country: "Indonesia", type: "vat", rate: 11, isDefault: true, isActive: true, description: "Pajak Pertambahan Nilai Indonesia", createdAt: "2025-01-01T00:00:00Z" },
    { id: 2, code: "PPH-ID-2.5", name: "PPh Final 2.5%", countryCode: "ID", country: "Indonesia", type: "income", rate: 2.5, isDefault: false, isActive: true, description: "Pajak Penghasilan Final untuk guru/pelatih", createdAt: "2025-01-01T00:00:00Z" },
    { id: 3, code: "GST-MY-6", name: "GST Malaysia 6%", countryCode: "MY", country: "Malaysia", type: "gst", rate: 6, isDefault: true, isActive: true, description: "Goods and Services Tax Malaysia", createdAt: "2025-03-01T00:00:00Z" },
    { id: 4, code: "VAT-EG-14", name: "VAT Egypt 14%", countryCode: "EG", country: "Egypt", type: "vat", rate: 14, isDefault: true, isActive: true, description: "Value Added Tax Egypt", createdAt: "2025-04-01T00:00:00Z" },
    { id: 5, code: "GST-SG-9", name: "GST Singapore 9%", countryCode: "SG", country: "Singapore", type: "gst", rate: 9, isDefault: true, isActive: false, description: "GST rate Singapore (inactive)", createdAt: "2025-06-01T00:00:00Z" },
    { id: 6, code: "VAT-SA-15", name: "VAT Saudi Arabia 15%", countryCode: "SA", country: "Saudi Arabia", type: "vat", rate: 15, isDefault: true, isActive: true, description: "VAT Saudi Arabia - zakat exemption applies", createdAt: "2025-07-01T00:00:00Z" },
    { id: 7, code: "ZERO-ID", name: "Zero Rate (Exempt)", countryCode: "ID", country: "Indonesia", type: "exempt", rate: 0, isDefault: false, isActive: true, description: "Bebas pajak - layanan pendidikan Al-Quran", createdAt: "2025-01-15T00:00:00Z" },
    { id: 8, code: "VAT-TR-20", name: "VAT Turkey 20%", countryCode: "TR", country: "Turkey", type: "vat", rate: 20, isDefault: true, isActive: true, description: "Value Added Tax Turkey", createdAt: "2025-09-01T00:00:00Z" },
]

type TaxType = "all" | "vat" | "gst" | "income" | "exempt"
type SortField = "code" | "rate" | "country" | "createdAt"
const PAGE_SIZE = 8

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

type TaxRate = typeof DUMMY_TAX_RATES[0] & { _deleted?: boolean }

interface TaxFormState {
    code: string
    name: string
    countryCode: string
    country: string
    type: string
    rate: string
    isActive: boolean
    description: string
}

const EMPTY_FORM: TaxFormState = {
    code: "", name: "", countryCode: "", country: "", type: "vat",
    rate: "", isActive: true, description: ""
}

// ── Tax Form Modal ─────────────────────────────────────────────────────────────
function TaxFormModal({ open, editItem, onSave, onClose }: {
    open: boolean
    editItem: TaxRate | null
    onSave: (form: TaxFormState, isEdit: boolean) => void
    onClose: () => void
}) {
    const [form, setForm] = useState<TaxFormState>(EMPTY_FORM)

    useEffect(() => {
        if (editItem) {
            setForm({
                code: editItem.code, name: editItem.name, countryCode: editItem.countryCode,
                country: editItem.country, type: editItem.type, rate: String(editItem.rate),
                isActive: editItem.isActive, description: editItem.description,
            })
        } else {
            setForm(EMPTY_FORM)
        }
    }, [editItem, open])

    if (!open) return null
    function f(k: keyof TaxFormState, v: string | boolean) { setForm(p => ({ ...p, [k]: v })) }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {editItem ? "Edit Tax Rate" : "Tambah Tax Rate Baru"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kode Pajak *</label>
                            <input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())}
                                placeholder="PPN-ID-11"
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Pajak</label>
                            <select value={form.type} onChange={e => f("type", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white">
                                <option value="vat">VAT (PPn)</option>
                                <option value="gst">GST</option>
                                <option value="income">PPh (Income)</option>
                                <option value="exempt">Exempt (0%)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Tax Rate *</label>
                        <input value={form.name} onChange={e => f("name", e.target.value)}
                            placeholder="PPN Indonesia 11%"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kode Negara *</label>
                            <input value={form.countryCode} onChange={e => f("countryCode", e.target.value.toUpperCase())}
                                placeholder="ID, MY, SG..."
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Negara *</label>
                            <input value={form.country} onChange={e => f("country", e.target.value)}
                                placeholder="Indonesia, Malaysia..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tarif Pajak (%) *</label>
                        <div className="relative">
                            <input type="number" step="0.1" min="0" max="100" value={form.rate} onChange={e => f("rate", e.target.value)}
                                placeholder="11"
                                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                        <textarea value={form.description} onChange={e => f("description", e.target.value)}
                            rows={2} placeholder="Keterangan pajak..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white resize-none" />
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => f("isActive", !form.isActive)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                            </button>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Aktif</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={() => onSave(form, !!editItem)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">
                        {editItem ? "Simpan Perubahan" : "Tambah Tax Rate"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Confirm Modal ───────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel }: {
    open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{message}</p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Hapus</button>
                </div>
            </div>
        </div>
    )
}

// ── Main Content ────────────────────────────────────────────────────────────────
function TaxRatesContent() {
    const [rates, setRates] = useState<TaxRate[]>(DUMMY_TAX_RATES)
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<TaxType>("all")
    const [showInactive, setShowInactive] = useState(false)
    const [sortField, setSortField] = useState<SortField>("country")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)
    const [formOpen, setFormOpen] = useState(false)
    const [editItem, setEditItem] = useState<TaxRate | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<TaxRate | null>(null)

    const liveRates = rates.filter(r => !r._deleted)

    const stats = useMemo(() => ({
        total: liveRates.length,
        active: liveRates.filter(r => r.isActive).length,
        countries: new Set(liveRates.map(r => r.countryCode)).size,
    }), [liveRates])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return liveRates
            .filter(r => {
                const matchSearch = !q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.country.toLowerCase().includes(q) || r.countryCode.toLowerCase().includes(q)
                const matchType = typeFilter === "all" || r.type === typeFilter
                const matchActive = showInactive ? true : r.isActive
                return matchSearch && matchType && matchActive
            })
            .sort((a, b) => {
                let av: string | number = a.country
                let bv: string | number = b.country
                if (sortField === "code") { av = a.code; bv = b.code }
                else if (sortField === "rate") { av = a.rate; bv = b.rate }
                else if (sortField === "createdAt") { av = a.createdAt; bv = b.createdAt }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? av - (bv as number) : (bv as number) - av
            })
    }, [liveRates, search, typeFilter, showInactive, sortField, sortDir])

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

    const typeColorMap: Record<string, string> = {
        vat: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        gst: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
        income: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        exempt: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    }
    const typeLabelMap: Record<string, string> = { vat: "VAT", gst: "GST", income: "PPh", exempt: "Exempt" }

    function handleSaveForm(form: TaxFormState, isEdit: boolean) {
        if (!form.code || !form.name || !form.countryCode || !form.country || form.rate === "") {
            showToast({ type: "info", title: "Form tidak lengkap", message: "Semua field bertanda * wajib diisi." })
            return
        }
        if (isEdit && editItem) {
            setRates(prev => prev.map(r => r.id === editItem.id ? {
                ...r, code: form.code, name: form.name, countryCode: form.countryCode,
                country: form.country, type: form.type, rate: Number(form.rate),
                isActive: form.isActive, description: form.description,
            } : r))
            showToast({ type: "success", title: "Tax rate diupdate", message: `${form.code} berhasil diperbarui.`, endpoint: `PUT /api/v1/TaxRates/${editItem.id}` })
        } else {
            const existing = liveRates.find(r => r.code === form.code)
            if (existing) {
                showToast({ type: "info", title: "Kode sudah ada", message: `Kode "${form.code}" sudah digunakan.` })
                return
            }
            const newRate: TaxRate = {
                id: Date.now(), code: form.code, name: form.name, countryCode: form.countryCode,
                country: form.country, type: form.type, rate: Number(form.rate),
                isDefault: false, isActive: form.isActive, description: form.description,
                createdAt: new Date().toISOString(),
            }
            setRates(prev => [newRate, ...prev])
            showToast({ type: "success", title: "Tax rate ditambahkan", message: `${form.code} — ${form.rate}% berhasil ditambahkan.`, endpoint: "POST /api/v1/TaxRates" })
        }
        setFormOpen(false)
        setEditItem(null)
    }

    function handleToggleActive(r: TaxRate) {
        const next = !r.isActive
        setRates(prev => prev.map(x => x.id === r.id ? { ...x, isActive: next } : x))
        showToast({
            type: next ? "success" : "info",
            title: next ? `"${r.code}" diaktifkan` : `"${r.code}" dinonaktifkan`,
            endpoint: next ? `POST /api/v1/TaxRates/${r.id}/activate` : `POST /api/v1/TaxRates/${r.id}/deactivate`
        })
    }


    function handleDelete(r: TaxRate) {
        setRates(prev => prev.map(x => x.id === r.id ? { ...x, _deleted: true } : x))
        setConfirmDelete(null)
        showToast({ type: "error", title: `"${r.code}" dihapus`, message: "Tax rate telah dihapus dari sistem.", endpoint: `DELETE /api/v1/TaxRates/${r.id}` })
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <TaxFormModal open={formOpen} editItem={editItem} onSave={handleSaveForm} onClose={() => { setFormOpen(false); setEditItem(null) }} />
            <ConfirmModal
                open={!!confirmDelete}
                title={`Hapus tax rate "${confirmDelete?.code}"?`}
                message={`Tax rate ${confirmDelete?.name} akan dihapus permanen. Transaksi yang sudah ada tidak akan terpengaruh.`}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
            />

            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Receipt className="w-6 h-6 text-emerald-500" /> Tax Rates
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola tarif pajak per negara untuk marketplace</p>
                    </div>
                    <button onClick={() => { setEditItem(null); setFormOpen(true) }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Tambah Tax Rate

                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Tax Rate", value: stats.total, icon: Receipt, color: "emerald" },
                        { label: "Aktif", value: stats.active, icon: CheckCircle2, color: "blue" },
                        { label: "Negara", value: stats.countries, icon: Globe, color: "violet" },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; icon: string }> = {
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
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
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                        {(["all", "vat", "gst", "income", "exempt"] as TaxType[]).map(t => (
                            <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${typeFilter === t ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400"}`}>
                                {t === "all" ? "Semua Tipe" : typeLabelMap[t]}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowInactive(s => !s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showInactive ? "bg-gray-800 text-white border-gray-700" : "bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700"}`}>
                        <Filter className="w-3 h-3" /> {showInactive ? "Sembunyikan Nonaktif" : "Tampilkan Nonaktif"}
                    </button>
                    <div className="relative flex-1 max-w-md ml-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Cari kode, nama, negara..."
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
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("country")}>
                                        Negara <SortIcon field="country" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("rate")}>
                                        Tarif <SortIcon field="rate" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("createdAt")}>
                                        Tgl Dibuat <SortIcon field="createdAt" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p>Tidak ada tax rate ditemukan</p>
                                    </td></tr>
                                ) : paged.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        {/* Kode */}
                                        <td className="px-4 py-3">
                                            <code className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">{r.code}</code>
                                            <p className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] truncate">{r.description || r.name}</p>
                                        </td>
                                        {/* Tipe */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColorMap[r.type]}`}>
                                                <BookOpen className="w-2.5 h-2.5" />
                                                {typeLabelMap[r.type] || r.type.toUpperCase()}
                                            </span>
                                        </td>
                                        {/* Negara */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center justify-center w-6 h-4 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">{r.countryCode}</span>
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.country}</p>
                                            </div>
                                        </td>
                                        {/* Tarif */}
                                        <td className="px-4 py-3">
                                            <span className="text-base font-bold text-gray-900 dark:text-white">{r.rate}%</span>
                                        </td>

                                        {/* Tgl Dibuat */}
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.isActive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                                {r.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {r.isActive ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        {/* Aksi */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditItem(r); setFormOpen(true) }}
                                                    className="text-blue-500 hover:text-blue-600 transition-colors" title="Edit">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-gray-200 dark:text-gray-700">|</span>
                                                <button onClick={() => handleToggleActive(r)}
                                                    className={`transition-colors ${r.isActive ? "text-orange-500 hover:text-orange-600" : "text-emerald-500 hover:text-emerald-600"}`}
                                                    title={r.isActive ? "Nonaktifkan" : "Aktifkan"}>
                                                    {r.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                                <span className="text-gray-200 dark:text-gray-700">|</span>
                                                <button onClick={() => setConfirmDelete(r)}
                                                    className="text-red-500 hover:text-red-600 transition-colors" title="Hapus">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
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

export default function TaxRatesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <TaxRatesContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
