"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import { User } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"
import useSWR from "swr"

interface UserProfile {
    id: string
    name: string
    username: string
    email: string
    avatar: string
    role?: string // Added role field
}

interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    loading: boolean
    error: string | null
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [sessionLoading, setSessionLoading] = useState(true)
    const [authError, setAuthError] = useState<string | null>(null)

    const supabase = useMemo(() => createClient(), [])

    // 1. Initial Session Check (Run Once)
    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error) throw error
                setUser(session?.user ?? null)
            } catch (err) {
                setAuthError(err instanceof Error ? err.message : "Failed to get session")
            } finally {
                setSessionLoading(false)
            }
        }

        initAuth()

        // 2. Realtime Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                setAuthError(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // 3. User Profile Fetching with SWR (Cached)
    const fetcher = async (userId: string) => {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("id, name, username, email, avatar, role")
            .eq("auth", userId)
            .single()

        if (error) throw error
        return data
    }

    const { data: profile, error: profileError, mutate } = useSWR(
        user?.id ? `profile-${user.id}` : null,
        () => fetcher(user!.id),
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false
        }
    )

    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut()
            setUser(null)
            mutate(undefined, false) // Clear cache
        } catch (err) {
            console.error("Sign out failed", err)
        }
    }, [supabase, mutate])

    const refreshProfile = useCallback(async () => {
        await mutate()
    }, [mutate])

    const value = useMemo(() => ({
        user,
        profile: profile || null,
        loading: sessionLoading || (!!user && !profile && !profileError),
        error: authError || (profileError ? "Failed to load profile" : null),
        signOut,
        refreshProfile
    }), [user, profile, sessionLoading, profileError, authError, signOut, refreshProfile])

    // 4. Enforce Privileged Roles Access
    // Allowed roles: admin, billing, support
    useEffect(() => {
        if (!sessionLoading && user && profile) {
            const userRole = profile.role || 'member'; // Default to member if undefined
            const allowedRoles = ["admin", "billing", "support"]

            if (!allowedRoles.includes(userRole)) {
                console.warn("Unauthorized access attempt by:", userRole)
                setAuthError("Akses Ditolak: Anda tidak memiliki izin untuk mengakses aplikasi ini.")
                // Note: The actual logout and redirect is handled by middleware
                // This is just for client-side UX feedback
            }
        }
    }, [user, profile, sessionLoading])


    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuthContext = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuthContext must be used within an AuthProvider")
    }
    return context
}
