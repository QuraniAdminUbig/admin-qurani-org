"use server"

import type { PostgrestError } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"
import type { AdminDashboardSummary, DashboardCountItem } from "@/types/admin-dashboard"

const PROFILE_TABLE = "user_profiles"
const ROLE_COLUMN = "role"
const BLOCKED_COLUMN = "isBlocked"
const ROLE_ADMIN = "admin"
const LOCATION_COLUMNS = "countryName, stateName, cityName, gender"
const TOP_LIMIT = 58
const CACHE_TTL_MS = 60 * 1000

let cachedSummary:
  | {
      data: AdminDashboardSummary
      expiresAt: number
    }
  | null = null

type ProfileLocationRow = {
  countryName: string | null
  stateName: string | null
  cityName: string | null
  gender: number | null
}

const normalizeLabel = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : "Unknown"
  }

  if (value === null || value === undefined) {
    return "Unknown"
  }

  return String(value)
}

const increment = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1)
}

const toTopList = (map: Map<string, number>, limit: number): DashboardCountItem[] => {
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

const buildSummary = async (): Promise<AdminDashboardSummary> => {
  const start = Date.now()
  const supabase = await createClient()

  const [totalUsersResult, totalAdminsResult, blockedResult, profilesResult] = await Promise.all([
    supabase.from(PROFILE_TABLE).select("id", { count: "exact", head: true }),
    supabase
      .from(PROFILE_TABLE)
      .select("id", { count: "exact", head: true })
      .eq(ROLE_COLUMN, ROLE_ADMIN),
    supabase
      .from(PROFILE_TABLE)
      .select("id", { count: "exact", head: true })
      .eq(BLOCKED_COLUMN, true),
    supabase.from(PROFILE_TABLE).select(LOCATION_COLUMNS),
  ])

  const errors = [
    totalUsersResult.error,
    totalAdminsResult.error,
    blockedResult.error,
    profilesResult.error,
  ].filter(Boolean) as PostgrestError[]

  if (errors.length > 0) {
    const message = errors.map((error) => error.message).join(" | ")
    throw new Error(message)
  }

  const totalUsers = totalUsersResult.count ?? 0
  const blockedUsers = blockedResult.count ?? 0
  const activeUsers = Math.max(totalUsers - blockedUsers, 0)
  const activeRule = `Active = ${BLOCKED_COLUMN} is false or null`

  const profiles = (profilesResult.data || []) as ProfileLocationRow[]
  const countryCounts = new Map<string, number>()
  const stateCounts = new Map<string, number>()
  const cityCounts = new Map<string, number>()
  const genderCounts = new Map<string, number>()

  for (const profile of profiles) {
    increment(countryCounts, normalizeLabel(profile.countryName))
    increment(stateCounts, normalizeLabel(profile.stateName))
    increment(cityCounts, normalizeLabel(profile.cityName))

    const genderLabel =
      profile.gender === 1 ? "Male" : profile.gender === 2 ? "Female" : "Unknown"
    increment(genderCounts, genderLabel)
  }

  const summary: AdminDashboardSummary = {
    cards: {
      totalUsers,
      totalAdmins: totalAdminsResult.count ?? 0,
      activeUsers,
      blockedUsers,
    },
    charts: {
      topCountries: toTopList(countryCounts, TOP_LIMIT),
      topStates: toTopList(stateCounts, TOP_LIMIT),
      topCities: toTopList(cityCounts, TOP_LIMIT),
      genderCounts: toTopList(genderCounts, TOP_LIMIT),
    },
    meta: {
      activeRule,
      sourceTable: PROFILE_TABLE,
    },
  }

  const durationMs = Date.now() - start
  console.info(`[admin-dashboard] summary fetched in ${durationMs}ms`)

  return summary
}

export async function fetchAdminDashboardSummary() {
  const now = Date.now()
  if (cachedSummary && cachedSummary.expiresAt > now) {
    return cachedSummary.data
  }

  const summary = await buildSummary()
  cachedSummary = {
    data: summary,
    expiresAt: now + CACHE_TTL_MS,
  }
  return summary
}
