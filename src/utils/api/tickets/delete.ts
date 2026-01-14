"use server"

import { createClient } from "@/utils/supabase/server"

export async function deleteTicket(ticketId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Delete replies first (if not using cascade)
    await supabase
      .from("ticket_replies")
      .delete()
      .eq("ticket_id", ticketId)

    // Delete the ticket
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function deleteTicketReply(replyId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("ticket_replies")
      .delete()
      .eq("id", replyId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function bulkDeleteTickets(ticketIds: number[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Delete replies first
    await supabase
      .from("ticket_replies")
      .delete()
      .in("ticket_id", ticketIds)

    // Delete tickets
    const { error } = await supabase
      .from("tickets")
      .delete()
      .in("id", ticketIds)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
