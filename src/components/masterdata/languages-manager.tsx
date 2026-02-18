"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
    Search,
    AlertCircle,
    RotateCcw,
    Languages,
    Eye,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { masterdataApi, LanguageData } from "@/lib/api"

export function LanguagesManager() {
    const router = useRouter()
    const abortControllerRef = useRef<AbortController | null>(null)

    // Data state
    const [languages, setLanguages] = useState<LanguageData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Search state
    const [inputValue, setInputValue] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    // Fetch all languages
    const fetchLanguages = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        setIsLoading(true)
        setError(null)

        try {
            const response = await masterdataApi.languages.getAll(
                undefined,
                abortControllerRef.current.signal
            )

            if (response.success && response.data) {
                const data = Array.isArray(response.data) ? response.data : []
                setLanguages(data)
            } else {
                setLanguages([])
            }
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return
            console.error("Error fetching languages:", err)
            setError("Failed to load languages")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLanguages()
        return () => {
            abortControllerRef.current?.abort()
        }
    }, [fetchLanguages])

    // Client-side search filter
    const filteredLanguages = useMemo(() => {
        if (!searchQuery.trim()) return languages

        const q = searchQuery.toLowerCase()
        return languages.filter(
            (lang) =>
                lang.name.toLowerCase().includes(q) ||
                lang.id.toLowerCase().includes(q) ||
                lang.nativeName?.toLowerCase().includes(q) ||
                lang.family?.toLowerCase().includes(q)
        )
    }, [languages, searchQuery])

    // Pagination
    const totalPages = Math.ceil(filteredLanguages.length / itemsPerPage)
    const displayedLanguages = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredLanguages.slice(start, start + itemsPerPage)
    }, [filteredLanguages, currentPage])

    const goToPage = (page: number) =>
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))

    const handleSearch = () => {
        setSearchQuery(inputValue)
        setCurrentPage(1)
    }

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch()
    }

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    // Format speakers count
    const formatSpeakers = (count?: number | null) => {
        if (!count) return "—"
        if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`
        if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
        if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
        return count.toString()
    }

    // ====== RENDER ======

    // Skeleton loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-8 w-40" />
                </div>

                {/* Search Skeleton */}
                <div className="flex gap-2 sm:gap-3 items-center mb-6">
                    <Skeleton className="h-10 flex-1" />
                </div>

                {/* Table Skeleton */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="h-12 bg-emerald-600/10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-4"
                        >
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 flex-1" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error && languages.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={fetchLanguages} variant="outline">
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
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Languages
                    </h1>
                    {languages.length > 0 && (
                        /* Total removed as requested */
                        null
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 sm:gap-3 items-center mb-6">
                <div className="relative flex-1 flex">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by name, code, or language family..."
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
                {displayedLanguages.length === 0 ? (
                    <div className="p-12 text-center">
                        <Languages className="w-12 h-12 mx-auto mb-3 opacity-20 text-gray-400" />
                        <p className="text-gray-500">
                            {searchQuery
                                ? "No languages match your search."
                                : "No languages found."}
                        </p>
                    </div>
                ) : (
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                <TableHead className="w-[80px] text-white font-bold">Code</TableHead>
                                <TableHead className="text-white font-bold">Name</TableHead>
                                <TableHead className="text-white font-bold text-center">Native Name</TableHead>
                                <TableHead className="w-[100px] text-white font-bold text-center">Direction</TableHead>
                                <TableHead className="text-white font-bold text-center">Family</TableHead>
                                <TableHead className="w-[100px] text-white font-bold text-center">Speakers</TableHead>
                                <TableHead className="w-[100px] text-white font-bold text-center">Status</TableHead>
                                <TableHead className="w-[100px] text-right text-white font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedLanguages.map((lang) => (
                                <TableRow
                                    key={lang.id}
                                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                >
                                    {/* Code Column */}
                                    <TableCell className="w-[80px]">
                                        <div className="flex items-center gap-1.5">
                                            {lang.flagEmoji && (
                                                <span className="text-sm leading-none">{lang.flagEmoji}</span>
                                            )}
                                            <span className="font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400 uppercase">
                                                {lang.id}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Name Column */}
                                    <TableCell>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                                {lang.id.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {lang.name}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Native Name Column */}
                                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] text-center">
                                        {lang.nativeName || "—"}
                                    </TableCell>

                                    {/* Direction Column */}
                                    <TableCell className="w-[100px] text-center">
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                                                lang.direction === "rtl"
                                                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                            )}
                                        >
                                            {lang.direction?.toUpperCase() || "LTR"}
                                        </span>
                                    </TableCell>

                                    {/* Family Column */}
                                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] text-center">
                                        {lang.family || "—"}
                                    </TableCell>

                                    {/* Speakers Column */}
                                    <TableCell className="w-[100px] text-sm text-gray-600 dark:text-gray-400 text-center">
                                        {formatSpeakers(lang.speakers)}
                                    </TableCell>

                                    {/* Status Column */}
                                    <TableCell className="w-[100px] text-center">
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                                                lang.isActive === 1
                                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                            )}
                                        >
                                            {lang.isActive === 1 ? "Active" : "Inactive"}
                                        </span>
                                    </TableCell>

                                    {/* Actions Column */}
                                    <TableCell className="w-[100px] text-right">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 h-8 px-3"
                                            onClick={() => router.push(`/master/languages/${lang.id}`)}
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            {filteredLanguages.length > 0 && totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                    <Pagination>
                        <PaginationContent className="gap-2">
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage > 1) goToPage(currentPage - 1)
                                    }}
                                    className={cn(
                                        currentPage === 1
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
                                    )}
                                />
                            </PaginationItem>

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
                                            onClick={(e) => {
                                                e.preventDefault()
                                                goToPage(pageNum)
                                            }}
                                            isActive={currentPage === pageNum}
                                            className={cn(
                                                "cursor-pointer",
                                                currentPage === pageNum &&
                                                "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md"
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
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage < totalPages) goToPage(currentPage + 1)
                                    }}
                                    className={cn(
                                        currentPage === totalPages
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
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
