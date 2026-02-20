import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_MY_API_URL || 'https://api.myqurani.com';

// Server-side in-memory cache for full country details
// Data rarely changes, so 24h TTL is safe
let _cache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 jam

/**
 * GET /api/masterdata/countries
 *
 * Aggregates full country details (with currency, region, etc.) from the backend.
 * The backend /api/v1/Countries only returns simplified data (no currency field),
 * so this route batch-fetches each country by ID in parallel on the server side,
 * caches the result for 24h, and returns it as a single response to the client.
 *
 * Optional query param: ?currency=IDR  → filters results to only countries using that currency
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const currencyFilter = searchParams.get('currency')?.trim().toUpperCase() ?? null;

        const now = Date.now();

        // Serve from cache if still fresh
        if (_cache && (now - _cache.timestamp < CACHE_TTL)) {
            const data = currencyFilter
                ? _cache.data.filter(c => c.currency?.trim().toUpperCase() === currencyFilter)
                : _cache.data;

            return NextResponse.json({
                success: true,
                data,
                count: data.length,
                cached: true,
            });
        }

        // Read auth token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get("myqurani_access_token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Step 1: Get all simplified country IDs (1 request)
        const listRes = await fetch(`${API_BASE}/api/v1/Countries`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
            cache: 'no-store',
        });

        if (!listRes.ok) {
            return NextResponse.json({ success: false, error: "Failed to fetch country list" }, { status: 502 });
        }

        const listJson = await listRes.json();
        if (!listJson?.data || !Array.isArray(listJson.data)) {
            return NextResponse.json({ success: true, data: [], count: 0, cached: false });
        }

        const ids: number[] = listJson.data.map((c: any) => c.id);

        // Step 2: Fetch all country details in full parallel (server-to-server is fast)
        // Split into batches of 50 to avoid overwhelming the backend
        const BATCH = 50;
        const allDetails: any[] = [];

        for (let i = 0; i < ids.length; i += BATCH) {
            const batch = ids.slice(i, i + BATCH);
            const results = await Promise.allSettled(
                batch.map(id =>
                    fetch(`${API_BASE}/api/v1/Countries/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                        },
                        cache: 'no-store',
                    }).then(r => r.ok ? r.json() : null)
                )
            );

            results.forEach(r => {
                if (r.status === 'fulfilled' && r.value?.data) {
                    allDetails.push(r.value.data);
                }
            });
        }

        // Save to server-side cache
        _cache = { data: allDetails, timestamp: Date.now() };

        // Filter if currency query param was provided
        const filtered = currencyFilter
            ? allDetails.filter(c => c.currency?.trim().toUpperCase() === currencyFilter)
            : allDetails;

        return NextResponse.json({
            success: true,
            data: filtered,
            count: filtered.length,
            cached: false,
        });

    } catch (error) {
        console.error("[MasterdataCountries] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
