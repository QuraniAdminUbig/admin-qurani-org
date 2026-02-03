"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { masterdataApi, CountryData, StateData } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    Loader2,
    ArrowLeft,
    MapPin,
    Building2,
    Globe,
    Phone,
    DollarSign,
    Search,
    MoreVertical,
    Calendar,
    Flag
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface CountryDetailProps {
    id: string
}

export function CountryDetail({ id }: CountryDetailProps) {
    const router = useRouter()
    const [country, setCountry] = useState<CountryData | null>(null)
    const [states, setStates] = useState<StateData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                // Fetch country details
                const countryResponse = await masterdataApi.countries.getById(id)
                let countryData: CountryData | null = null

                if ('data' in countryResponse && countryResponse.data) {
                    // Start of Selection
                    // Check if data is an array (some endpoints return array for singular get, rare but possible)
                    if (Array.isArray(countryResponse.data)) {
                        countryData = countryResponse.data[0]
                    } else {
                        countryData = countryResponse.data as CountryData
                    }
                } else if ('id' in countryResponse) {
                    countryData = countryResponse as unknown as CountryData
                }

                if (!countryData) {
                    throw new Error("Country not found")
                }

                setCountry(countryData)

                // Optional: Fetch states for this country
                // Currently API might not support filtering states by country ID directly in simple call
                // Assuming we might fetch them or just show placeholder for now
                // setStates([]) 

            } catch (err) {
                console.error("Error fetching country details:", err)
                setError("Failed to load country details")
                toast.error("Failed to load country details")
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchData()
        }
    }, [id])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
                <p className="text-gray-500">Loading country details...</p>
            </div>
        )
    }

    if (error || !country) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <Flag className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Country Not Found</h3>
                <p className="text-gray-500 mb-6">{error || "The country you are looking for does not exist."}</p>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-[#2A1C1C] dark:bg-[#1a0f0f] border border-gray-200 dark:border-gray-800 shadow-sm">
                {/* Gradient Overlay - using reddish/brownish tone from reference or custom dark gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#4A3B3B] to-[#2A1C1C]" />

                {/* Content */}
                <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* Flag Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center text-4xl md:text-5xl shadow-xl">
                            {country.emoji || country.iso2}
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0 text-white space-y-2">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-bold truncate pr-4">
                                {country.name}
                            </h1>
                            {/* Actions Menu Placeholder */}
                            <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 rounded-full">
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-white/70 text-sm md:text-base max-w-2xl">
                            {country.region} {country.subregion && `• ${country.subregion}`}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10 backdrop-blur-md">
                                {country.iso2} / {country.iso3}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10 backdrop-blur-md">
                                +{country.phoneCode}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Capital</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{country.capital || "N/A"}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Region</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{country.region || "Global"}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Currency</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{country.currency || "N/A"}</p>
                    </div>
                </div>
            </div>

            {/* States & Data Section (Placeholder for now) */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">States / Provinces</h3>
                        <p className="text-sm text-gray-500">Administrative divisions of {country.name}</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search states..."
                            className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                    </div>
                </div>

                <div className="p-12 text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>State list data currently unavailable in this view.</p>
                </div>
            </div>
        </div>
    )
}
