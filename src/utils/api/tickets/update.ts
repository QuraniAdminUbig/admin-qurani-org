"use server"

import { createClient } from "@/utils/supabase/server"

export async function updateTicketStatus(
  ticketId: number,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tickets")
      .update({ status })
      .eq("id", ticketId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updateTicketPriority(
  ticketId: number,
  priority: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tickets")
      .update({ priority })
      .eq("id", ticketId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updateTicket(
  ticketId: number,
  updates: {
    status?: string
    priority?: string
    department?: string
    service?: string
    project?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", ticketId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function bulkUpdateTickets(
  ticketIds: number[],
  updates: {
    status?: string
    priority?: string
    department?: string
    service?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("tickets")
      .update(updates)
      .in("id", ticketIds)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
