"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Edit, ChevronLeft, ChevronRight, X, User as UserIcon, Mail, Users as UsersIcon, Loader2, Filter, Calendar, Users2, Check } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { useDebounce } from "@/hooks/use-debounce"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { getUsers, getUserBySearch } from "@/utils/api/user/fetch"
import { UserProfileWithGmailAvatar } from "@/types/database.types"
import { updateUserProfile } from "@/utils/api/user/update"
import { createClient } from "@/utils/supabase/client"
import { normalizeUsername, validateUsername } from "@/utils/validation/username"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { fetchCountries } from "@/utils/api/countries/fetch"
import { fetchStates } from "@/utils/api/states/fetch"
import { fetchCities } from "@/utils/api/city/fetch"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"

// Helper function to get avatar URL with Gmail fallback
const getAvatarSrc = (user: UserProfileWithGmailAvatar): string | null => {
    // Priority 1: user.avatar (manual upload or synced avatar)
    if (user.avatar && user.avatar.trim()) {
        return user.avatar;
    }

    // Priority 2: Gmail photo fallback
    if (user.gmail_avatar && user.gmail_avatar.trim()) {
        return user.gmail_avatar;
    }

    // Priority 3: null (will use AvatarFallback with initials)
    return null;
}

export default function Users() {
    const { t } = useI18n()
    const [searchQuery, setSearchQuery] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UserProfileWithGmailAvatar | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isCheckingUsername, setIsCheckingUsername] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const [usernameError, setUsernameError] = useState('')
    const [editForm, setEditForm] = useState({
        username: '',
        name: '',
        email: '',
        isBlocked: false,
        role: 'member' as 'admin' | 'member' | 'support' | 'billing',
        countryId: null as number | null,
        stateId: null as number | null,
        cityId: null as number | null,
        countryName: '',
        stateName: '',
        cityName: ''
    })

    // Location states
    const [countries, setCountries] = useState<ProvinceData[]>([])
    const [provinces, setProvinces] = useState<ProvinceData[]>([])
    const [cities, setCities] = useState<CityData[]>([])
    const [openCountry, setOpenCountry] = useState(false)
    const [openProvince, setOpenProvince] = useState(false)
    const [openCity, setOpenCity] = useState(false)

    // Filter states
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [fromDate, setFromDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [showFilterModal, setShowFilterModal] = useState(false)

    // Temporary filter states for modal
    const [tempRoleFilter, setTempRoleFilter] = useState<string>('all')
    const [tempStatusFilter, setTempStatusFilter] = useState<string>('all')
    const [tempFromDate, setTempFromDate] = useState<string>('')
    const [tempEndDate, setTempEndDate] = useState<string>('')

    // SWR for fetching users
    const { data: usersResponse, isLoading: usersLoading, mutate: mutateUsers } = useSWR('users', getUsers)
    const users = usersResponse?.data || []

    // SWR for search
    const { data: searchResponse, isLoading: searchLoading, mutate: mutateSearch } = useSWR(
        searchTerm ? `search-${searchTerm}` : null,
        () => getUserBySearch(searchTerm)
    )
    const usersSearch = searchResponse?.data || []

    // Combine loading states
    const isLoading = usersLoading || (searchTerm && searchLoading)

    const debouncedUsername = useDebounce(editForm.username, 500)

    const checkUsernameAvailability = useCallback(async (username: string, currentUserId: string) => {
        // Clear error immediately for empty username
        if (!username.trim()) {
            setUsernameError('')
            setIsCheckingUsername(false)
            return true
        }

        // Don't check if username hasn't changed
        if (editingUser && username === editingUser.username?.replace('@', '')) {
            setUsernameError('')
            setIsCheckingUsername(false)
            return true
        }

        setIsCheckingUsername(true)
        setUsernameError('')

        // First, validate username format
        const formatValidationError = validateUsername(username)
        if (formatValidationError) {
            setUsernameError(formatValidationError)
            setIsCheckingUsername(false)
            return false
        }

        // Add small delay to make the 0.5 second debounce more noticeable
        await new Promise(resolve => setTimeout(resolve, 100))

        try {
            const supabase = createClient()
            const normalizedUsername = normalizeUsername(username)

            const { data: existingUser, error: checkError } = await supabase
                .from("user_profiles")
                .select("id")
                .eq("username", `@${normalizedUsername}`)
                .single()

            if (checkError && checkError.code !== "PGRST116") {
                setUsernameError(t('validation.username_error', 'Error checking username availability'))
                return false
            }

            if (existingUser && existingUser.id !== currentUserId) {
                setUsernameError(t('validation.username_exists', 'Username sudah digunakan'))
                return false
            }

            setUsernameError('')
            return true
        } catch {
            setUsernameError(t('validation.username_error', 'Error checking username availability'))
            return false
        } finally {
            setIsCheckingUsername(false)
        }
    }, [editingUser, t])

    // Load countries on mount
    useEffect(() => {
        const loadCountries = async () => {
            try {
                const result = await fetchCountries()
                if (result.success) {
                    setCountries(result.data || [])
                }
            } catch (error) {
                console.error("Error loading countries:", error)
            }
        }
        loadCountries()
    }, [])

    // Load states when country changes
    useEffect(() => {
        const loadStates = async () => {
            if (!editForm.countryId || editForm.countryId === 0) {
                setProvinces([])
                setCities([])
                return
            }
            try {
                const result = await fetchStates(editForm.countryId)
                if (result.success) {
                    setProvinces(result.data || [])
                }
            } catch (error) {
                console.error("Error loading states:", error)
            }
        }
        loadStates()
    }, [editForm.countryId])

    // Load cities when state changes
    useEffect(() => {
        const loadCities = async () => {
            if (!editForm.stateId || editForm.stateId === 0) {
                setCities([])
                return
            }
            try {
                const result = await fetchCities(editForm.stateId)
                if (result.success) {
                    setCities(result.data || [])
                }
            } catch (error) {
                console.error("Error loading cities:", error)
            }
        }
        loadCities()
    }, [editForm.stateId])

    // Validate username when it changes (with 0.5 second delay)
    useEffect(() => {
        if (editingUser) {
            checkUsernameAvailability(debouncedUsername, editingUser.id)
        }
    }, [debouncedUsername, editingUser, checkUsernameAvailability])

    useEffect(() => {
        const roleParam = searchParams.get("role")
        const statusParam = searchParams.get("status")

        const validRoles = new Set(["admin", "member", "support", "billing"])
        const validStatuses = new Set(["active", "blocked"])

        if (roleParam && validRoles.has(roleParam)) {
            setRoleFilter(roleParam)
            setTempRoleFilter(roleParam)
        }

        if (statusParam && validStatuses.has(statusParam)) {
            setStatusFilter(statusParam)
            setTempStatusFilter(statusParam)
        }
    }, [searchParams])

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [roleFilter, statusFilter, fromDate, endDate])

    // Handle search results properly - only show search results when there's an active search
    const allUsers = searchTerm ? usersSearch : users

    // Filter users based on role, status, and date range
    const filteredUsers = allUsers
        .filter(user => {
            // Role filter
            if (roleFilter !== 'all' && (user.role || 'member') !== roleFilter) {
                return false
            }

            // Status filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'active' && (user.isBlocked || false)) return false
                if (statusFilter === 'blocked' && !(user.isBlocked || false)) return false
            }

            // Date range filter
            if (fromDate || endDate) {
                if (!user.created) return false; // Skip users with no created date
                const userDate = new Date(user.created)
                const startDate = fromDate ? new Date(fromDate) : null
                const endDateObj = endDate ? new Date(endDate) : null

                // Set time to beginning/end of day for proper comparison
                if (startDate) {
                    startDate.setHours(0, 0, 0, 0)
                }
                if (endDateObj) {
                    endDateObj.setHours(23, 59, 59, 999)
                }

                if (startDate && userDate < startDate) return false
                if (endDateObj && userDate > endDateObj) return false
            }

            return true
        })
        // Default sort by created descending (newest first)
        .sort((a, b) => {
            const dateA = a.created ? new Date(a.created).getTime() : 0;
            const dateB = b.created ? new Date(b.created).getTime() : 0;
            return dateB - dateA;
        })

    // Pagination logic
    const itemsPerPage = 10
    const actualTotalUsers = filteredUsers.length
    const totalPages = Math.ceil(actualTotalUsers / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    // Pagination display
    const startItem = actualTotalUsers > 0 ? startIndex + 1 : 0
    const endItem = Math.min(endIndex, actualTotalUsers)

    const handleSearch = () => {
        setCurrentPage(1) // Reset to first page when searching
        setSearchTerm(searchQuery)

        // If search query is empty, reset to show all users
        if (!searchQuery.trim()) {
            setSearchTerm('')
        }
        // SWR will handle the fetch based on searchTerm
    }

    // Removed handleSort function since we're not using sorting anymore

    const openFilterModal = () => {
        // Set temporary values to current filter values
        setTempRoleFilter(roleFilter)
        setTempStatusFilter(statusFilter)
        setTempFromDate(fromDate)
        setTempEndDate(endDate)
        setShowFilterModal(true)
    }

    const applyFilters = () => {
        // Apply temporary values to actual filter values
        setRoleFilter(tempRoleFilter)
        setStatusFilter(tempStatusFilter)
        setFromDate(tempFromDate)
        setEndDate(tempEndDate)
        setCurrentPage(1)
        setShowFilterModal(false)
    }

    const cancelFilters = () => {
        // Reset temporary values to current filter values
        setTempRoleFilter(roleFilter)
        setTempStatusFilter(statusFilter)
        setTempFromDate(fromDate)
        setTempEndDate(endDate)
        setShowFilterModal(false)
    }

    const resetFiltersInModal = () => {
        setTempRoleFilter('all')
        setTempStatusFilter('all')
        setTempFromDate('')
        setTempEndDate('')
    }

    const formatDate = (dateString: string) => {
        try {
            // Handle both ISO format and the specific format mentioned
            const date = new Date(dateString)

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return dateString // Return original if invalid
            }

            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return dateString // Return original string if parsing fails
        }
    }


    const handleEdit = (userId: string) => {
        const user = users.find(u => u.id === userId)
        if (user) {
            setEditingUser(user)
            // Validate and set role - ensure it's one of the valid roles
            const validRoles: ('admin' | 'member' | 'support' | 'billing')[] = ['admin', 'member', 'support', 'billing']
            const userRole = user.role as 'admin' | 'member' | 'support' | 'billing'
            const role = validRoles.includes(userRole) ? userRole : 'member'

            setEditForm({
                username: user.username?.startsWith('@') ? user.username.slice(1) : user.username || '', // Remove @ for editing
                name: user.name || '',
                email: user.email || '',
                isBlocked: user.isBlocked || false,
                role: role,
                countryId: user.countryId || null,
                stateId: user.stateId || null,
                cityId: user.cityId || null,
                countryName: user.countryName || '',
                stateName: user.stateName || '',
                cityName: user.cityName || ''
            })
            setIsEditModalOpen(true)
        }
    }

    const handleSaveChanges = async () => {
        if (editingUser) {
            // Basic validation for required fields
            if (!editForm.username.trim()) {
                setUsernameError(t('validation.username_required', 'Username is required'))
                return
            }

            // Validate username first
            const isUsernameValid = await checkUsernameAvailability(editForm.username, editingUser.id)
            if (!isUsernameValid) {
                return // Don't save if username is invalid
            }

            setIsSaving(true)
            try {
                const updateData = {
                    ...editingUser,
                    username: editForm.username,
                    name: editForm.name,
                    email: editForm.email,
                    isBlocked: editForm.isBlocked,
                    role: editForm.role,
                    countryId: editForm.countryId,
                    stateId: editForm.stateId,
                    cityId: editForm.cityId,
                    countryName: editForm.countryName,
                    stateName: editForm.stateName,
                    cityName: editForm.cityName
                }
                const response = await updateUserProfile(editingUser.id, updateData)
                if (response.success) {
                    // Update the SWR cache
                    mutateUsers()
                    if (searchTerm) {
                        mutateSearch()
                    }
                    setIsEditModalOpen(false)
                    setEditingUser(null)
                    setUsernameError('')
                    toast.success(t('messages.update_success', 'User profile updated successfully'))
                } else {
                    toast.error(response.message || t('messages.update_error', 'Failed to update user profile'))
                }
                console.log(response)
            } catch (error) {
                console.error('Error updating user:', error)
                toast.error(t('messages.update_error', 'Failed to update user profile'))
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleCancelEdit = () => {
        setIsEditModalOpen(false)
        setEditingUser(null)
        setEditForm({
            username: '',
            name: '',
            email: '',
            isBlocked: false,
            role: 'member' as 'admin' | 'member' | 'support' | 'billing',
            countryId: null,
            stateId: null,
            cityId: null,
            countryName: '',
            stateName: '',
            cityName: ''
        })
    }


    return (
        <div className="max-w-7xl mx-auto">
            <Card className="rounded-none py-0 bg-transparent dark:bg-transparent border-none shadow-none">
                <CardHeader className="px-0" >
                    <CardTitle className="flex-shrink-0 md:flex-shrink-auto w-full mx-auto md:max-w-7xl p">
                        <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                            <div className="flex items-center justify-center">
                                <Users2 className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                                {t('title', 'Daftar Pengguna')}
                            </h1>
                        </div>
                    </CardTitle>
                </CardHeader>

                <CardContent className="px-0 space-y-6">
                    {/* Search and Filter Bar */}
                    <div className="space-y-4">
                        {/* Search Row */}
                        <div className="flex gap-2 sm:gap-3 items-center">
                            <div className="relative w-full sm:w-64">
                                <Input
                                    placeholder={t('search_placeholder', 'Cari berdasarkan username...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch()
                                        }
                                    }}
                                    className="pl-3 pr-8 h-8 text-xs border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 focus:bg-white dark:focus:bg-gray-900 focus:ring-emerald-500 rounded-lg"
                                />
                                <button
                                    onClick={() => { handleSearch(); }}
                                    className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-r-lg transition-colors"
                                >
                                    <Search className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <Button
                                variant="outline"
                                onClick={openFilterModal}
                                size="sm"
                                className="h-8 text-xs border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <Filter className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:block">
                                    {t('filters', 'Filter')}
                                </span>
                            </Button>
                        </div>

                    </div>

                    {/* Users Table */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.photo', 'Photo')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.username', 'Username')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.full_name', 'Full Name')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.email', 'Email')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.join_date', 'Tanggal Bergabung')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.role', 'Role')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">{t('table_headers.status', 'Status')}</TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">{t('table_headers.actions', 'Aksi')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    // Loading skeleton
                                    Array.from({ length: 3 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                                                    <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="w-40 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex space-x-2">
                                                    <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                    <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                                            {searchTerm ? t('search_no_results', `Data "${searchTerm}" tidak ditemukan`).replace('{searchTerm}', searchTerm) : t('no_data', 'Tidak ada pengguna ditemukan')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <TableCell className="py-2 px-3">
                                                <div className="flex items-center space-x-3">
                                                    <Link href={'/profile/' + user.username?.replace(/^@/, '')}>
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarImage src={getAvatarSrc(user) || undefined} alt={user.name || user.username || ''} />
                                                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-semibold">
                                                                {user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : user.username?.charAt(1) || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 px-3" onClick={() => router.push('/profile/' + user.username?.replace(/^@/, ''))}>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                                                    {user.username}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                                                {user.name}
                                            </TableCell>
                                            <TableCell className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">
                                                {user.email}
                                            </TableCell>
                                            <TableCell className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">
                                                {user.created ? formatDate(user.created) : '-'}
                                            </TableCell>
                                            <TableCell className="py-2 px-3">
                                                {(() => {
                                                    const role = user.role || 'member'
                                                    const roleConfig = {
                                                        admin: {
                                                            className: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
                                                            label: t('roles.admin', 'Admin')
                                                        },
                                                        support: {
                                                            className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
                                                            label: t('roles.support', 'Support')
                                                        },
                                                        billing: {
                                                            className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
                                                            label: t('roles.billing', 'Billing')
                                                        },
                                                        member: {
                                                            className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                                                            label: t('roles.member', 'Member')
                                                        }
                                                    }
                                                    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member
                                                    return (
                                                        <Badge
                                                            variant="outline"
                                                            className={`px-2 py-0.5 text-xs font-medium border ${config.className} rounded-md shadow-sm`}
                                                        >
                                                            {config.label}
                                                        </Badge>
                                                    )
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-2 px-3">
                                                <Badge
                                                    variant="outline"
                                                    className={`px-2 py-0.5 text-xs font-medium border rounded-md shadow-sm ${(user.isBlocked || false)
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                        }`}
                                                >
                                                    {(user.isBlocked || false) ? t('status.blocked', 'Tidak') : t('status.active', 'Ya')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 px-3">
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(user.id)}
                                                        className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col-reverse gap-3 items-center pt-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {t('pagination.showing', 'Menampilkan {start} - {end} dari {total} pengguna')
                                    .replace('{start}', startItem.toString())
                                    .replace('{end}', endItem.toString())
                                    .replace('{total}', actualTotalUsers.toString())}
                                {searchTerm && ` (hasil pencarian "${searchTerm}")`}
                            </div>
                            <div className="flex items-center flex-wrap space-x-1">
                                {/* Previous Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {/* Page Numbers */}
                                {(() => {
                                    const pages = [];
                                    const showPages = 3; // Show 3 page numbers max
                                    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                                    const endPage = Math.min(totalPages, startPage + showPages - 1);
                                    // Adjust start page if we're near the end
                                    if (endPage - startPage + 1 < showPages) {
                                        startPage = Math.max(1, endPage - showPages + 1);
                                    }
                                    // First page + ellipsis
                                    if (startPage > 1) {
                                        pages.push(
                                            <Button
                                                key={1}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(1)}
                                                className="px-3 py-2"
                                            >
                                                1
                                            </Button>
                                        );
                                        if (startPage > 2) {
                                            pages.push(
                                                <span key="ellipsis1" className="px-0.5 text-gray-500">...</span>
                                            );
                                        }
                                    }
                                    // Page numbers
                                    for (let i = startPage; i <= endPage; i++) {
                                        pages.push(
                                            <Button
                                                key={i}
                                                variant={currentPage === i ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(i)}
                                                className={`px-3 py-2 ${currentPage === i ? "bg-gradient-to-r from-emerald-600 to-teal-600 dark:text-white" : ""}`}
                                            >
                                                {i}
                                            </Button>
                                        );
                                    }
                                    // Last page + ellipsis
                                    if (endPage < totalPages) {
                                        if (endPage < totalPages - 1) {
                                            pages.push(
                                                <span key="ellipsis2" className="px-0.5 text-gray-500">...</span>
                                            );
                                        }
                                        pages.push(
                                            <Button
                                                key={totalPages}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(totalPages)}
                                                className="px-3 py-2"
                                            >
                                                {totalPages}
                                            </Button>
                                        );
                                    }
                                    return pages;
                                })()}
                                {/* Next Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Edit User Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4">
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                                {t('edit_user.title', 'Edit Data Pengguna')}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="space-y-2">
                        {/* Username Field */}
                        <div>
                            <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.username_label', 'Username')} <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="username"
                                    value={editForm.username || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                    className={`pl-10 pr-10 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg ${usernameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                                        }`}
                                    placeholder={t('edit_user.username_placeholder', 'johndoe123')}
                                />
                                {isCheckingUsername && (
                                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                )}
                            </div>
                            {!usernameError && !isCheckingUsername && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t('edit_user.username_hint', '3-20 karakter, huruf, angka, dan underscore saja')}
                                </p>
                            )}
                            {usernameError && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{usernameError}</p>
                            )}
                        </div>

                        {/* Full Name Field */}
                        <div>
                            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.full_name_label', 'Nama Pengguna')}
                            </Label>
                            <div className="relative">
                                <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="fullName"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                    placeholder={t('edit_user.full_name_placeholder', 'John Doe')}
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div>
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.email_label', 'Email')}
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="email"
                                    type="email"
                                    disabled
                                    value={editForm.email || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                    placeholder={t('edit_user.email_placeholder', 'john.doe@example.com')}
                                />
                            </div>
                        </div>

                        {/* Country Field */}
                        <div>
                            <Label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("register.country", "Countries")}
                            </Label>
                            <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                <PopoverTrigger asChild className="w-full text-left">
                                    <Button variant="outline" className="w-full justify-start">
                                        {editForm.countryName || t("register.select_country", "Select Country")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0">
                                    <Command>
                                        <CommandInput placeholder={t("register.search_country", "Search Country")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {countries.map((country) => (
                                                    <CommandItem
                                                        className="w-full flex justify-between"
                                                        onSelect={() => {
                                                            if (editForm.countryId === country.id) {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    countryId: null,
                                                                    countryName: '',
                                                                    stateId: null,
                                                                    stateName: '',
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                            } else {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    countryId: country.id,
                                                                    countryName: country.name,
                                                                    stateId: null,
                                                                    stateName: '',
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                                setOpenCountry(false)
                                                            }
                                                        }}
                                                        value={country.name}
                                                        key={country.id}
                                                    >
                                                        {country.name}
                                                        <Check className={`w-4 h-4 ${editForm.countryId === country.id ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Province/State Field */}
                        <div>
                            <Label htmlFor="province" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("register.province", "Province")}
                            </Label>
                            <Popover open={openProvince} onOpenChange={setOpenProvince}>
                                <PopoverTrigger asChild className="w-full text-left" disabled={!editForm.countryId}>
                                    <Button variant="outline" className="w-full justify-start" disabled={!editForm.countryId}>
                                        {editForm.stateName || t("register.select_province", "Select Province")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0">
                                    <Command>
                                        <CommandInput placeholder={t("register.search_province", "Search Province")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {provinces.map((province) => (
                                                    <CommandItem
                                                        className="w-full flex justify-between"
                                                        onSelect={() => {
                                                            if (editForm.stateId === province.id) {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    stateId: null,
                                                                    stateName: '',
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                            } else {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    stateId: province.id,
                                                                    stateName: province.name,
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                                setOpenProvince(false)
                                                            }
                                                        }}
                                                        value={province.name}
                                                        key={province.id}
                                                    >
                                                        {province.name}
                                                        <Check className={`w-4 h-4 ${editForm.stateId === province.id ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* City Field */}
                        <div>
                            <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("register.city", "City")}
                            </Label>
                            <Popover open={openCity} onOpenChange={setOpenCity}>
                                <PopoverTrigger asChild className="w-full text-left" disabled={!editForm.stateId}>
                                    <Button variant="outline" className="w-full justify-start" disabled={!editForm.stateId}>
                                        {editForm.cityName || t("register.select_city", "Select City")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0">
                                    <Command>
                                        <CommandInput placeholder={t("register.search_city", "Search City")} />
                                        <CommandList>
                                            <CommandGroup>
                                                {cities.map((city) => (
                                                    <CommandItem
                                                        className="w-full flex justify-between"
                                                        onSelect={() => {
                                                            if (editForm.cityId === city.id) {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    cityId: null,
                                                                    cityName: ''
                                                                }))
                                                            } else {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    cityId: city.id,
                                                                    cityName: city.name
                                                                }))
                                                                setOpenCity(false)
                                                            }
                                                        }}
                                                        value={city.name}
                                                        key={Number(city.id)}
                                                    >
                                                        {city.name}
                                                        <Check className={`w-4 h-4 ${editForm.cityId === city.id ? "opacity-100" : "opacity-0"}`} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Role Field */}
                        <div>
                            <Label htmlFor="role" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.role_label', 'Role')}
                            </Label>
                            <Select
                                value={editForm.role}
                                onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as 'admin' | 'member' | 'support' | 'billing' }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('edit_user.role_placeholder', 'Pilih role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                            <span>{t('roles.admin', 'Admin')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="support">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                            <span>{t('roles.support', 'Support')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="billing">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span>{t('roles.billing', 'Billing')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="member">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span>{t('roles.member', 'Member')}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Field */}
                        <div>
                            <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_user.status_label', 'Aktif')}
                            </Label>
                            {editingUser && editingUser.id === users[users.length - 1]?.id ? (
                                // Read-only display for the last user
                                <div className="flex items-center space-x-2 p-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    <div className={`w-3 h-3 rounded-full ${editForm.isBlocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {editForm.isBlocked ? t('edit_user.status_blocked', 'Tidak') : t('edit_user.status_active', 'Ya')}
                                    </span>
                                </div>
                            ) : (
                                // Editable select for other users
                                <Select
                                    value={editForm.isBlocked?.toString() || 'false'}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, isBlocked: value === 'true' }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t('edit_user.status_placeholder', 'Pilih status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="false">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span>{t('edit_user.status_active', 'Ya')}</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="true">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span>{t('edit_user.status_blocked', 'Tidak')}</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
                            >
                                {t('edit_user.cancel_button', 'Batal')}
                            </Button>
                            <Button
                                onClick={handleSaveChanges}
                                disabled={isSaving || !!usernameError || isCheckingUsername}
                                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {t('edit_user.saving_button', 'Menyimpan...')}
                                    </>
                                ) : (
                                    t('edit_user.save_button', 'Simpan')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Filter Modal */}
            <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            {t('filter_modal.title', 'Filter Users')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Role Filter */}
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {t('filter_modal.filter_by_role', 'Filter by Role')}
                            </Label>
                            <Select value={tempRoleFilter} onValueChange={setTempRoleFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('select_role', 'Select role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('filter_modal.role.all', 'All Roles')}</SelectItem>
                                    <SelectItem value="admin">{t('filter_modal.role.admin', 'Admin')}</SelectItem>
                                    <SelectItem value="support">{t('filter_modal.role.support', 'Support')}</SelectItem>
                                    <SelectItem value="billing">{t('filter_modal.role.billing', 'Billing')}</SelectItem>
                                    <SelectItem value="member">{t('filter_modal.role.member', 'Member')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {t('filter_modal.filter_by_status', 'Filter by Status')}
                            </Label>
                            <Select value={tempStatusFilter} onValueChange={setTempStatusFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('select_status', 'Select status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('filter_modal.status.all', 'All Status')}</SelectItem>
                                    <SelectItem value="active">{t('filter_modal.status.active', 'Active')}</SelectItem>
                                    <SelectItem value="blocked">{t('filter_modal.status.blocked', 'Blocked')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range Filter */}
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {t('filter_modal.filter_by_date', 'Filter by Date Range')}
                            </Label>
                            <div className="space-y-3">
                                {/* From Date */}
                                <div>
                                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                        {t('filter_modal.from_date', 'From Date')}
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            type="date"
                                            value={tempFromDate}
                                            onChange={(e) => setTempFromDate(e.target.value)}
                                            className="pl-10 w-full"
                                            max={tempEndDate || undefined}
                                        />
                                    </div>
                                </div>

                                {/* End Date */}
                                <div>
                                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                        {t('filter_modal.to_date', 'To Date')}
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            type="date"
                                            value={tempEndDate}
                                            onChange={(e) => setTempEndDate(e.target.value)}
                                            className="pl-10 w-full"
                                            min={tempFromDate || undefined}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={resetFiltersInModal}
                            className="flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            {t('filter_modal.reset', 'Reset')}
                        </Button>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={cancelFilters}
                            >
                                {t('filter_modal.cancel', 'Cancel')}
                            </Button>
                            <Button
                                onClick={applyFilters}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                            >
                                {t('filter_modal.apply', 'Apply Filters')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
