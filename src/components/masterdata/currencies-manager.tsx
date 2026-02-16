"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Plus,
    Search,
    Loader2,
    DollarSign,
    Eye,
    AlertCircle,
    RotateCcw,
} from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/utils"
import { masterdataApi, CurrencyData } from "@/lib/api"
import { toast } from "sonner"

export function CurrenciesManager() {
    const { t } = useI18n()
    const router = useRouter()

    // AbortController ref for request cancellation
    const abortControllerRef = useRef<AbortController | null>(null)

    // Data state
    const [currencies, setCurrencies] = useState<CurrencyData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // UI state
    const [inputValue, setInputValue] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    // Fetch currencies
    const fetchCurrencies = useCallback(async () => {
        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Create new AbortController
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            const response = await masterdataApi.currencies.getAll(
                undefined,
                undefined,
                abortControllerRef.current.signal
            )

            if (response && response.success && response.data) {
                const data = Array.isArray(response.data) ? response.data : []
                setCurrencies(data)
            } else {
                setCurrencies([])
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            console.error("Error fetching currencies:", err)
            setError("Failed to load currencies")
            toast.error("Failed to load currencies")
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial fetch
    useEffect(() => {
        fetchCurrencies()

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [fetchCurrencies])

    // Filter currencies by search and sort by ID
    const filteredCurrencies = useMemo(() => {
        let filtered = currencies

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = currencies.filter(currency =>
                currency.name.toLowerCase().includes(q) ||
                currency.code.toLowerCase().includes(q) ||
                currency.symbol?.toLowerCase().includes(q)
            )
        }

        // Sort by ID (ascending)
        return [...filtered].sort((a, b) => a.id - b.id)
    }, [currencies, searchQuery])

    // Pagination
    const totalPages = Math.ceil(filteredCurrencies.length / itemsPerPage)
    const displayedCurrencies = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredCurrencies.slice(start, start + itemsPerPage)
    }, [filteredCurrencies, currentPage])

    const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))

    // Handle search button click
    const handleSearch = () => {
        setSearchQuery(inputValue)
        setCurrentPage(1)
    }

    // Handle Enter key in search input
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading currencies...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (error && currencies.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={fetchCurrencies} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Currencies
                    </h1>
                </div>
                <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => toast.info("Add Currency feature coming soon")}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                </Button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 sm:gap-3 items-center mb-6">
                <div className="relative flex-1 flex">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by name, code, or symbol..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="pl-9 pr-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
                        />
                    </div>
                    <Button
                        onClick={handleSearch}
                        variant="ghost"
                        className="rounded-l-none border border-gray-200 dark:border-gray-700 border-l-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 transition-colors h-10 px-4 gap-2"
                    >
                        <Search className="w-4 h-4" />
                        Search
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {filteredCurrencies.length === 0 ? (
                    <div className="p-12 text-center">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20 text-gray-400" />
                        <p className="text-gray-500">
                            {searchQuery ? "No currencies match your search." : "No currencies found."}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                <TableHead className="w-20 text-white font-bold">ID</TableHead>
                                <TableHead className="min-w-[200px] text-white font-bold">Name</TableHead>
                                <TableHead className="w-[120px] text-white font-bold">Symbol</TableHead>
                                <TableHead className="w-[100px] text-white font-bold">Code</TableHead>
                                <TableHead className="w-[100px] text-white font-bold">Decimals</TableHead>
                                <TableHead className="w-[120px] text-right text-white font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCurrencies.map((currency) => (
                                <TableRow
                                    key={currency.id}
                                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                >
                                    {/* ID Column */}
                                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                        #{currency.id}
                                    </TableCell>

                                    {/* Name Column */}
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                {currency.majorSymbol || currency.code.substring(0, 1)}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {currency.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400">
                                        {currency.majorSymbol || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {currency.code}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400">
                                        {currency.decimalPlaces ?? 2}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => router.push(`/master/currencies/${currency.id}`)}
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredCurrencies.length > 0 && totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                    <Pagination>
                        <PaginationContent className="gap-2">
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    size="lg"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage > 1) goToPage(currentPage - 1)
                                    }}
                                    className={cn(
                                        "h-11 px-5 text-base",
                                        currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                                    )}
                                />
                            </PaginationItem>

                            {/* Page Numbers */}
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
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href="#"
                                            size="icon"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                goToPage(pageNum)
                                            }}
                                            isActive={currentPage === pageNum}
                                            className={cn(
                                                "h-11 w-11 text-base cursor-pointer",
                                                currentPage === pageNum && "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md"
                                            )}
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                )
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    size="lg"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage < totalPages) goToPage(currentPage + 1)
                                    }}
                                    className={cn(
                                        "h-11 px-5 text-base",
                                        currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    )
}
