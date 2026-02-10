"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useI18n } from "@/components/providers/i18n-provider"
import { masterdataApi, StateData, StateRequest, CountryData, CountriesApiResponse } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    Plus,
    Pencil,
    Trash2,
    Filter,
    Loader2,
    Building2,
    Search,
    MoreHorizontal,
    AlertCircle,
    MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Items per page options
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

// State types for filtering
const STATE_TYPES = [
    "All",
    "State",
    "Province",
    "Region",
    "Territory",
    "District",
    "Department",
    "Prefecture",
    "County",
    "Municipality"
]

export function StatesManager() {
    const { t } = useI18n()

    // Data states
    const [states, setStates] = useState<StateData[]>([])
    const [countries, setCountries] = useState<CountryData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filter states
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>("all")
    const [selectedType, setSelectedType] = useState<string>("All")

    // Search states
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [searchResults, setSearchResults] = useState<StateData[] | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const searchAbortRef = useRef<AbortController | null>(null)

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(12)
    const [paginationMode, setPaginationMode] = useState<'pages' | 'infinite'>('pages')
    const [lazyLoadedCount, setLazyLoadedCount] = useState(12)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null)

    // Form states
    const [editingStateId, setEditingStateId] = useState<number | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<Partial<StateRequest>>({
        name: "",
        countryId: 0,
        country: "",
        countryCode: "",
        iso2: "",
        type: "",
    })

    // Temporary filter states
    const [tempCountryCode, setTempCountryCode] = useState<string>("all")
    const [tempType, setTempType] = useState<string>("All")

    // Refs
    const abortControllerRef = useRef<AbortController | null>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)



    // Reset form
    const resetForm = useCallback(() => {
        setFormData({
            name: "",
            countryId: 0,
            country: "",
            countryCode: "",
            iso2: "",
            type: "",
        })
    }, [])

    // Fetch countries for dropdown
    const fetchCountries = useCallback(async () => {
        try {
            const response = await masterdataApi.countries.getAll()
            if (response && response.success && response.data) {
                setCountries(response.data)
            }
        } catch (err) {
            console.error("Failed to fetch countries:", err)
        }
    }, [])

    // Fetch states
    const fetchStates = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            let response

            if (selectedCountryCode && selectedCountryCode !== "all") {
                // Filter by country
                response = await masterdataApi.states.getByCountryCode(
                    selectedCountryCode,
                    undefined,
                    abortControllerRef.current.signal
                )
            } else {
                // Get all
                response = await masterdataApi.states.getAll(
                    { page: 1, pageSize: 100 },
                    undefined,
                    abortControllerRef.current.signal
                )
            }

            if (response && response.success && response.data) {
                setStates(response.data)
            } else {
                setStates([])
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return
            }
            const errorMsg = err instanceof Error ? err.message : "Failed to fetch states"
            setError(errorMsg)
            console.error("Failed to fetch states:", err)
        } finally {
            setIsLoading(false)
        }
    }, [selectedCountryCode, countries])

    // Initial data load - fetch both countries and states on mount
    useEffect(() => {
        fetchCountries()
        fetchStates()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Refetch states when filter changes
    useEffect(() => {
        // Skip initial render
        if (selectedCountryCode !== "all") {
            fetchStates()
        }
    }, [selectedCountryCode, fetchStates])

    // Search states using API with debounce
    const searchStates = useCallback(async (keyword: string) => {
        // Cancel any pending search request
        if (searchAbortRef.current) {
            searchAbortRef.current.abort()
        }

        // If keyword is empty or too short, clear search results
        if (!keyword.trim() || keyword.trim().length < 3) {
            setSearchResults(null)
            setIsSearching(false)
            return
        }

        // Create new AbortController for this search
        searchAbortRef.current = new AbortController()
        setIsSearching(true)

        try {
            const response = await masterdataApi.search.states(
                { keyword: keyword.trim(), pageSize: 50 },
                undefined,
                searchAbortRef.current.signal
            )

            // Handle different response formats
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseData = response.data as any

            // Debug: log the response to understand the format
            console.log('[Search States] Response:', { success: response.success, data: responseData })

            let searchItems: StateData[] | null = null

            if (response.success && responseData?.items && Array.isArray(responseData.items)) {
                // Format: { success, data: { items: [...] } }
                searchItems = responseData.items as StateData[]
            } else if (response.success && Array.isArray(responseData)) {
                // Format: { success, data: [...] }
                searchItems = responseData as StateData[]
            } else if (responseData?.items && Array.isArray(responseData.items)) {
                // Format: { data: { items: [...] } } without success field
                searchItems = responseData.items as StateData[]
            }

            // If API returns results, use them. If empty, fallback to client-side filter.
            // This handles cases where API search is too strict (e.g. case-sensitive)
            if (searchItems && searchItems.length > 0) {
                setSearchResults(searchItems)
            } else {
                // API returned empty or unknown format -> fallback to client-side filter
                console.log('[Search States] API returned empty/unknown, using client-side filter')
                setSearchResults(null)
            }
        } catch (err) {
            // Don't set error if request was cancelled
            if (err instanceof Error && err.name === 'AbortError') {
                return
            }
            console.warn('Search error:', err)
            // Fallback to client-side filtering on API error
            setSearchResults(null)
        } finally {
            setIsSearching(false)
        }
    }, [])

    // Debounced search effect
    useEffect(() => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        // Set new timeout for debounced search (500ms)
        searchTimeoutRef.current = setTimeout(() => {
            searchStates(searchQuery)
        }, 500)

        // Cleanup
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [searchQuery, searchStates])

    // Enrich states with country names from countries lookup
    const enrichedStates = useMemo(() => {
        return states.map(state => {
            // If country name is missing, lookup from countries
            if (!state.country && state.countryCode) {
                const countryData = countries.find(c => c.iso2 === state.countryCode)
                if (countryData) {
                    return {
                        ...state,
                        country: countryData.name
                    }
                }
            }
            return state
        })
    }, [states, countries])

    // Filter states - use search API results if available, otherwise client-side filter
    const filteredStates = useMemo(() => {
        let result: StateData[]

        if (searchQuery.trim().length >= 3 && searchResults !== null) {
            // Use API search results, enrich them with country names
            result = searchResults.map(state => {
                if (!state.country && state.countryCode) {
                    const countryData = countries.find(c => c.iso2 === state.countryCode)
                    if (countryData) {
                        return { ...state, country: countryData.name }
                    }
                }
                return state
            })
        } else if (searchQuery.trim().length >= 3) {
            // Fallback client-side filter while API is loading or for short queries
            const query = searchQuery.toLowerCase()
            result = enrichedStates.filter(state =>
                state.name.toLowerCase().includes(query) ||
                state.countryCode?.toLowerCase().includes(query) ||
                state.country?.toLowerCase().includes(query)
            )
        } else {
            // No search query - use enriched states
            result = enrichedStates
        }

        // Type filter (always apply on top of search results)
        if (selectedType && selectedType !== "All") {
            result = result.filter(state =>
                state.type?.toLowerCase() === selectedType.toLowerCase()
            )
        }

        return result
    }, [enrichedStates, selectedType, searchQuery, searchResults, countries])

    // Paginated states
    const paginatedStates = useMemo(() => {
        if (paginationMode === 'infinite') {
            return filteredStates.slice(0, lazyLoadedCount)
        }
        const startIndex = (currentPage - 1) * pageSize
        return filteredStates.slice(startIndex, startIndex + pageSize)
    }, [filteredStates, currentPage, pageSize, paginationMode, lazyLoadedCount])

    // Total pages
    const totalPages = useMemo(() => {
        return Math.ceil(filteredStates.length / pageSize)
    }, [filteredStates.length, pageSize])

    // Intersection observer for infinite scroll
    useEffect(() => {
        if (paginationMode !== 'infinite') return

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && lazyLoadedCount < filteredStates.length) {
                    setIsLoadingMore(true)
                    setTimeout(() => {
                        setLazyLoadedCount(prev => Math.min(prev + 12, filteredStates.length))
                        setIsLoadingMore(false)
                    }, 300)
                }
            },
            { threshold: 0.1 }
        )

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current)
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [paginationMode, isLoadingMore, lazyLoadedCount, filteredStates.length])

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
        setLazyLoadedCount(12)
    }, [selectedCountryCode, selectedType])

    // Filter modal handlers
    const handleOpenFilterModal = () => {
        setTempCountryCode(selectedCountryCode)
        setTempType(selectedType)
        setIsFilterModalOpen(true)
    }

    const handleApplyFilter = () => {
        setSelectedCountryCode(tempCountryCode)
        setSelectedType(tempType)
        setIsFilterModalOpen(false)
    }

    const handleResetFilter = () => {
        setTempCountryCode("all")
        setTempType("All")
    }

    const handleCancelFilter = () => {
        setIsFilterModalOpen(false)
    }

    // CRUD Handlers
    const handleCreateState = async () => {
        // Validate required fields
        if (!formData.name || !formData.countryId || !formData.country || !formData.countryCode) {
            toast.error(t("masterdata.states.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)

        try {
            const response = await masterdataApi.states.create(formData as StateRequest)

            if (response.success || response.data) {
                await fetchStates()
                setIsCreateModalOpen(false)
                resetForm()
                toast.success(t("masterdata.states.create_success", "State created successfully"))
            } else {
                throw new Error(response.message || "Failed to create state")
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to create state"
            setError(errorMsg)
            toast.error(t("masterdata.states.create_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpenEditModal = (state: StateData) => {
        setEditingStateId(state.id)
        setFormData({
            name: state.name,
            countryId: state.countryId,
            country: state.country || "",
            countryCode: state.countryCode || "",
            iso2: state.iso2 || "",
            type: state.type || "",
        })
        setIsEditModalOpen(true)
    }

    const handleUpdateState = async () => {
        if (!editingStateId || !formData.name || !formData.countryId || !formData.country || !formData.countryCode) {
            toast.error(t("masterdata.states.all_fields_required", "All fields with * are required"))
            return
        }

        setIsSubmitting(true)

        try {
            const response = await masterdataApi.states.update(editingStateId, formData as StateRequest)

            if (response.success || response.data) {
                await fetchStates()
                setIsEditModalOpen(false)
                resetForm()
                setEditingStateId(null)
                toast.success(t("masterdata.states.update_success", "State updated successfully"))
            } else {
                throw new Error(response.message || "Failed to update state")
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to update state"
            setError(errorMsg)
            toast.error(t("masterdata.states.update_error", errorMsg))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpenDeleteDialog = (state: StateData) => {
        setItemToDelete({ id: state.id, name: state.name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        setIsDeleting(true)

        try {
            await masterdataApi.states.delete(itemToDelete.id)
            await fetchStates()
            toast.success(t("masterdata.states.delete_success", `"${itemToDelete.name}" deleted successfully`))
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to delete state"
            toast.error(t("masterdata.states.delete_error", errorMsg))
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    // Handle country selection in form
    const handleCountryChange = (countryId: string) => {
        const country = countries.find(c => c.id.toString() === countryId)
        if (country) {
            setFormData({
                ...formData,
                countryId: country.id,
                country: country.name,
                countryCode: country.iso2 || "",
            })
        }
    }

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (selectedCountryCode !== "all") count++
        if (selectedType !== "All") count++
        return count
    }, [selectedCountryCode, selectedType])

    return (
        <div className="space-y-6">
            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div className="flex-1">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchStates}
                        className="text-red-600 hover:text-red-700"
                    >
                        Try Again
                    </Button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        States
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

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                {/* Search Input */}
                <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by name, state code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                    )}
                </div>

                {/* Filter Button */}
                <Button
                    variant="outline"
                    onClick={handleOpenFilterModal}
                    className="relative shrink-0"
                >
                    <Filter className="w-4 h-4 mr-2" />
                    {t("common.filter", "Filter")}
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Results Summary and Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {searchQuery.trim().length >= 3 ? (
                        <>
                            Found <span className="font-semibold text-gray-900 dark:text-white">{filteredStates.length}</span> results for &quot;<span className="font-semibold text-emerald-600">{searchQuery}</span>&quot;
                        </>
                    ) : (
                        <>
                            Showing <span className="font-semibold text-gray-900 dark:text-white">{paginatedStates.length}</span> of{" "}
                            <span className="font-semibold text-emerald-600">{filteredStates.length}</span> states
                        </>
                    )}
                </p>

                <div className="flex items-center gap-2">
                    {/* Pagination Mode Toggle */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <Button
                            size="sm"
                            variant={paginationMode === 'pages' ? 'default' : 'ghost'}
                            onClick={() => {
                                setPaginationMode('pages')
                                setCurrentPage(1)
                            }}
                            className={cn(
                                "h-7 px-3 text-xs",
                                paginationMode === 'pages' && "bg-emerald-600 text-white hover:bg-emerald-700"
                            )}
                        >
                            Pages
                        </Button>
                        <Button
                            size="sm"
                            variant={paginationMode === 'infinite' ? 'default' : 'ghost'}
                            onClick={() => {
                                setPaginationMode('infinite')
                                setLazyLoadedCount(12)
                            }}
                            className={cn(
                                "h-7 px-3 text-xs",
                                paginationMode === 'infinite' && "bg-emerald-600 text-white hover:bg-emerald-700"
                            )}
                        >
                            Infinite
                        </Button>
                    </div>

                    {/* Page Size Selector */}
                    <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                        <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size} / page
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading states...</span>
                </div>
            ) : filteredStates.length === 0 ? (
                <div className="text-center py-12">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No states found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {selectedCountryCode !== "all" || selectedType !== "All"
                            ? "Try adjusting your filter criteria"
                            : "Get started by creating your first state"}
                    </p>
                    {selectedCountryCode === "all" && selectedType === "All" && (
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create State
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* States Grid */}
                    {/* States Table */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableHead className="w-12">
                                        <Checkbox />
                                    </TableHead>
                                    <TableHead className="min-w-[200px]">State/Province</TableHead>
                                    <TableHead className="w-[180px]">Country</TableHead>
                                    <TableHead className="w-32">Type</TableHead>
                                    <TableHead className="w-24">Code</TableHead>
                                    <TableHead className="w-24 text-center">Cities</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedStates.map((state) => (
                                    <TableRow
                                        key={state.id}
                                        className="group hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                    >
                                        <TableCell>
                                            <Checkbox />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                    {state.iso2 || (state.name ? state.name.substring(0, 2).toUpperCase() : "ST")}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {state.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600 dark:text-gray-400">
                                            {state.country || "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {state.type || "State"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-400">
                                            {state.iso2 || state.countryCode || "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                <Building2 className="w-3.5 h-3.5" />
                                                {state.citiesCount || 0}
                                            </span>
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
                                                    <DropdownMenuItem onClick={() => handleOpenEditModal(state)}>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleOpenDeleteDialog(state)}
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
                    </div>

                    {/* Pagination Controls */}
                    {paginationMode === 'pages' && totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>

                            <div className="flex items-center gap-1">
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
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={cn(
                                                "w-8 h-8",
                                                currentPage === pageNum && "bg-emerald-600 hover:bg-emerald-700"
                                            )}
                                        >
                                            {pageNum}
                                        </Button>
                                    )
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}

                    {/* Infinite Scroll Loader */}
                    {paginationMode === 'infinite' && lazyLoadedCount < filteredStates.length && (
                        <div ref={loadMoreRef} className="py-8 text-center">
                            {isLoadingMore ? (
                                <div className="flex items-center justify-center gap-3 text-gray-500">
                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                    <span className="text-sm">Loading more states...</span>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => setLazyLoadedCount(prev => Math.min(prev + 12, filteredStates.length))}
                                >
                                    Load More
                                </Button>
                            )}
                        </div>
                    )}

                    {paginationMode === 'infinite' && lazyLoadedCount >= filteredStates.length && filteredStates.length > 0 && (
                        <div className="text-center py-6 text-sm text-gray-500">
                            All {filteredStates.length} states loaded
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
                            <Label>Country</Label>
                            <Select value={tempCountryCode} onValueChange={setTempCountryCode}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Countries</SelectItem>
                                    {countries.map((country) => (
                                        <SelectItem key={country.id} value={country.iso2 || country.id.toString()}>
                                            {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Select value={tempType} onValueChange={setTempType}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATE_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
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

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.states.create_title", "Create New State")}</DialogTitle>
                        <DialogDescription>
                            {t("masterdata.states.create_description", "Add a new state or province to the system.")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="name">State Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                    placeholder="e.g. California"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="country">Country *</Label>
                                <Select
                                    value={formData.countryId?.toString() || ""}
                                    onValueChange={handleCountryChange}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map((country) => (
                                            <SelectItem key={country.id} value={country.id.toString()}>
                                                {country.name} ({country.iso2})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="iso2">ISO2 Code</Label>
                                <Input
                                    id="iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    placeholder="e.g. CA"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formData.type || ""}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATE_TYPES.filter(t => t !== "All").map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateState}
                            disabled={!formData.name || !formData.countryId || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create State
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("masterdata.states.edit_title", "Edit State")}</DialogTitle>
                        <DialogDescription>
                            {t("masterdata.states.edit_description", "Update state information.")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="edit-name">State Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="edit-country">Country *</Label>
                                <Select
                                    value={formData.countryId?.toString() || ""}
                                    onValueChange={handleCountryChange}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map((country) => (
                                            <SelectItem key={country.id} value={country.id.toString()}>
                                                {country.name} ({country.iso2})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit-iso2">ISO2 Code</Label>
                                <Input
                                    id="edit-iso2"
                                    value={formData.iso2 || ""}
                                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                                    className="mt-1.5"
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-type">Type</Label>
                                <Select
                                    value={formData.type || ""}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATE_TYPES.filter(t => t !== "All").map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsEditModalOpen(false); resetForm(); setEditingStateId(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateState}
                            disabled={!formData.name || !formData.countryId || isSubmitting}
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
                            {t("masterdata.states.delete_title", "Delete State")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("masterdata.states.delete_confirm", `Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`)}
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
