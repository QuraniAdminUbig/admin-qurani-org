"use server";

import { createClient } from "@/utils/supabase/server";
import { EditLabelData } from "@/types/setting global";
import { invalidateSettingGlobalCache } from "./fetch";

export async function updateSettingGlobal(id: number, data: EditLabelData) {
  try {
    const supabase = await createClient();

    const { data: updatedData, error } = await supabase
      .from("setting_global")
      .update({
        value: data.value,
        color: data.color,
        status: data.status,
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating setting global:", error);
      return { 
        status: "error", 
        message: "Gagal mengupdate setting global",
        error: error.message 
      };
    }

    if (!updatedData || updatedData.length === 0) {
      return { 
        status: "error", 
        message: "Data setting global tidak ditemukan" 
      };
    }

    // Invalidate cache after successful update
    await invalidateSettingGlobalCache();

    return {
      status: "success",
      message: "Setting global berhasil diupdate",
      data: updatedData[0],
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { 
      status: "error", 
      message: "Terjadi kesalahan tidak terduga",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Fungsi untuk update status saja (enable/disable)
export async function updateSettingGlobalStatus(id: number, status: number) {
  try {
    const supabase = await createClient();

    const { data: updatedData, error } = await supabase
      .from("setting_global")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating setting global status:", error);
      return { 
        status: "error", 
        message: "Gagal mengupdate status setting global",
        error: error.message 
      };
    }

    if (!updatedData || updatedData.length === 0) {
      return { 
        status: "error", 
        message: "Data setting global tidak ditemukan" 
      };
    }

    // Invalidate cache after successful update
    await invalidateSettingGlobalCache();

    return {
      status: "success",
      message: "Status setting global berhasil diupdate",
      data: updatedData[0],
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { 
      status: "error", 
      message: "Terjadi kesalahan tidak terduga",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
