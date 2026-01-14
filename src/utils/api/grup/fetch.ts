"use server";
import { createClient } from "../../supabase/server";
import { Grup } from "@/types/grup";

type GrupMemberWithGrup = {
  grup: Grup;
};

export async function fetchGroups() {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("grup_members")
      .select(
        `
    role,
    grup:grup_id (
      id,
      name,
      description,
      photo_path,
      is_private,
      created_at,
      grup_members(count)
    ),
    user_id
    `
      )
      .eq("user_id", user.user?.id);

    if (error) {
      console.error("Error fetching groups:", error);
      return { status: "error", message: "Gagal mengambil data grup." };
    }
    return { status: "success", data };
  } catch (error) {
    console.error("Error fetching groups:", error);
    return { status: "error", message: "Gagal mengambil data grup." };
  }
}

export async function fetchAllCategories() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from("categories").select("id");

    if (error) {
      console.error("Error fetching categories:", error);
      return { status: "error", message: "Gagal mengambil data category." };
    }
    return { status: "success", data };
  } catch (error) {
    console.error("Error fetching groups:", error);
    return { status: "error", message: "Gagal mengambil data category." };
  }
}

export async function fetchGroupBySearch(query: string) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("grup_with_membership")
      .select(
        `
        id,
        name,
        description,
        photo_path,
        owner_id,
        is_private,
        created_at,
        grup_members (
          user_id
        ),
        is_member
      `
      )
      .ilike("name", `%${query}%`)
      .neq("owner_id", user.user?.id)
      .eq("is_private", false)
      // .not("grup_members.user_id", "eq", user.user?.id)
      .limit(10);

    if (error) {
      console.error("Error searching groups:", error);
      return { status: "error", message: "Gagal mencari grup." };
    }

    return { status: "success", data };
  } catch (error) {
    console.error("Error searching groups:", error);
    return { status: "error", message: "Gagal mencari grup." };
  }
}

export async function fetchGroupById(groupId: string) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("grup")
      .select(
        `
        id,
        name,
        description,
        photo_path,
        owner_id,
        is_private,
        created_at,
        grup_members (
          id,
          role,
          user_id,
          user:user_profiles (
            id,
            full_name,
            email,
            username,
            avatar,
            profile_user,
            created_at
          )
        )
      `
      )
      .eq("id", groupId)
      .single();

    if (error) {
      console.error("Error fetching group:", error);
      return { status: "error", message: "Gagal mengambil data grup." };
    }

    // Check if user is member
    const isMember = data.grup_members.some(
      (member) => member.user_id === user.user?.id
    );

    return {
      status: "success",
      data: { ...data, is_member: isMember },
    };
  } catch (error) {
    console.error("Error fetching group:", error);
    return { status: "error", message: "Gagal mengambil data grup." };
  }
}

export async function fetchGroupMembers(groupId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("grup_members")
      .select(
        `
        id,
        role,
        user_id,
        grup_id,
        user:user_profiles (
          id,
          name,
          nickname,
          email,
          username,
          avatar,
          created
        )
      `
      )
      .eq("grup_id", groupId);

    if (error) {
      console.error("Error fetching group members:", error);
      return { status: "error", message: "Gagal mengambil data anggota grup." };
    }

    const members = (data ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      user_id: m.user_id,
      grup_id: m.grup_id,
      user: m.user,
    }));

    return { status: "success", data: members };
  } catch (error) {
    console.error("Error fetching group members:", error);
    return { status: "error", message: "Gagal mengambil data anggota grup." };
  }
}

export async function fetchJoinedGroup(userId: string) {
  try {
    const supabase = await createClient();

    // Ultra-optimized query - only essential fields for form
    const { data, error } = await supabase
      .from("grup_members")
      .select(
        `
        grup:grup_id (
          id,
          name,
          deleted_at
        )
      `
      )
      .eq("user_id", userId)
      .order("grup_id")
      .returns<GrupMemberWithGrup[]>();

    if (error) {
      console.error("Error fetching joined groups:", error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        message: "user not joined grup",
        data: [],
      };
    }

    return {
      success: true,
      message: "get joined groups successfully",
      data: data.map((d) => d.grup).filter(Boolean) as Grup[],
    };
  } catch (error) {
    console.error("Error fetching joined groups:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}
