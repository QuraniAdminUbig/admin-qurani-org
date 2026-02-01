"use server";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com";

export async function fetchCountries() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/Countries`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 86400 } // Cache for 24 hours (Master data rarely changes)
    });

    if (!response.ok) {
      console.error("[fetchCountries] API Error:", response.status);
      return { success: false, message: `Failed to fetch countries: ${response.status}` };
    }

    const result = await response.json();

    // Handle both array response and wrapped data response
    const data = Array.isArray(result) ? result : (Array.isArray(result.data) ? result.data : []);

    return { success: true, message: "Countries fetched successfully", data };
  } catch (error) {
    console.error("[fetchCountries] Error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}
