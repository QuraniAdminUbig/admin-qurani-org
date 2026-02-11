import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_MY_API_URL || 'https://api.myqurani.com';

// Simple in-memory cache to speed up repeat requests
// In production, you might use Redis or a more robust solution
const cityCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { codes } = body;

        if (!codes) {
            return NextResponse.json({ success: false, error: "Missing country codes" }, { status: 400 });
        }

        const countryCodes = codes.split(",");
        const cookieStore = await cookies();
        const token = cookieStore.get("myqurani_access_token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const now = Date.now();
        const allCities: any[] = [];
        const codesToFetch: string[] = [];

        // Check cache first
        countryCodes.forEach((code: string) => {
            const cached = cityCache.get(code);
            if (cached && (now - cached.timestamp < CACHE_TTL)) {
                allCities.push(...cached.data);
            } else {
                codesToFetch.push(code);
            }
        });

        // Fetch only what's not in cache
        if (codesToFetch.length > 0) {
            const fetchResults = await Promise.allSettled(
                codesToFetch.map(async (code: string) => {
                    const response = await fetch(`${API_BASE}/api/v1/Cities/country-code/${code}?page=1&pageSize=10000`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch for ${code}: ${response.status}`);
                    }

                    const json = await response.json();

                    // Save to cache if successful
                    if (json.success && json.data) {
                        let data = [];
                        if (Array.isArray(json.data)) {
                            data = json.data;
                        } else if (json.data.items) {
                            data = json.data.items;
                        }
                        cityCache.set(code, { data, timestamp: now });
                        return data;
                    }
                    return [];
                })
            );

            fetchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    allCities.push(...result.value);
                }
            });
        }

        return NextResponse.json({
            success: true,
            data: allCities,
            count: allCities.length,
            fromCache: codesToFetch.length === 0
        });

    } catch (error) {
        console.error("[CitiesBundle] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
