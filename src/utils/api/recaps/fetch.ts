"use server";

import { IRecap, MonthRecap } from "@/types/recap";
import { createClient } from "@/utils/supabase/server";

export const getAllMonthRecap = async (): Promise<{
  success: boolean;
  message: string;
  data?: MonthRecap[];
}> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recaps")
    .select("created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return { success: false, message: error.message };
  }

  // Asumsikan data dan error sudah didapat dari kueri Supabase di atas
  if (data) {
    // Gunakan 'Map' untuk menyimpan bulan unik (key: 'YYYY-MM', value: {label: 'Bulan Tahun'})
    const uniqueMonthsMap = new Map();

    data.forEach((recap) => {
      // Buat objek Date dari string tanggal
      const date = new Date(recap.created_at);

      // Dapatkan tahun dan bulan
      const year = date.getFullYear();
      const monthIndex = date.getMonth();

      // Format nama bulan dan tahun untuk ditampilkan ke user
      const formattedDate = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(date);

      // Buat kunci unik untuk filter
      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`; // Contoh: '2025-09'

      // Tambahkan ke Map jika belum ada
      if (!uniqueMonthsMap.has(key)) {
        uniqueMonthsMap.set(key, {
          value: key,
          label: formattedDate,
        });
      }
    });

    // Ubah Map menjadi array dari objek
    const uniqueMonths = Array.from(uniqueMonthsMap.values());

    console.log(uniqueMonths);
    return {
      success: true,
      message: "Recap fetched successfully",
      data: uniqueMonths,
    };
    /* Akan menghasilkan array objek seperti:
           [
             { yearMonth: '2025-09', monthName: 'September' },
             { yearMonth: '2025-08', monthName: 'Agustus' },
             // ... dan seterusnya
           ]
        */
  }
  // Jika tidak ada data dan tidak terjadi error, kembalikan respons kosong
  return {
    success: true,
    message: "No recaps found",
    data: [] as MonthRecap[],
  };
};

export const getRecapsByExaminerId = async (
  examinerId: string,
  limit?: number,
  offset?: number
) => {
  const supabase = await createClient();

  let query = supabase
    .from("recaps")
    .select(
      "*, reciter:reciter_id(*), signed_by(*), examiner:examiner_id(*), group:group_id(*)",
      { count: "exact" }
    )
    .eq("examiner_id", examinerId)
    .order("created_at", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  if (offset !== undefined) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    return {
      success: false,
      message: error.message,
      data: [] as IRecap[],
      count: 0,
    };
  }

  return {
    success: true,
    message: "get recaps by Examiner id successfully",
    data: data as IRecap[],
    count: count || 0,
  };
};

export const getRecapsByReciterId = async (
  reciterId: string,
  limit?: number,
  offset?: number
) => {
  const supabase = await createClient();

  let query = supabase
    .from("recaps")
    .select(
      "*, reciter:reciter_id(*), signed_by(*), examiner:examiner_id(*), group:group_id(*)",
      { count: "exact" }
    )
    .eq("reciter_id", reciterId)
    .order("created_at", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  if (offset !== undefined) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    return {
      success: false,
      message: error.message,
      data: [] as IRecap[],
      count: 0,
    };
  }

  return {
    success: true,
    message: "get recaps by reciter id successfully",
    data: data as IRecap[],
    count: count || 0,
  };
};

export const getRecapById = async (id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recaps")
    .select(
      "*, reciter:reciter_id(*), signed_by(*), examiner:examiner_id(*), group:group_id(*)"
    )
    .eq("id", id)
    .single();

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "get recap by id successfully",
    data: data as IRecap,
  };
};

export const getRecapAll = async (
  user_id: string,
  limit?: number,
  offset?: number
) => {
  const supabase = await createClient();

  let query = supabase
    .from("recaps")
    .select(
      "*, reciter:reciter_id(*), signed_by(*), examiner:examiner_id(*), group:group_id(*)",
      { count: "exact" }
    )
    .or(`reciter_id.eq.${user_id},examiner_id.eq.${user_id}`)
    .order("created_at", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  if (offset !== undefined) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }

  const { data, error, count } = await query;

  console.log("getRecapAll - count:", count);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "get recap All successfully",
    data: data as IRecap[],
    count: count || 0,
  };
};

// Admin function to get ALL recaps without user filtering
export const getRecapAllAdmin = async (
  limit?: number,
  offset?: number
) => {
  const supabase = await createClient();

  let query = supabase
    .from("recaps")
    .select(
      "*, reciter:reciter_id(*), signed_by(*), examiner:examiner_id(*), group:group_id(*)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  if (offset !== undefined) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }

  const { data, error, count } = await query;

  console.log("getRecapAllAdmin - count:", count);

  if (error) {
    return {
      success: false,
      message: error.message,
      data: [],
      count: 0,
    };
  }

  return {
    success: true,
    message: "get all recaps for admin successfully",
    data: data as IRecap[],
    count: count || 0,
  };
};
