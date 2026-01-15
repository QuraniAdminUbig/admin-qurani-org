import { createClient, createAdminClient } from "@/utils/supabase/server"

/**
 * OPTIMIZED: Create targeted notification for each admin when user creates a new ticket
 * This ensures toast notifications work correctly
 */
export async function createSingleTicketNotification(
  ticketId: number
) {
  try {
    const supabase = await createAdminClient()

    // Get all admin users
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
    const adminsToNotify = adminUsers.filter(admin => !existingUserIds.has(admin.id))

    if (adminsToNotify.length === 0) {
      console.log(`📧 All admins already notified for ticket ${ticketId}`)
      return { success: true, exists: true, adminCount: 0 }
    }

    const nowMs = Date.now()
    const nowISO = new Date(nowMs).toISOString()
    const dedupBucket = Math.floor(nowMs / 5000)

    // Create targeted notification for each admin
    const notifications = adminsToNotify.map(admin => ({
      id: crypto.randomUUID(),
      user_id: admin.id, // Targeted to specific admin
      from_user_id: null,
      type: "ticket_new_message",
      ticket_id: ticketId,
      is_read: false,
      is_action_taken: true,
      created_at: nowISO,
      dedup_key: `ticket_new_message:${admin.id}:${ticketId}:${dedupBucket}`
    }))

    const { error } = await supabase
      .from('notifications')
      .upsert(notifications, { onConflict: 'dedup_key', ignoreDuplicates: true })

    if (error) {
      console.error('Error creating ticket notifications:', error)
      return { success: false, error: error.message }
    }

    console.log(`✅ Created ${notifications.length} notification(s) for ticket ${ticketId}`)
    return {
      success: true,
      adminCount: notifications.length,
      message: `Created ${notifications.length} admin notification(s) successfully`
    }

  } catch (error) {
    console.error('Error in createSingleTicketNotification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Simple in-memory cache to prevent duplicate calls within 5 seconds
const recentNotificationCalls = new Map<number, number>()

/**
 * Update existing ticket notification (e.g., when reply is added)  
 * SIMPLE: Prevents duplicate notifications with basic deduplication
 * 
 * @param ticketId - ID tiket yang diupdate
 * @param options - Opsi tambahan
 * @param options.isFromAdmin - Jika true, notifikasi dikirim ke user. Jika false, ke admin.
 * @param options.senderUserId - ID user yang mengirim reply (optional)
 */
export async function updateTicketNotification(
  ticketId: number,
  options?: { isFromAdmin?: boolean; senderUserId?: string }
) {
  // SIMPLE DEDUP: Check if we already processed this ticket in last 5 seconds
  const now = Date.now()
  const lastCall = recentNotificationCalls.get(ticketId)
  if (lastCall && (now - lastCall) < 5000) {
    console.log(`⏭️ Skipping duplicate notification for ticket ${ticketId} (called ${Math.round((now - lastCall) / 1000)}s ago)`)
    return { success: true, message: 'Duplicate call prevented' }
  }

  // Mark this call
  recentNotificationCalls.set(ticketId, now)

  // Cleanup old entries to prevent memory leak (keep only last 1 hour)
  const oneHourAgo = now - 3600000
  for (const [id, timestamp] of recentNotificationCalls.entries()) {
    if (timestamp < oneHourAgo) {
      recentNotificationCalls.delete(id)
    }
  }
  try {
    const supabase = await createAdminClient()

    // Get ticket information and latest reply
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('contact')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket data:', ticketError)
      return { success: false, error: ticketError.message }
    }

    // Get latest reply to determine sender
    const { data: latestReply, error: replyError } = await supabase
      .from('ticket_replies')
      .select(`
        author,
        date
      `)
      .eq('ticket_id', ticketId)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (replyError) {
      console.error('Error fetching latest reply:', replyError)
      return { success: false, error: replyError.message }
    }

    // Determine sender's user_id and role
    // Use ilike for case-insensitive matching and limit(1) to avoid duplicate name errors
    const { data: senderProfiles } = await supabase
      .from('user_profiles')
      .select('id, role')
      .ilike('name', latestReply.author)
      .limit(1)

    // Get first match (handles duplicate names gracefully)
    const senderProfile = senderProfiles?.[0] || null

    let fromUserId: string | null = null
    if (senderProfile) {
      fromUserId = senderProfile.id
    }

    // Determine if reply is from admin
    // Priority: use passed parameter if available, otherwise check from database
    let isAdminReply: boolean
    if (options?.isFromAdmin !== undefined) {
      // Caller already knows if sender is admin (preferred - avoids lookup issues)
      isAdminReply = options.isFromAdmin
      console.log(`📧 Using isFromAdmin from caller: ${isAdminReply}`)
    } else if (senderProfile) {
      // Fallback: determine from database lookup
      isAdminReply = senderProfile.role === 'admin'
      console.log(`📧 Determined isAdminReply from DB: ${isAdminReply} (role: ${senderProfile.role})`)
    } else {
      // Cannot determine sender - assume it's from user (safer default)
      isAdminReply = false
      console.warn(`⚠️ Could not find sender profile for "${latestReply.author}", assuming user reply`)
    }

    // Create targeted notifications based on reply sender
    const nowMs = Date.now()
    const nowISO = new Date(nowMs).toISOString()
    const dedupBucket = Math.floor(nowMs / 5000)
    const notifications: Array<{
      id: string;
      user_id: string;
      from_user_id: string | null;
      type: string;
      ticket_id: number;
      is_read: boolean;
      is_action_taken: boolean;
      created_at: string;
      dedup_key: string;
    }> = []

    if (isAdminReply) {
      // Admin replied → notify ticket creator (user)
      // Use limit(1) to avoid error if there are duplicate names
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('name', ticketData.contact)
        .limit(1)

      const userProfile = userProfiles?.[0] || null

      if (userProfile) {
        // Check if notification already exists for this user in last 5 seconds
        const { data: existingNotifs } = await supabase
          .from('notifications')
          .select('id')
          .eq('ticket_id', ticketId)
          .eq('user_id', userProfile.id)
          .eq('type', 'ticket_reply')
          .gte('created_at', new Date(Date.now() - 5 * 1000).toISOString())
          .limit(1)

        const existingNotif = existingNotifs?.[0] || null

        if (!existingNotif) {
          notifications.push({
            id: crypto.randomUUID(),
            user_id: userProfile.id,
            from_user_id: fromUserId,
            type: 'ticket_reply',
            ticket_id: ticketId,
            is_read: false,
            is_action_taken: true,
            created_at: nowISO,
            dedup_key: `ticket_reply:${userProfile.id}:${ticketId}:${dedupBucket}`
          })
          console.log(`📧 Will notify user ${userProfile.id} about admin reply on ticket ${ticketId}`)
        }
      } else {
        console.warn(`⚠️ Could not find user profile for contact "${ticketData.contact}" to send notification`)
      }
    } else {
      // User replied → notify all admins
      const { data: adminUsers } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')

      if (adminUsers && adminUsers.length > 0) {
        for (const admin of adminUsers) {
          // Check if notification already exists for this admin in last 5 seconds
          const { data: existingNotifs } = await supabase
            .from('notifications')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('user_id', admin.id)
            .eq('type', 'ticket_reply')
            .gte('created_at', new Date(Date.now() - 5 * 1000).toISOString())
            .limit(1)

          const existingNotif = existingNotifs?.[0] || null

          if (!existingNotif) {
            notifications.push({
              id: crypto.randomUUID(),
              user_id: admin.id,
              from_user_id: fromUserId,
              type: 'ticket_reply',
              ticket_id: ticketId,
              is_read: false,
              is_action_taken: true,
              created_at: nowISO,
              dedup_key: `ticket_reply:${admin.id}:${ticketId}:${dedupBucket}`
            })
          }
        }
        console.log(`📧 Will notify ${notifications.length} admin(s) about user reply on ticket ${ticketId}`)
      } else {
        console.warn(`⚠️ No admin users found to notify for ticket ${ticketId}`)
      }
    }

    // Insert notifications if any
    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .upsert(notifications, { onConflict: 'dedup_key', ignoreDuplicates: true })

      if (error) {
        console.error('Error creating ticket notifications:', error)
        return { success: false, error: error.message }
      }

      console.log(`✅ Created ${notifications.length} ticket notification(s) for ticket ${ticketId}`)
    } else {
      console.log(`📧 No new notifications needed for ticket ${ticketId} (already exists or no recipients)`)
    }

    return { success: true, message: `Created ${notifications.length} notification(s) successfully` }

  } catch (error) {
    console.error('Error in updateTicketNotification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
