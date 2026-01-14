"use server";

import { createClient } from "@/utils/supabase/server";
import { invalidateSettingGlobalCache } from "./fetch";

export async function deleteSettingGlobal(id: number) {
  try {
    const supabase = await createClient();

    // Cek apakah data exists sebelum delete
    const { data: existingData, error: checkError } = await supabase
      .from("setting_global")
      .select("id, key, value")
      .eq("id", id)
      .single();

    if (checkError || !existingData) {
      return { 
        status: "error", 
        message: "Data setting global tidak ditemukan" 
      };
    }

    // Hapus data
    const { data: deletedData, error } = await supabase
      .from("setting_global")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error deleting setting global:", error);
      return { 
        status: "error", 
        message: "Gagal menghapus setting global",
        error: error.message 
      };
    }

    // Invalidate cache after successful delete
    await invalidateSettingGlobalCache();

    return {
      status: "success",
      message: `Setting global '${existingData.value}' berhasil dihapus`,
      data: deletedData?.[0] || existingData,
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

// Fungsi untuk soft delete (mengubah status menjadi 0/inactive)
export async function softDeleteSettingGlobal(id: number) {
  try {
    const supabase = await createClient();

    const { data: updatedData, error } = await supabase
      .from("setting_global")
      .update({ status: 0 })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error soft deleting setting global:", error);
      return { 
        status: "error", 
        message: "Gagal menonaktifkan setting global",
        error: error.message 
      };
    }

    if (!updatedData || updatedData.length === 0) {
      return { 
        status: "error", 
        message: "Data setting global tidak ditemukan" 
      };
    }

    // Invalidate cache after successful soft delete
    await invalidateSettingGlobalCache();

    return {
      status: "success",
      message: "Setting global berhasil dinonaktifkan",
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

// Fungsi untuk delete multiple records
export async function deleteMultipleSettingGlobal(ids: number[]) {
  try {
    const supabase = await createClient();

    const { data: deletedData, error } = await supabase
      .from("setting_global")
      .delete()
      .in("id", ids)
      .select();

    if (error) {
      console.error("Error deleting multiple setting global:", error);
      return { 
        status: "error", 
        message: "Gagal menghapus setting global",
        error: error.message 
      };
    }

    // Invalidate cache after successful delete
    await invalidateSettingGlobalCache();

    return {
      status: "success",
      message: `${deletedData?.length || 0} setting global berhasil dihapus`,
      data: deletedData,
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
