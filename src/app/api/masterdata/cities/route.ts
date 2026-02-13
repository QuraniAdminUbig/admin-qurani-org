import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_MY_API_URL || 'https://api.myqurani.com';

// In-memory cache to store grouped city results
// Cache key can be countryId, stateId, or specific country codes string
const cityCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 Jam cache

/**
 * Enhanced Cities Proxy Route
 * Handles multiple backend pages on the server side to provide a single "bundle" response to the client.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { countryId, stateId, codes } = body;

        // Create a unique cache key
        const cacheKey = stateId ? `state_${stateId}` : countryId ? `country_${countryId}` : `codes_${codes}`;

        // Check cache first
        const now = Date.now();
        const cached = cityCache.get(cacheKey);
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            return NextResponse.json({
                success: true,
                data: cached.data,
                count: cached.data.length,
                cached: true
            });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get("myqurani_access_token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const allCities: any[] = [];
        const pageSize = 100; // Standard backend limit
        const jumboSize = 5000;

        // Helper to fetch all pages with CONTROLLED PARALLEL BATCHING
        const fetchAllPages = async (url: string) => {
            const results: any[] = [];
            let hasReachedEnd = false;
            const pageBatchSize = 4; // Lebih konservatif agar tidak membentur limit backend
            let startPage = 1;

            while (!hasReachedEnd && startPage <= 50) {
                const pagesToFetch = Array.from({ length: pageBatchSize }, (_, i) => startPage + i);

                const batchPromises = pagesToFetch.map(async (page) => {
                    const separator = url.includes('?') ? '&' : '?';
                    const paginatedUrl = `${url}${separator}page=${page}&pageSize=${jumboSize}`;

                    try {
                        const response = await fetch(paginatedUrl, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/json',
                            }
                        });
                        if (!response.ok) return null;
                        const json = await response.json();
                        return json.success && json.data && Array.isArray(json.data) ? json.data : [];
                    } catch {
                        return null;
                    }
                });

                const batchResponses = await Promise.all(batchPromises);

                for (const data of batchResponses) {
                    if (data === null || data.length === 0) {
                        hasReachedEnd = true;
                        break;
                    }
                    results.push(...data);

                    // Jika data kurang dari 100, berarti habis (backend limit 100)
                    if (data.length < 100) {
                        hasReachedEnd = true;
                        break;
                    }
                }

                if (hasReachedEnd) break;
                startPage += pageBatchSize;
            }
            return results;
        };

        if (stateId) {
            const data = await fetchAllPages(`${API_BASE}/api/v1/Cities/state/${stateId}`);
            allCities.push(...data);
        } else if (countryId) {
            const data = await fetchAllPages(`${API_BASE}/api/v1/Cities/country/${countryId}`);
            allCities.push(...data);
        } else if (codes) {
            const countryCodes = codes.split(",");

            // Proses per batch kecil (misal 5 negara sekaligus) agar tidak meledak
            const countryBatchSize = 5;
            for (let i = 0; i < countryCodes.length; i += countryBatchSize) {
                const currentBatch = countryCodes.slice(i, i + countryBatchSize);
                const batchResults = await Promise.all(
                    currentBatch.map((code: string) => fetchAllPages(`${API_BASE}/api/v1/Cities/country-code/${code}`))
                );
                batchResults.forEach(data => allCities.push(...data));
            }
        }

        // Remove duplicates if any
        const uniqueCities = Array.from(new Map(allCities.map(item => [item.id, item])).values());

        // Save to cache for next time
        if (uniqueCities.length > 0) {
            cityCache.set(cacheKey, { data: uniqueCities, timestamp: Date.now() });
        }

        return NextResponse.json({
            success: true,
            data: uniqueCities,
            count: uniqueCities.length,
            cached: false
        });

    } catch (error) {
        console.error("[CitiesBundle] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
