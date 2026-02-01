"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Plus,
    Search,
    Filter,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    Trash2,
    MapPin,
    Building2,
    RotateCcw,
    X,
    Loader2,
    RefreshCw,
    AlertCircle
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/utils"
import { masterdataApi, CountryData, CountryRequest } from "@/lib/api"
import { toast } from "sonner"

const REGIONS = [
    "All",
    "Africa",
    "Americas",
    "Asia",
    "Europe",
    "Oceania"
]

// Format population number
function formatPopulation(population: number | null | undefined): string {
    if (!population) return "N/A"
    if (population >= 1000000000) {
        return `${(population / 1000000000).toFixed(1)}B`
    }
    if (population >= 1000000) {
        return `${(population / 1000000).toFixed(0)}M`
    }
    if (population >= 1000) {
        return `${(population / 1000).toFixed(0)}K`
    }
    return population.toString()
}

// Extended Country type with states (for UI display)
interface CountryWithStates extends CountryData {
    states?: { id: number; name: string; citiesCount: number }[]
}

export function CountriesManager() {
    const { t } = useI18n()

    // AbortController ref for request cancellation
    const abortControllerRef = useRef<AbortController | null>(null)

    // Data state
    const [countries, setCountries] = useState<CountryWithStates[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // UI states
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRegion, setSelectedRegion] = useState("All")
    const [tempRegion, setTempRegion] = useState("All")
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [expandedCountries, setExpandedCountries] = useState<Set<number>>(new Set())

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(12)
    const [displayMode, setDisplayMode] = useState<'pagination' | 'lazy'>('pagination')
    const [lazyLoadedCount, setLazyLoadedCount] = useState(12)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Form state for create/edit
    const [formData, setFormData] = useState<Partial<CountryRequest>>({
        name: "",
        iso2: "",
        iso3: "",
        phoneCode: "",
        capital: "",
        currency: "",
        region: "",
        subregion: "",
    })
    const [editingCountryId, setEditingCountryId] = useState<number | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ type: 'country' | 'state', id: number, name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fetch countries from API
    const fetchCountries = useCallback(async () => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Create new AbortController
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            const response = await masterdataApi.countries.getAll(
                undefined,
                abortControllerRef.current.signal
            )

            if (response.success && response.data) {
                setCountries(response.data)
            } else {
                // Handle case where response.data is the array directly
                if (Array.isArray(response)) {
                    setCountries(response as CountryWithStates[])
                } else {
                    setError("Failed to load countries data")
                }
            }
        } catch (err) {
            // Don't set error if request was cancelled
            if (err instanceof Error && err.name === 'AbortError') {
                return
            }
            console.error("Error fetching countries:", err)
            setError(err instanceof Error ? err.message : "An error occurred while loading countries")
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial data fetch
    useEffect(() => {
        fetchCountries()

        // Cleanup: cancel request on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [fetchCountries])

    // Filter countries (client-side filtering after API fetch)
    const filteredCountries = useMemo(() => {
        let filtered = [...countries]

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(country =>
                country.name.toLowerCase().includes(query) ||
                (country.iso2?.toLowerCase().includes(query)) ||
                (country.iso3?.toLowerCase().includes(query))
            )
        }

        // Region filter
        if (selectedRegion !== "All") {
            filtered = filtered.filter(country => country.region === selectedRegion)
        }

        return filtered
    }, [countries, searchQuery, selectedRegion])

    // Pagination calculations
    const totalPages = Math.ceil(filteredCountries.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    // Get countries to display based on mode
    const displayedCountries = useMemo(() => {
        if (displayMode === 'lazy') {
            return filteredCountries.slice(0, lazyLoadedCount)
        }
        return filteredCountries.slice(startIndex, endIndex)
    }, [filteredCountries, displayMode, lazyLoadedCount, startIndex, endIndex])

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
        setLazyLoadedCount(12)
    }, [searchQuery, selectedRegion])

    // Lazy loading with Intersection Observer
    useEffect(() => {
        if (displayMode !== 'lazy') return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && lazyLoadedCount < filteredCountries.length) {
                    setLazyLoadedCount(prev => Math.min(prev + 12, filteredCountries.length))
                }
            },
            { threshold: 0.1 }
        )

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current)
        }

        return () => observer.disconnect()
    }, [displayMode, lazyLoadedCount, filteredCountries.length])

    // Pagination handlers
    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    const goToFirstPage = () => goToPage(1)
    const goToLastPage = () => goToPage(totalPages)
    const goToPrevPage = () => goToPage(currentPage - 1)
    const goToNextPage = () => goToPage(currentPage + 1)

    // Toggle country expansion
    const toggleCountryExpand = useCallback((countryId: number) => {
        setExpandedCountries(prev => {
            const next = new Set(prev)
            if (next.has(countryId)) {
                next.delete(countryId)
            } else {
                next.add(countryId)
            }
            return next
        })
    }, [])

    // Filter handlers
    const handleApplyFilter = () => {
        setSelectedRegion(tempRegion)
        setIsFilterModalOpen(false)
    }

    const handleResetFilter = () => {
        setTempRegion("All")
    }

    const handleCancelFilter = () => {
        setTempRegion(selectedRegion)
        setIsFilterModalOpen(false)
    }

    // Create country handler
    const handleCreateCountry = async () => {
        // Validate all required fields
        if (!formData.name || !formData.iso2 || !formData.iso3 || !formData.phoneCode || !formData.currency || !formData.capital || !formData.region) {
            toast.error(t("masterdata.countries.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)
        try {
            const response = await masterdataApi.countries.create(formData as CountryRequest)
            if (response.success || response.data) {
                // Refresh the list after successful creation
                await fetchCountries()
                setIsCreateModalOpen(false) // close modal
                resetForm()
                toast.success(t("masterdata.countries.create_success", "Country created successfully"))
            }
        } catch (err) {
            console.error("Error creating country:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to create country"
            setError(errorMsg)
            toast.error(t("masterdata.countries.create_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Edit country handler
    const handleEditClick = (country: CountryWithStates) => {
        setEditingCountryId(country.id)
        setFormData({
            name: country.name,
            iso2: country.iso2 || "",
            iso3: country.iso3 || "",
            phoneCode: country.phoneCode || "",
            capital: country.capital || "",
            currency: country.currency || "",
            region: country.region || "",
            subregion: country.subregion || "",
            population: country.population,
            latitude: country.latitude,
            longitude: country.longitude,
        })
        setIsEditModalOpen(true)
    }

    const handleUpdateCountry = async () => {
        // Validate all required fields
        if (!editingCountryId || !formData.name || !formData.iso2 || !formData.iso3 || !formData.phoneCode || !formData.currency || !formData.capital || !formData.region) {
            toast.error(t("masterdata.countries.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)
        try {
            const response = await masterdataApi.countries.update(
                editingCountryId,
                formData as CountryRequest
            )
            if (response.success || response.data) {
                await fetchCountries()
                setIsEditModalOpen(false)
                resetForm()
                setEditingCountryId(null)
                toast.success(t("masterdata.countries.update_success", "Country updated successfully"))
            }
        } catch (err) {
            console.error("Error updating country:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to update country"
            setError(errorMsg)
            toast.error(t("masterdata.countries.update_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Delete handlers
    const handleDeleteClick = (type: 'country' | 'state', id: number, name: string) => {
        setItemToDelete({ type, id, name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        setIsDeleting(true)
        const deleteName = itemToDelete.name
        try {
            if (itemToDelete.type === 'country') {
                await masterdataApi.countries.delete(itemToDelete.id)
                await fetchCountries()
                toast.success(t("masterdata.countries.delete_success", `"${deleteName}" deleted successfully`).replace('{name}', deleteName))
            }
            // TODO: Handle state deletion when states API is available
        } catch (err) {
            console.error("Error deleting:", err)
            const errorMsg = err instanceof Error ? err.message : "Failed to delete"
            setError(errorMsg)
            toast.error(t("masterdata.countries.delete_error", errorMsg))
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    // Reset form
    const resetForm = () => {
        setFormData({
            name: "",
            iso2: "",
            iso3: "",
            phoneCode: "",
            capital: "",
            currency: "",
            region: "",
            subregion: "",
        })
    }

    // Get visible states (first 5)
    const getVisibleStates = (states: { id: number; name: string; citiesCount: number }[] | undefined) => {
        return states?.slice(0, 5) || []
    }

    // Render loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading countries...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Render error state
    if (error && countries.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={fetchCountries} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Error Banner (for non-blocking errors) */}
            {error && countries.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Countries
                    </h1>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("common.create", "Create")}
                </Button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex gap-2 sm:gap-3 items-center mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        type="text"
                        placeholder={t("masterdata.countries.search_placeholder", "Search by name, ISO code...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={() => setIsFilterModalOpen(true)}
                    className={cn(
                        "flex items-center gap-2",
                        selectedRegion !== "All" && "border-emerald-500 text-emerald-600"
                    )}
                >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">
                        {selectedRegion !== "All" ? selectedRegion : t("common.filter", "Filter")}
                    </span>
                </Button>
            </div>

            {/* Pagination Info Bar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    {/* Results Count */}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Showing <strong className="text-gray-900 dark:text-white">{displayedCountries.length}</strong> of <strong className="text-gray-900 dark:text-white">{filteredCountries.length}</strong> countries
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Display Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Button
                            variant={displayMode === 'pagination' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setDisplayMode('pagination')}
                            className={cn(
                                "h-7 px-3 text-xs",
                                displayMode === 'pagination' && "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                        >
                            Pages
                        </Button>
                        <Button
                            variant={displayMode === 'lazy' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setDisplayMode('lazy')}
                            className={cn(
                                "h-7 px-3 text-xs",
                                displayMode === 'lazy' && "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                        >
                            Infinite
                        </Button>
                    </div>

                    {/* Items Per Page (only for pagination mode) */}
                    {displayMode === 'pagination' && (
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">6 / page</SelectItem>
                                <SelectItem value="12">12 / page</SelectItem>
                                <SelectItem value="24">24 / page</SelectItem>
                                <SelectItem value="48">48 / page</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Countries List */}
            <div className={displayedCountries.length === 0 ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-6 p-1"}>
                {displayedCountries.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{t("masterdata.countries.no_results", "No countries found")}</p>
                    </div>
                ) : (
                    displayedCountries.map((country) => (
                        <div key={country.id} className="relative group h-full">
                            {/* Main Card Content */}
                            <div className="relative h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                                {/* Card Header with Dark Gradient (like Group Cards) */}
                                <div className="relative bg-gradient-to-r from-[#1a2e35] via-[#1e3a40] to-[#1a2e35] px-5 py-4">
                                    {/* Subtle overlay for extra depth */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />

                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Flag/ISO Badge */}
                                            <div className="w-12 h-12 rounded-full bg-transparent border-2 border-white/30 flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
                                                {country.emoji || country.iso2 || "?"}
                                            </div>
                                            {/* Name & Region */}
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-white truncate text-lg drop-shadow-sm">
                                                    {country.name}
                                                </h3>
                                                <p className="text-sm text-gray-400 truncate">
                                                    {country.region || "Unknown Region"} {country.subregion ? `• ${country.subregion}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditClick(country)}
                                                className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-gray-300 hover:text-white"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick('country', country.id, country.name)}
                                                className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body - Info Grid */}
                                <div className="px-5 py-4 flex-1">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ISO2</p>
                                            <p className="font-mono font-semibold text-gray-900 dark:text-white">{country.iso2 || "-"}</p>
                                        </div>
                                        <div className="border-l border-r border-gray-200 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                                            <p className="font-mono font-semibold text-gray-900 dark:text-white">{country.phoneCode ? `+${country.phoneCode}` : "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Currency</p>
                                            <p className="font-mono font-semibold text-gray-900 dark:text-white">{country.currency || "-"}</p>
                                        </div>
                                    </div>

                                    {/* Additional Info Row */}
                                    <div className="mt-4 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                            <Building2 className="w-4 h-4" />
                                            <span>Capital: <strong className="text-gray-900 dark:text-white">{country.capital || "N/A"}</strong></span>
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-400">
                                            Population: <strong className="text-gray-900 dark:text-white">{formatPopulation(country.population)}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer - Stats Row */}
                                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>{country.statesCount || 0} States</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                                <Building2 className="w-3.5 h-3.5" />
                                                <span>{country.citiesCount || 0} Cities</span>
                                            </div>
                                        </div>

                                        {/* Collapsible States Toggle */}
                                        {country.states && country.states.length > 0 && (
                                            <Collapsible>
                                                <CollapsibleTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-xs"
                                                        onClick={() => toggleCountryExpand(country.id)}
                                                    >
                                                        <span>{expandedCountries.has(country.id) ? "Hide" : "Show"} States</span>
                                                        <ChevronRight className={cn(
                                                            "w-3 h-3 ml-1 transition-transform",
                                                            expandedCountries.has(country.id) && "rotate-90"
                                                        )} />
                                                    </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="mt-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {getVisibleStates(country.states).map((state) => (
                                                            <div
                                                                key={state.id}
                                                                className="flex items-center justify-between px-2 py-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{state.name}</span>
                                                                <span className="text-xs text-gray-400">{state.citiesCount}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls (for pagination mode) */}
            {displayMode === 'pagination' && filteredCountries.length > 0 && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    {/* Page Info */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Page <strong className="text-gray-900 dark:text-white">{currentPage}</strong> of <strong className="text-gray-900 dark:text-white">{totalPages}</strong>
                        <span className="ml-2 text-gray-400">
                            ({startIndex + 1}-{Math.min(endIndex, filteredCountries.length)} of {filteredCountries.length})
                        </span>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-1">
                        {/* First Page */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                            className="h-9 w-9 p-0"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </Button>

                        {/* Previous Page */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPrevPage}
                            disabled={currentPage === 1}
                            className="h-9 w-9 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = currentPage - 2 + i
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => goToPage(pageNum)}
                                        className={cn(
                                            "h-9 w-9 p-0",
                                            currentPage === pageNum && "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        )}
                                    >
                                        {pageNum}
                                    </Button>
                                )
                            })}
                        </div>

                        {/* Next Page */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="h-9 w-9 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>

                        {/* Last Page */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToLastPage}
                            disabled={currentPage === totalPages}
                            className="h-9 w-9 p-0"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Lazy Loading Trigger & Info (for infinite scroll mode) */}
            {displayMode === 'lazy' && (
                <>
                    {lazyLoadedCount < filteredCountries.length && (
                        <div
                            ref={loadMoreRef}
                            className="flex items-center justify-center py-8"
                        >
                            <div className="flex items-center gap-3 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                <span className="text-sm">Loading more countries...</span>
                            </div>
                        </div>
                    )}
                    {lazyLoadedCount >= filteredCountries.length && filteredCountries.length > 0 && (
                        <div className="text-center py-6 text-sm text-gray-500">
                            All {filteredCountries.length} countries loaded
                        </div>
                    )}
                </>
            )}

            {/* Filter Modal */}
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("common.filter", "Filter")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>{t("masterdata.countries.region", "Region")}</Label>
                            <Select value={tempRegion} onValueChange={setTempRegion}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {REGIONS.map((region) => (
                                        <SelectItem key={region} value={region}>
                                            {region}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={handleCancelFilter}>
                            Cancel
                        </Button>
                        <Button onClick={handleApplyFilter} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Country Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Country</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="name">Country Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. Indonesia"
                                />
                            </div>
                            <div>
                                <Label htmlFor="iso2">ISO2 Code *</Label>
                                <Input
                                    id="iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. ID"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <Label htmlFor="iso3">ISO3 Code *</Label>
                                <Input
                                    id="iso3"
                                    value={formData.iso3 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso3: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. IDN"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="phoneCode">Phone Code *</Label>
                                <Input
                                    id="phoneCode"
                                    value={formData.phoneCode || ""}
                                    onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. +62"
                                />
                            </div>
                            <div>
                                <Label htmlFor="currency">Currency *</Label>
                                <Input
                                    id="currency"
                                    value={formData.currency || ""}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. IDR"
                                />
                            </div>
                            <div>
                                <Label htmlFor="capital">Capital *</Label>
                                <Input
                                    id="capital"
                                    value={formData.capital || ""}
                                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. Jakarta"
                                />
                            </div>
                            <div>
                                <Label htmlFor="region">Region *</Label>
                                <Select
                                    value={formData.region || ""}
                                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REGIONS.filter(r => r !== "All").map((region) => (
                                            <SelectItem key={region} value={region}>
                                                {region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="subregion">Subregion</Label>
                                <Input
                                    id="subregion"
                                    value={formData.subregion || ""}
                                    onChange={(e) => setFormData({ ...formData, subregion: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. South-Eastern Asia"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCountry}
                            disabled={!formData.name || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Country
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Country Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Country</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="edit-name">Country Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-iso2">ISO2 Code *</Label>
                                <Input
                                    id="edit-iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-iso3">ISO3 Code</Label>
                                <Input
                                    id="edit-iso3"
                                    value={formData.iso3 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso3: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-phoneCode">Phone Code *</Label>
                                <Input
                                    id="edit-phoneCode"
                                    value={formData.phoneCode || ""}
                                    onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-currency">Currency *</Label>
                                <Input
                                    id="edit-currency"
                                    value={formData.currency || ""}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-capital">Capital *</Label>
                                <Input
                                    id="edit-capital"
                                    value={formData.capital || ""}
                                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-region">Region *</Label>
                                <Select
                                    value={formData.region || ""}
                                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REGIONS.filter(r => r !== "All").map((region) => (
                                            <SelectItem key={region} value={region}>
                                                {region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="edit-subregion">Subregion</Label>
                                <Input
                                    id="edit-subregion"
                                    value={formData.subregion || ""}
                                    onChange={(e) => setFormData({ ...formData, subregion: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsEditModalOpen(false); resetForm(); setEditingCountryId(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateCountry}
                            disabled={!formData.name || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {itemToDelete?.type === 'country'
                                ? t("masterdata.countries.delete_country_title", "Delete Country")
                                : t("masterdata.countries.delete_state_title", "Delete State")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("masterdata.countries.delete_confirm", `Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
