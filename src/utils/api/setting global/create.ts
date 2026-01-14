"use server";

import { createClient } from "@/utils/supabase/server";
import { SettingGlobal } from "@/types/setting global";
import { invalidateSettingGlobalCache } from "./fetch";

interface CreateSettingGlobalData {
  key: string;
  value: string;
  color: string;
  status: number;
}

interface ApiResponse {
  status: "success" | "error";
  message: string;
  data?: SettingGlobal;
}

// Get next available key for sa (kesalahan ayat) or sk (kesalahan kata)
export async function getNextKey(type: "sa" | "sk"): Promise<string> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("setting_global")
      .select("key")
      .like("key", `${type}-%`);

    if (error) {
      console.error("Error fetching keys:", error);
      return `${type}-1`;
    }

    if (!data || data.length === 0) {
      return `${type}-1`;
    }

    // Extract numbers from all keys and find the maximum
    const numbers = data
      .map((item) => {
        const match = item.key.match(/(\w+)-(\d+)/);
        return match ? parseInt(match[2]) : 0;
      })
      .filter((num) => num > 0);

    if (numbers.length === 0) {
      return `${type}-1`;
    }

    const maxNumber = Math.max(...numbers);
    return `${type}-${maxNumber + 1}`;
  } catch (error) {
    console.error("Error in getNextKey:", error);
    return `${type}-1`;
  }
}

// Get next available ID
async function getNextId(): Promise<number> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("setting_global")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching max ID:", error);
      return 1;
    }

    if (!data || data.length === 0) {
      return 1;
    }

    return data[0].id + 1;
  } catch (error) {
    console.error("Error in getNextId:", error);
    return 1;
  }
}

// Create new setting global
export async function createSettingGlobal(
  data: CreateSettingGlobalData
): Promise<ApiResponse> {
  const supabase = await createClient();

  try {
    // Get next available ID
    const nextId = await getNextId();

    const { data: result, error } = await supabase
      .from("setting_global")
      .insert([
        {
          id: nextId,
          key: data.key,
          value: data.value,
          color: data.color,
          status: data.status,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating setting global:", error);
      return {
        status: "error",
        message: "Gagal membuat setting global: " + error.message,
      };
    }

    await invalidateSettingGlobalCache();

    return {
      status: "success",
      message: "Setting global berhasil dibuat",
      data: result,
    };
  } catch (error) {
    console.error("Error in createSettingGlobal:", error);
    return {
      status: "error",
      message: "Terjadi kesalahan saat membuat setting global",
    };
  }
}
