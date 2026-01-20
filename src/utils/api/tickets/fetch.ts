"use server"

import { createClient } from "@/utils/supabase/server"

export interface TicketListItem {
  id: number
  ticket_number: string
  subject: string
  contact: string
  department: string
  project: string | null
  service: string | null
  priority: string
  status: string
  last_reply: string | null
  submitted_date: string
  body: string | null
}

export interface TicketReply {
  id: number
  ticket_id: number
  author: string
  message: string
  date: string
  attachments: string | null
}

export interface TicketWithReplies extends TicketListItem {
  replies: TicketReply[]
}

export async function fetchTickets(filters?: {
  status?: string
  priority?: string
  department?: string
  search?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data?: TicketListItem[]; totalCount?: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Run count and data queries in parallel for better performance
    const [countResult, dataResult] = await Promise.all([
      // Count query - get total matching records
      (async () => {
        let countQuery = supabase.from("tickets").select("*", { count: 'exact', head: true })

        if (filters?.status && filters.status !== "all") {
          countQuery = countQuery.eq("status", filters.status)
        }
        if (filters?.priority && filters.priority !== "all") {
          countQuery = countQuery.eq("priority", filters.priority)
        }
        if (filters?.department && filters.department !== "all") {
          countQuery = countQuery.eq("department", filters.department)
        }
        if (filters?.search) {
          countQuery = countQuery.or(`subject.ilike.%${filters.search}%,contact.ilike.%${filters.search}%,body.ilike.%${filters.search}%`)
        }
        if (filters?.startDate) {
          // Assuming startDate is YYYY-MM-DD, we filter >= start of that day
          countQuery = countQuery.gte("submitted_date", filters.startDate)
        }
        if (filters?.endDate) {
          // Assuming endDate is YYYY-MM-DD, we filter <= end of that day
          // We might want to append time if it's strictly just date, but usually gte/lte works fine for ISO strings if they are full dates.
          // If they are just dates, we might want to extend to end of day, but let's stick to simple comparison first.
          // However, if endDate is 2023-01-01, we want everything on that day too.
          // Determine if input has time component. If not, maybe append 23:59:59?
          // The UI sends "YYYY-MM-DD".
          // ideally we do lte(submitted_date, endDate + 'T23:59:59.999Z') or just lte.
          // existing code often just uses the date string. Let's trust the UI sends a valid comparable string or just use lte.
          // To be safe for inclusive end date:
          const endDateTime = filters.endDate.includes('T') ? filters.endDate : `${filters.endDate}T23:59:59.999Z`
          countQuery = countQuery.lte("submitted_date", endDateTime)
        }

        return countQuery
      })(),
      // Data query with pagination
      (async () => {
        let dataQuery = supabase
          .from("tickets")
          .select("*")
          .order("submitted_date", { ascending: false })

        if (filters?.status && filters.status !== "all") {
          dataQuery = dataQuery.eq("status", filters.status)
        }
        if (filters?.priority && filters.priority !== "all") {
          dataQuery = dataQuery.eq("priority", filters.priority)
        }
        if (filters?.department && filters.department !== "all") {
          dataQuery = dataQuery.eq("department", filters.department)
        }
        if (filters?.search) {
          dataQuery = dataQuery.or(`subject.ilike.%${filters.search}%,contact.ilike.%${filters.search}%,body.ilike.%${filters.search}%`)
        }
        if (filters?.startDate) {
          dataQuery = dataQuery.gte("submitted_date", filters.startDate)
        }
        if (filters?.endDate) {
          const endDateTime = filters.endDate.includes('T') ? filters.endDate : `${filters.endDate}T23:59:59.999Z`
          dataQuery = dataQuery.lte("submitted_date", endDateTime)
        }

        // Apply pagination if limit is provided
        if (filters?.limit !== undefined && filters?.offset !== undefined) {
          const from = filters.offset
          const to = filters.offset + filters.limit - 1
          dataQuery = dataQuery.range(from, to)
        }

        return dataQuery
      })()
    ])

    const { count } = countResult
    const { data, error } = dataResult

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: data as TicketListItem[],
      totalCount: count || 0
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fetchTicketById(ticketId: number): Promise<{ success: boolean; data?: TicketWithReplies; error?: string }> {
  try {
    const supabase = await createClient()

    // Optimized: Fetches ONLY ticket header data, no replies
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, contact, department, project, service, priority, status, submitted_date, last_reply, body")
      .eq("id", ticketId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Map the Supabase response to our interface
    // Note: 'replies' field is populated by the alias in select
    return {
      success: true,
      data: ticket as unknown as TicketWithReplies
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Optimized: fetch only 4 related tickets for sidebar
export async function fetchRelatedTickets(excludeId: number): Promise<{ success: boolean; data?: TicketListItem[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, contact, status, priority, submitted_date")
      .neq("id", excludeId)
      .order("submitted_date", { ascending: false })
      .limit(4)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TicketListItem[] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fetchTicketStats(): Promise<{
  success: boolean
  data?: {
    total: number
    open: number
    in_progress: number
    answered: number
    on_hold: number
    closed: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Run all COUNT queries in parallel for maximum speed
    const [totalResult, openResult, inProgressResult, answeredResult, onHoldResult, closedResult] = await Promise.all([
      supabase.from("tickets").select("*", { count: 'exact', head: true }),
      supabase.from("tickets").select("*", { count: 'exact', head: true }).eq("status", "Open"),
      supabase.from("tickets").select("*", { count: 'exact', head: true }).eq("status", "In Progress"),
      supabase.from("tickets").select("*", { count: 'exact', head: true }).eq("status", "Answered"),
      supabase.from("tickets").select("*", { count: 'exact', head: true }).eq("status", "On Hold"),
      supabase.from("tickets").select("*", { count: 'exact', head: true }).eq("status", "Closed"),
    ])

    const stats = {
      total: totalResult.count || 0,
      open: openResult.count || 0,
      in_progress: inProgressResult.count || 0,
      answered: answeredResult.count || 0,
      on_hold: onHoldResult.count || 0,
      closed: closedResult.count || 0
    }

    return { success: true, data: stats }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fetchTicketHeaderById(ticketId: number): Promise<{ success: boolean; data?: TicketListItem; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, contact, department, project, service, priority, status, last_reply, submitted_date, body")
      .eq("id", ticketId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TicketListItem }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fetchTicketRepliesPage(ticketId: number, limit: number, offset: number): Promise<{ success: boolean; data?: TicketReply[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: replies, error } = await supabase
      .from("ticket_replies")
      .select("id, ticket_id, author, message, date, attachments")
      .eq("ticket_id", ticketId)
      .order("date", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: replies as TicketReply[] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
