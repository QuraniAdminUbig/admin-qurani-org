"use client";

import { useState, useCallback, useEffect } from "react";
import { MappedGroup } from "@/types/grup";
import { ClientCache, CACHE_KEYS, CACHE_TTL } from "@/utils/cache/client-cache";
import { fetchGroups } from "@/utils/api/grup/fetch";
import { MyGroup } from "@/types/grup";

interface UseGrupCacheReturn {
  groups: MappedGroup[];
  isLoading: boolean;
  error: string | null;
  isFromCache: boolean;
  lastUpdated: Date | null;
  remainingTTL: number;
  refreshGroups: () => Promise<void>;
  clearCache: () => void;
  isBackgroundRefreshing: boolean;
}

export function useGrupCache(userId: string | undefined): UseGrupCacheReturn {
  const cacheKey = userId ? CACHE_KEYS.USER_GROUPS(userId) : '';
  
  // Initialize with cached data immediately if available
  const [groups, setGroups] = useState<MappedGroup[]>(() => {
    if (!userId || !cacheKey) return [];
    const cachedData = ClientCache.get<MappedGroup[]>(cacheKey);
    return cachedData || [];
  });
  
  const [error, setError] = useState<string | null>(null);
  
  const [isFromCache, setIsFromCache] = useState(() => {
    if (!userId || !cacheKey) return false;
    return !!ClientCache.get<MappedGroup[]>(cacheKey);
  });
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    if (!userId || !cacheKey) return null;
    const cachedData = ClientCache.get<MappedGroup[]>(cacheKey);
    return cachedData ? new Date() : null;
  });
  
  const [remainingTTL, setRemainingTTL] = useState(() => {
    if (!userId || !cacheKey) return 0;
    return ClientCache.getRemainingTTL(cacheKey);
  });
  
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    if (!userId || !cacheKey) return true;
    // If we have cache, it's not initial load
    const hasCache = !!ClientCache.get<MappedGroup[]>(cacheKey);
    return !hasCache;
  });

  // Detect if this is a page refresh vs navigation using sessionStorage
  const isPageRefresh = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      // Check if there's a navigation flag from sidebar/router navigation
      const navigationFlag = sessionStorage.getItem('qurani-sidebar-navigation');
      
      if (navigationFlag) {
        // Clear the flag and treat as navigation (not refresh)
        sessionStorage.removeItem('qurani-sidebar-navigation');
        return false;
      }
      
      // No navigation flag means this could be a page refresh
      // But let's also check performance API as backup
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const navType = navEntries[0].type;
        // Only treat as refresh if it's explicitly reload and no navigation flag
        return navType === 'reload';
      }
      
      return true;
    } catch (error) {
      console.error("Error checking page refresh:", error);
      return false;
    }
  }, []);

  // Initialize loading state based on cache availability
  const [isLoading, setIsLoading] = useState(() => {
    if (!userId || !cacheKey) return false;
    // Check if cache exists and is valid
    const cachedData = ClientCache.get<MappedGroup[]>(cacheKey);
    return !cachedData; // Only show loading if no cache available
  });

  // Background refresh state - doesn't affect main loading UI
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  // Function to map raw data to MappedGroup format
  const mapGroupData = useCallback((rawData: MyGroup[]): MappedGroup[] => {
    return rawData.map((item) => ({
      id: item.grup.id,
      name: item.grup.name,
      description: item.grup.description,
      avatar: item.grup.photo_path ?
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${item.grup.photo_path}` :
        undefined,
      memberCount: 0,
      isPrivate: item.grup.is_private,
      role: item.role,
      lastActivity: '',
      createdAt: item.grup.created_at,
      total_members: item.grup.grup_members[0]?.count || 0,
    }));
  }, []);

  // Function to load groups from cache or API
  const loadGroups = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId || !cacheKey) return;

    setError(null);

    try {
      // On initial load, check if it's a page refresh
      const pageRefreshDetected = isPageRefresh();
      const shouldForceRefresh = forceRefresh || (isInitialLoad && pageRefreshDetected);
      
      // Always try to get from cache first for instant loading
      const cachedData = ClientCache.get<MappedGroup[]>(cacheKey);
      
      if (cachedData && !shouldForceRefresh) {
        // Load from cache instantly without loading state
        setGroups(cachedData);
        setIsFromCache(true);
        setLastUpdated(new Date());
        setRemainingTTL(ClientCache.getRemainingTTL(cacheKey));
        setIsInitialLoad(false);
        
        // Start background refresh to get fresh data
        // Only do background refresh if cache is getting old (> 5 minutes) and not expired
        const cacheTimestamp = ClientCache.getTimestamp(cacheKey) || 0;
        const cacheAge = Date.now() - cacheTimestamp;
        const shouldBackgroundRefresh = cacheAge > (5 * 60 * 1000) && !ClientCache.isExpired(cacheKey); // 5 minutes
        
        if (shouldBackgroundRefresh) {
          setIsBackgroundRefreshing(true);
          
          try {
            const res = await fetchGroups();

            if (res.status === 'success' && res.data && Array.isArray(res.data)) {
              const rawData = res.data as unknown as MyGroup[];
              const mappedData = mapGroupData(rawData);
              
              // Update cache silently
              ClientCache.set(cacheKey, mappedData, CACHE_TTL.USER_GROUPS);
              
              // Update state with fresh data
              setGroups(mappedData);
              setIsFromCache(false);
              setLastUpdated(new Date());
              setRemainingTTL(CACHE_TTL.USER_GROUPS);
            }
          } catch (err) {
            console.error('Background refresh error:', err);
            // Don't show error for background refresh failures
          } finally {
            setIsBackgroundRefreshing(false);
          }
        }
        
        return;
      }

      // Only show loading when no cache available
      if (!cachedData) {
        setIsLoading(true);
      }

      // Fetch from API
      const res = await fetchGroups();
      
      if (res.status === 'success' && res.data && Array.isArray(res.data)) {
        const rawData = res.data as unknown as MyGroup[];
        const mappedData = mapGroupData(rawData);
        
        // Update state
        setGroups(mappedData);
        setIsFromCache(false);
        setLastUpdated(new Date());
        
        // Cache the data
        ClientCache.set(cacheKey, mappedData, CACHE_TTL.USER_GROUPS);
        setRemainingTTL(CACHE_TTL.USER_GROUPS);
      } else {
        setError(res.message || 'Failed to load group data');
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('An error occurred while fetching group data');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [userId, cacheKey, mapGroupData, isInitialLoad, isPageRefresh]);

  // Function to manually refresh data
  const refreshGroups = useCallback(async () => {
    await loadGroups(true);
  }, [loadGroups]);

  // Function to clear cache
  const clearCache = useCallback(() => {
    if (cacheKey) {
      ClientCache.remove(cacheKey);
      setIsFromCache(false);
      setRemainingTTL(0);
    }
  }, [cacheKey]);

  // Update remaining TTL periodically
  useEffect(() => {
    if (!cacheKey || !isFromCache) return;

    const interval = setInterval(() => {
      const remaining = ClientCache.getRemainingTTL(cacheKey);
      setRemainingTTL(remaining);
      
      // If cache expired, mark as not from cache
      if (remaining <= 0) {
        setIsFromCache(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cacheKey, isFromCache]);

  // Load groups on mount or when userId changes
  useEffect(() => {
    // Always trigger loadGroups to handle cache and background refresh logic
    loadGroups();
  }, [loadGroups, userId]);

  return {
    groups,
    isLoading,
    error,
    isFromCache,
    lastUpdated,
    remainingTTL,
    refreshGroups,
    clearCache,
    isBackgroundRefreshing,
  };
}
