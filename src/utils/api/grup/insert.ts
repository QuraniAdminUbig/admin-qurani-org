"use server";
import { generateId } from "@/lib/generateId";
import { createClient } from "../../supabase/server";
import { revalidatePath } from "next/cache";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { id } from "date-fns/locale";

export async function insertGrup(
  form: FormData,
  photo: File | null
): Promise<{ status: "success" | "error"; message: string }> {
  const supabase = await createClient();

  let photoPath = null;
  // 2. Unggah foto hanya jika ada
  if (photo) {
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { data: dataUpload, error: errorUpload } = await supabase.storage
      .from("qurani_storage")
      .upload("grup_profil" + photo.name + "-" + Date.now(), buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: photo.type,
      });
    console.log("Photo uploaded:", dataUpload);
    if (errorUpload) {
      console.error("Error uploading photo:", errorUpload);
      return { status: "error", message: "Upload foto gagal." };
    }
    photoPath = dataUpload.path;
  }

  // 3. Masukkan data ke tabel 'grup'
  const { data: dataGrup, error: errorGrup } = await supabase
    .from("grup")
    .insert({
      id: generateId(),
      name: form.get("name"),
      category_id: form.get("category"),
      owner_id: form.get("owner_id"),
      description: form.get("description"),
      photo_path: photoPath,
      type: form.get("status"),
      country_id: form.get("country_id"),
      country_name: form.get("country_name"),
      state_id: form.get("province_id"),
      state_name: form.get("province_name"),
      city_id: form.get("city_id"),
      city_name: form.get("city_name")
    })
    .select();

  if (errorGrup) {
    console.error("Error inserting grup:", errorGrup);
    return { status: "error", message: "Grup Gagal Dibuat" };
  }

  const newGrupId = dataGrup ? dataGrup[0].id : null;

  if (!newGrupId) {
    console.error("Failed to get new group ID after insertion.");
    return { status: "error", message: "Grup Gagal Dibuat" };
  }

  // 4. Masukkan data ke tabel 'grup_members'
  const { error: errorMemberGrup } = await supabase
    .from("grup_members")
    .insert({
      id: generateId(),
      grup_id: newGrupId,
      user_id: form.get("owner_id"),
      role: "owner",
    });

  if (errorMemberGrup) {
    console.error("Error inserting grup member:", errorMemberGrup);
    return { status: "error", message: "Grup Gagal Dibuat" };
  }

  revalidatePath("/setoran/grup", "layout");
  return { status: "success", message: "Grup Berhasil Dibuat" };
}

export async function joinGrup(grupId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase.from("grup_members").insert({
    grup_id: grupId,
    user_id: user.user?.id,
    role: "member",
  });

  if (error) {
    throw new Error("Gagal bergabung ke grup.");
  }
  revalidatePath("/setoran/grup", "layout");
  return { status: "success", message: "Berhasil bergabung ke grup." };
}
