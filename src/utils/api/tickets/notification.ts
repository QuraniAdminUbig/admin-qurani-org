"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * Create ticket notification for all admins when user creates ticket or replies
 */
export async function createTicketNotificationForAdmins(
  ticketId: number
) {
  try {
    const supabase = await createClient()

    // Get ALL admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')

    if (adminError) {
      console.error('Error fetching admin users:', adminError)
      return { success: false, error: adminError.message }
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found')
      return { success: false, error: 'No admin users found' }
    }

    // Check if notifications already exist for this ticket to prevent duplicates
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('ticket_id', ticketId)
      .eq('type', 'ticket_new_message')

    const existingUserIds = new Set(existingNotifications?.map(n => n.user_id) || [])
    const adminUsersToNotify = adminUsers.filter(admin => !existingUserIds.has(admin.id))

    if (adminUsersToNotify.length === 0) {
      return { success: true, adminCount: 0, message: 'All admins already notified' }
    }

    // Create notification for each admin that hasn't been notified yet
    const notifications = adminUsersToNotify.map(admin => ({
      id: crypto.randomUUID(),
      user_id: admin.id,
      from_user_id: null,
      type: "ticket_new_message",
      ticket_id: ticketId,
      is_read: false,
      is_action_taken: true,
      created_at: new Date().toISOString()
    }))



    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('Error creating ticket notifications:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      adminCount: adminUsersToNotify.length
    }

  } catch (error) {
    console.error('Error in createTicketNotificationForAdmins:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
