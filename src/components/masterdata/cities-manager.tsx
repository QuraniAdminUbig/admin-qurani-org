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
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    Trash2,
    MapPin,
    Building2,
    Loader2,
    Filter,
    MoreHorizontal,
    Search,
    AlertCircle,
    RotateCcw,
    X,
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/utils"
import { masterdataApi, CityData, CityRequest, CountryData, StateData } from "@/lib/api"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function CitiesManager() {
    const { t } = useI18n()

    // AbortController ref for request cancellation
    const abortControllerRef = useRef<AbortController | null>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Countries list for dropdown
    const [countries, setCountries] = useState<CountryData[]>([])
    const [isLoadingCountries, setIsLoadingCountries] = useState(true)

    // Data state
    const [cities, setCities] = useState<CityData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter state
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>("ID")
    const [searchQuery, setSearchQuery] = useState<string>("")

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(12)
    const [displayMode, setDisplayMode] = useState<'pagination' | 'lazy'>('pagination')
    const [lazyLoadedCount, setLazyLoadedCount] = useState(12)
    const [serverPage, setServerPage] = useState(1)
    const [hasMoreServerData, setHasMoreServerData] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

    // Temp filter state for modal
    const [tempCountryCode, setTempCountryCode] = useState<string>("ID")
    const [tempStateCode, setTempStateCode] = useState<string>("All")

    // Filter states list (for state dropdown in filter modal)
    const [filterStates, setFilterStates] = useState<StateData[]>([])
    const [isLoadingFilterStates, setIsLoadingFilterStates] = useState(false)

    // Applied filter state
    const [selectedStateCode, setSelectedStateCode] = useState<string>("All")

    // Form state for country/state dropdowns
    const [formStates, setFormStates] = useState<StateData[]>([])
    const [formSelectedCountryCode, setFormSelectedCountryCode] = useState<string>("")
    const [isLoadingFormStates, setIsLoadingFormStates] = useState(false)

    // Form state for create/edit
    const [formData, setFormData] = useState<Partial<CityRequest>>({
        name: "",
        stateId: 0,
        state: "",
        stateCode: "",
        countryId: 0,
        country: "",
        countryCode: "",
    })
    const [editingCityId, setEditingCityId] = useState<number | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // ====== FETCH COUNTRIES LIST (once on mount) ======
    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoadingCountries(true)
            try {
                const response = await masterdataApi.countries.getAll()
                if (response.success && response.data) {
                    const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name))
                    setCountries(sorted)
                }
            } catch (err) {
                console.error("Error fetching countries:", err)
            } finally {
                setIsLoadingCountries(false)
            }
        }
        fetchCountries()
    }, [])

    // ====== FETCH CITIES ======
    const fetchCities = useCallback(async (append = false) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        if (!append) {
            setIsLoading(true)
        } else {
            setIsLoadingMore(true)
        }
        setError(null)

        try {
            const pageToFetch = append ? serverPage : 1

            if (selectedCountryCode && selectedCountryCode !== "All") {
                const response = await masterdataApi.cities.getByCountryCode(
                    selectedCountryCode,
                    pageToFetch,
                    100, // pageSize
                    undefined,
                    abortControllerRef.current.signal
                )

                if (response && response.success && response.data) {
                    let data = response.data as CityData[]

                    // Client-side filter by state if state is selected
                    if (selectedStateCode && selectedStateCode !== "All") {
                        data = data.filter(city => city.stateCode === selectedStateCode)
                    }

                    if (append) {
                        setCities(prev => [...prev, ...data])
                    } else {
                        setCities(data)
                    }
                    setHasMoreServerData(response.data.length >= 100)
                    if (!append) {
                        setServerPage(2)
                    } else {
                        setServerPage(prev => prev + 1)
                    }
                } else {
                    if (!append) setCities([])
                    setHasMoreServerData(false)
                }
            } else {
                // No filter - show empty or fetch all (optional)
                setCities([])
                setHasMoreServerData(false)
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return
            }
            console.error("Error fetching cities:", err)
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [selectedCountryCode, selectedStateCode, serverPage])

    // Initial fetch
    useEffect(() => {
        if (!isLoadingCountries) {
            setServerPage(1)
            setCities([])
            setLazyLoadedCount(12)
            setCurrentPage(1)
            fetchCities(false)
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingCountries, selectedCountryCode, selectedStateCode])

    // ====== PAGINATION / LAZY LOADING ======
    const filteredCities = useMemo(() => {
        return cities
    }, [cities])

    const totalPages = Math.ceil(filteredCities.length / itemsPerPage)

    const displayedCities = useMemo(() => {
        if (displayMode === 'lazy') {
            return filteredCities.slice(0, lazyLoadedCount)
        }
        const startIndex = (currentPage - 1) * itemsPerPage
        return filteredCities.slice(startIndex, startIndex + itemsPerPage)
    }, [filteredCities, displayMode, lazyLoadedCount, currentPage, itemsPerPage])

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
        setLazyLoadedCount(12)
    }, [selectedCountryCode])

    // Lazy loading with Intersection Observer
    useEffect(() => {
        if (displayMode !== 'lazy') return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    // Load more from client cache first
                    if (lazyLoadedCount < filteredCities.length) {
                        setLazyLoadedCount(prev => Math.min(prev + 12, filteredCities.length))
                    }
                    // If near end and server has more, fetch from server
                    else if (hasMoreServerData && !isLoadingMore) {
                        fetchCities(true)
                    }
                }
            },
            { threshold: 0.1 }
        )

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current)
        }

        return () => observer.disconnect()
    }, [displayMode, lazyLoadedCount, filteredCities.length, hasMoreServerData, isLoadingMore, fetchCities])

    // Pagination handlers
    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    const goToFirstPage = () => goToPage(1)
    const goToLastPage = () => goToPage(totalPages)
    const goToPrevPage = () => goToPage(currentPage - 1)
    const goToNextPage = () => goToPage(currentPage + 1)

    // ====== FORM HELPERS ======
    const fetchFormStatesByCountry = useCallback(async (countryCode: string) => {
        if (!countryCode) {
            setFormStates([])
            return
        }

        setIsLoadingFormStates(true)
        try {
            const response = await masterdataApi.states.getByCountryCode(countryCode)
            if (response.success && response.data) {
                const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name))
                setFormStates(sorted)
            } else {
                setFormStates([])
            }
        } catch (err) {
            console.error("Error fetching states:", err)
            setFormStates([])
        } finally {
            setIsLoadingFormStates(false)
        }
    }, [])

    const handleFormCountryChange = (countryCode: string) => {
        const selectedCountry = countries.find(c => c.iso2 === countryCode)
        if (selectedCountry) {
            setFormSelectedCountryCode(countryCode)
            setFormData(prev => ({
                ...prev,
                countryId: selectedCountry.id,
                country: selectedCountry.name,
                countryCode: countryCode,
                // Reset state when country changes
                stateId: 0,
                state: "",
                stateCode: "",
            }))
            fetchFormStatesByCountry(countryCode)
        }
    }

    const handleFormStateChange = (stateId: string) => {
        const selectedState = formStates.find(s => s.id === Number(stateId))
        if (selectedState) {
            setFormData(prev => ({
                ...prev,
                stateId: selectedState.id,
                state: selectedState.name,
                stateCode: selectedState.iso2 || "",
            }))
        }
    }

    // ====== CRUD HANDLERS ======
    const handleCreateCity = async () => {
        if (!formData.name) {
            toast.error(t("masterdata.cities.name_required", "City name is required"))
            return
        }

        setIsSubmitting(true)
        try {
            // Build request payload, only include optional fields if they have values
            const requestData: CityRequest = {
                name: formData.name,
                stateId: formData.stateId || 0,
                state: formData.state || "",
                stateCode: formData.stateCode || "",
                countryId: formData.countryId || 0,
                country: formData.country || "",
                countryCode: formData.countryCode || "",
            }

            // Only send latitude/longitude if user has filled them in
            // API expects integer | string with pattern: ^-?(?:0|[1-9]\d*)$ (integers only)
            // Decimal values like -7.1128 will be rejected by API
            if (formData.latitude && formData.latitude.trim() !== "") {
                requestData.latitude = formData.latitude.trim()
            }
            if (formData.longitude && formData.longitude.trim() !== "") {
                requestData.longitude = formData.longitude.trim()
            }

            console.log("Creating city with data:", JSON.stringify(requestData, null, 2))

            const response = await masterdataApi.cities.create(requestData)
            if (response.success || response.data) {
                fetchCities(false)
                setIsCreateModalOpen(false)
                resetForm()
                toast.success(t("masterdata.cities.create_success", "City created successfully"))
            }
        } catch (err) {
            console.error("Error creating city:", err)
            toast.error(t("masterdata.cities.create_error", "Failed to create city"))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditClick = (city: CityData) => {
        setEditingCityId(city.id)
        setFormData({
            name: city.name,
            stateId: city.stateId,
            state: city.state,
            stateCode: city.stateCode,
            countryId: city.countryId,
            country: city.country,
            countryCode: city.countryCode,
            latitude: city.latitude !== undefined ? String(city.latitude) : undefined,
            longitude: city.longitude !== undefined ? String(city.longitude) : undefined,
            population: city.population,
            timezone: city.timezone,
        })
        // Set country code for dropdown and fetch states
        if (city.countryCode) {
            setFormSelectedCountryCode(city.countryCode)
            fetchFormStatesByCountry(city.countryCode)
        }
        setIsEditModalOpen(true)
    }

    const handleUpdateCity = async () => {
        if (!editingCityId || !formData.name) {
            toast.error(t("masterdata.cities.name_required", "City name is required"))
            return
        }

        setIsSubmitting(true)
        try {
            // Build request payload, only include optional fields if they have values
            const requestData: CityRequest = {
                name: formData.name,
                stateId: formData.stateId || 0,
                state: formData.state || "",
                stateCode: formData.stateCode || "",
                countryId: formData.countryId || 0,
                country: formData.country || "",
                countryCode: formData.countryCode || "",
            }

            // Only send latitude/longitude if user has filled them in
            // API expects integer | string with pattern: ^-?(?:0|[1-9]\d*)$ (integers only)
            if (formData.latitude && formData.latitude.trim() !== "") {
                requestData.latitude = formData.latitude.trim()
            }
            if (formData.longitude && formData.longitude.trim() !== "") {
                requestData.longitude = formData.longitude.trim()
            }

            console.log("Updating city with data:", JSON.stringify(requestData, null, 2))

            const response = await masterdataApi.cities.update(editingCityId, requestData)
            if (response.success || response.data) {
                fetchCities(false)
                setIsEditModalOpen(false)
                resetForm()
                setEditingCityId(null)
                toast.success(t("masterdata.cities.update_success", "City updated successfully"))
            }
        } catch (err) {
            console.error("Error updating city:", err)
            toast.error(t("masterdata.cities.update_error", "Failed to update city"))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteClick = (id: number, name: string) => {
        setItemToDelete({ id, name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        setIsDeleting(true)
        const deleteName = itemToDelete.name
        try {
            await masterdataApi.cities.delete(itemToDelete.id)
            fetchCities(false)
            toast.success(t("masterdata.cities.delete_success", "City deleted successfully").replace("{name}", deleteName))
        } catch (err) {
            console.error("Error deleting:", err)
            toast.error(t("masterdata.cities.delete_error", "Failed to delete city"))
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            stateId: 0,
            state: "",
            stateCode: "",
            countryId: 0,
            country: "",
            countryCode: "",
            latitude: undefined,
            longitude: undefined,
        })
        setFormSelectedCountryCode("")
        setFormStates([])
    }

    // ====== FILTER HANDLERS ======
    const fetchFilterStatesByCountry = useCallback(async (countryCode: string) => {
        if (!countryCode || countryCode === "All") {
            setFilterStates([])
            return
        }

        setIsLoadingFilterStates(true)
        try {
            const response = await masterdataApi.states.getByCountryCode(countryCode)
            if (response.success && response.data) {
                const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name))
                setFilterStates(sorted)
            } else {
                setFilterStates([])
            }
        } catch (err) {
            console.error("Error fetching filter states:", err)
            setFilterStates([])
        } finally {
            setIsLoadingFilterStates(false)
        }
    }, [])

    const handleFilterCountryChange = (countryCode: string) => {
        setTempCountryCode(countryCode)
        setTempStateCode("All") // Reset state when country changes
        if (countryCode && countryCode !== "All") {
            fetchFilterStatesByCountry(countryCode)
        } else {
            setFilterStates([])
        }
    }

    const handleApplyFilter = () => {
        setSelectedCountryCode(tempCountryCode)
        setSelectedStateCode(tempStateCode)
        setIsFilterModalOpen(false)
        setCurrentPage(1)
    }

    const handleResetFilter = () => {
        setTempCountryCode("All")
        setTempStateCode("All")
        setSelectedCountryCode("All")
        setSelectedStateCode("All")
        setFilterStates([])
        setIsFilterModalOpen(false)
        setCurrentPage(1)
    }

    const handleCancelFilter = () => {
        setTempCountryCode(selectedCountryCode)
        setTempStateCode(selectedStateCode)
        setIsFilterModalOpen(false)
    }

    const handleOpenFilterModal = () => {
        setTempCountryCode(selectedCountryCode)
        setTempStateCode(selectedStateCode)
        // Fetch states if country is selected
        if (selectedCountryCode && selectedCountryCode !== "All") {
            fetchFilterStatesByCountry(selectedCountryCode)
        }
        setIsFilterModalOpen(true)
    }

    // ====== RENDER ======

    if (isLoadingCountries) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">{t("masterdata.cities.loading", "Loading...")}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error && cities.length === 0 && !isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={() => fetchCities(false)} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t("common.try_again", "Try Again")}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Error Banner */}
            {error && cities.length > 0 && (
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t("masterdata.cities.title", "Cities")}
                    </h1>
                </div>
                <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("common.create", "Create")}
                </Button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
                {/* Search Input */}
                <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by city name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    />
                </div>

                {/* Filter Button */}
                <Button
                    variant="outline"
                    onClick={handleOpenFilterModal}
                    className={cn(
                        "flex items-center gap-2 shrink-0",
                        (selectedCountryCode && selectedCountryCode !== "All") && "border-emerald-500 text-emerald-600"
                    )}
                >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">
                        {selectedCountryCode && selectedCountryCode !== "All"
                            ? (() => {
                                const countryName = countries.find(c => c.iso2 === selectedCountryCode)?.name || selectedCountryCode
                                if (selectedStateCode && selectedStateCode !== "All") {
                                    return `${countryName} - ${selectedStateCode}`
                                }
                                return countryName
                            })()
                            : t("common.filter", "Filter")}
                    </span>
                </Button>
            </div>

            {/* Info Bar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </span>
                        ) : (
                            <>
                                {t("masterdata.cities.showing", "Showing")}{" "}
                                <strong className="text-gray-900 dark:text-white">{displayedCities.length}</strong>{" "}
                                {t("masterdata.cities.of", "of")}{" "}
                                <strong className="text-gray-900 dark:text-white">{filteredCities.length}</strong>{" "}
                                {t("masterdata.cities.cities", "cities")}
                                {hasMoreServerData && <span className="text-emerald-600 ml-1">+</span>}
                            </>
                        )}
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

                    {/* Items Per Page */}
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

            {/* Cities Grid */}
            {/* Cities Table */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {isLoading && cities.length === 0 ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                        <p className="text-gray-500">Loading cities...</p>
                    </div>
                ) : displayedCities.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{t("masterdata.cities.no_results", "No cities found")}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <TableHead className="w-12">
                                    <Checkbox />
                                </TableHead>
                                <TableHead className="min-w-[200px]">City Name</TableHead>
                                <TableHead className="w-[150px]">State/Province</TableHead>
                                <TableHead className="w-[150px]">Country</TableHead>
                                <TableHead className="w-40">Coordinates</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCities.map((city) => (
                                <TableRow
                                    key={city.id}
                                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                >
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                {city.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {city.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400">
                                        {city.stateCode || "—"}
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400">
                                        {city.countryCode || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {city.latitude && city.longitude ? (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded w-fit">
                                                <MapPin className="w-3 h-3" />
                                                <span>{city.latitude.toFixed(4)}, {city.longitude.toFixed(4)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(city)}>
                                                    <Pencil className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteClick(city.id, city.name)}
                                                    className="text-red-600 dark:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination Controls */}
            {displayMode === 'pagination' && filteredCities.length > 0 && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Page <strong className="text-gray-900 dark:text-white">{currentPage}</strong> of <strong className="text-gray-900 dark:text-white">{totalPages}</strong>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1} className="h-9 w-9 p-0">
                            <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage === 1} className="h-9 w-9 p-0">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

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

                        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="h-9 w-9 p-0">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages} className="h-9 w-9 p-0">
                            <ChevronsRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Lazy Loading Trigger */}
            {displayMode === 'lazy' && (
                <>
                    {(lazyLoadedCount < filteredCities.length || hasMoreServerData) && (
                        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                            <div className="flex items-center gap-3 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                <span className="text-sm">{t("masterdata.cities.load_more", "Loading more cities...")}</span>
                            </div>
                        </div>
                    )}
                    {lazyLoadedCount >= filteredCities.length && !hasMoreServerData && filteredCities.length > 0 && (
                        <div className="text-center py-6 text-sm text-gray-500">
                            {t("masterdata.cities.all_loaded", "All cities loaded")} ({filteredCities.length})
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
                        {/* Country Dropdown */}
                        <div>
                            <Label>Country</Label>
                            <Select value={tempCountryCode} onValueChange={handleFilterCountryChange}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Countries</SelectItem>
                                    {countries.map((country) => (
                                        <SelectItem key={country.id} value={country.iso2 || country.id.toString()}>
                                            {country.emoji && <span className="mr-2">{country.emoji}</span>}
                                            {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* State Dropdown */}
                        <div>
                            <Label>State/Province</Label>
                            <Select
                                value={tempStateCode}
                                onValueChange={setTempStateCode}
                                disabled={!tempCountryCode || tempCountryCode === "All" || isLoadingFilterStates}
                            >
                                <SelectTrigger className="mt-1.5">
                                    {isLoadingFilterStates ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        <SelectValue placeholder="Select State/Province" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All States/Provinces</SelectItem>
                                    {filterStates.map((state) => (
                                        <SelectItem key={state.id} value={state.iso2 || state.id.toString()}>
                                            {state.name} {state.iso2 ? `(${state.iso2})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {tempCountryCode === "All" && (
                                <p className="text-xs text-gray-500 mt-1">Select a country first</p>
                            )}
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

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.cities.create_city", "Create New City")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* City Name */}
                        <div>
                            <Label htmlFor="name">City Name *</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1.5"
                                placeholder="e.g. Jakarta"
                            />
                        </div>

                        {/* Country Dropdown */}
                        <div>
                            <Label>Country *</Label>
                            <Select
                                value={formSelectedCountryCode}
                                onValueChange={handleFormCountryChange}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {countries.map((country) => (
                                        <SelectItem key={country.id} value={country.iso2 || ""}>
                                            {country.emoji} {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* State Dropdown */}
                        <div>
                            <Label>State/Province *</Label>
                            <Select
                                value={formData.stateId?.toString() || ""}
                                onValueChange={handleFormStateChange}
                                disabled={!formSelectedCountryCode || isLoadingFormStates}
                            >
                                <SelectTrigger className="mt-1.5">
                                    {isLoadingFormStates ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        <SelectValue placeholder="Select State/Province" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {formStates.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            {formSelectedCountryCode ? "No states available" : "Select country first"}
                                        </SelectItem>
                                    ) : (
                                        formStates.map((state) => (
                                            <SelectItem key={state.id} value={state.id.toString()}>
                                                {state.name} {state.iso2 ? `(${state.iso2})` : ""}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Coordinates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="text"
                                    value={formData.latitude || ""}
                                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. -7.1128"
                                />
                            </div>
                            <div>
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="text"
                                    value={formData.longitude || ""}
                                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. 112.1635"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCity}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create City
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.cities.edit_city", "Edit City")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* City Name */}
                        <div>
                            <Label htmlFor="edit-name">City Name *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>

                        {/* Country Dropdown */}
                        <div>
                            <Label>Country *</Label>
                            <Select
                                value={formSelectedCountryCode}
                                onValueChange={handleFormCountryChange}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {countries.map((country) => (
                                        <SelectItem key={country.id} value={country.iso2 || ""}>
                                            {country.emoji} {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* State Dropdown */}
                        <div>
                            <Label>State/Province *</Label>
                            <Select
                                value={formData.stateId?.toString() || ""}
                                onValueChange={handleFormStateChange}
                                disabled={!formSelectedCountryCode || isLoadingFormStates}
                            >
                                <SelectTrigger className="mt-1.5">
                                    {isLoadingFormStates ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        <SelectValue placeholder="Select State/Province" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {formStates.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            {formSelectedCountryCode ? "No states available" : "Select country first"}
                                        </SelectItem>
                                    ) : (
                                        formStates.map((state) => (
                                            <SelectItem key={state.id} value={state.id.toString()}>
                                                {state.name} {state.iso2 ? `(${state.iso2})` : ""}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Coordinates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-latitude">Latitude</Label>
                                <Input
                                    id="edit-latitude"
                                    type="text"
                                    value={formData.latitude || ""}
                                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. -7.1128"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-longitude">Longitude</Label>
                                <Input
                                    id="edit-longitude"
                                    type="text"
                                    value={formData.longitude || ""}
                                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value || undefined })}
                                    className="mt-1.5"
                                    placeholder="e.g. 112.1635"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateCity}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update City
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("masterdata.cities.delete_city_title", "Delete City")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("masterdata.cities.delete_confirm", "Are you sure you want to delete")} <strong>{itemToDelete?.name}</strong>? {t("masterdata.cities.delete_warning", "This action cannot be undone.")}
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
