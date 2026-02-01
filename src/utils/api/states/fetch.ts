"use server";

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com";

export async function fetchStates(country_id?: number) {
  try {
    let url = `${API_BASE_URL}/api/v1/States`;

    // Use specific endpoint if country_id is provided
    if (country_id) {
      url = `${API_BASE_URL}/api/v1/States/country/${country_id}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      console.error("[fetchStates] API Error:", response.status, url);
      return { success: false, message: `Failed to fetch provinces: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, message: "Provinces fetched successfully", data };
  } catch (error) {
    console.error("[fetchStates] Error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function fetchStatesById(id: number) {
  try {
    const url = `${API_BASE_URL}/api/v1/States/${id}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      // Try fallback or just return error
      console.error("[fetchStatesById] API Error:", response.status);
      return { success: false, message: `Failed to fetch province: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, message: "Provinces fetched successfully", data };
  } catch (error) {
    console.error("[fetchStatesById] Error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}
