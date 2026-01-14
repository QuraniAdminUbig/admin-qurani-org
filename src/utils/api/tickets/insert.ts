"use server"

import { createClient } from "@/utils/supabase/server"
import { createSingleTicketNotification, updateTicketNotification } from "./notification-optimized"

export interface CreateTicketData {
  subject: string
  contact: string
  department: string
  project?: string
  service?: string
  priority?: string
  body: string
}

function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TKT-${timestamp}-${random}`
}

export async function createTicket(ticketData: CreateTicketData): Promise<{
  success: boolean
  data?: { id: number; ticket_number: string }
  error?: string
}> {
  try {
    const supabase = await createClient()

    const ticketNumber = generateTicketNumber()

    const { data, error } = await supabase
      .from("tickets")
      .insert([
        {
          ticket_number: ticketNumber,
          subject: ticketData.subject,
          contact: ticketData.contact,
          department: ticketData.department,
          project: ticketData.project || null,
          service: ticketData.service || null,
          priority: ticketData.priority || "Medium",
          status: "Open",
          body: ticketData.body,
          submitted_date: new Date().toISOString(),
          last_reply: new Date().toISOString()
        }
      ])
      .select("id, ticket_number")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Create single notification for the ticket (async, don't block response)
    createSingleTicketNotification(data.id).catch(err => {
      console.error('Failed to create ticket notification:', err)
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function createTicketReply(replyData: {
  ticket_id: number
  author: string
  message: string
  attachments?: string
  isFromAdmin?: boolean
}): Promise<{ success: boolean; data?: { id: number }; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("ticket_replies")
      .insert([
        {
          ticket_id: replyData.ticket_id,
          author: replyData.author,
          message: replyData.message,
          date: new Date().toISOString(),
          attachments: replyData.attachments || null
        }
      ])
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Update last_reply on ticket
    await supabase
      .from("tickets")
      .update({ last_reply: new Date().toISOString() })
      .eq("id", replyData.ticket_id)

    // Create notification ONLY once per reply (server-side only)
    // Realtime listeners should NOT create notifications to prevent duplicates
    updateTicketNotification(replyData.ticket_id).catch(err => {
      console.error('Failed to update ticket notification:', err)
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
