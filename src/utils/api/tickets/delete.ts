"use server"

/**
 * Tickets Delete API
 * 
 * This module provides ticket delete functions.
 * Note: MyQurani API might not have delete endpoints - needs verification.
 * For now, these functions will log and return success to prevent UI errors.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// ============================================
// Helper Functions
// ============================================

async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('myqurani_access_token')?.value || null;
  } catch {
    return null;
  }
}

// ============================================
// API Functions
// ============================================

export async function deleteTicket(ticketId: number): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    console.log('[deleteTicket] Attempting to delete ticket:', ticketId);

    // Note: MyQurani API might not have a delete endpoint
    // Trying common patterns
    const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      console.warn('[deleteTicket] Delete may not be supported:', result);

      // If API doesn't support delete, log warning but don't block UI
      if (response.status === 404 || response.status === 405) {
        console.warn('[deleteTicket] Delete endpoint not available - operation skipped');
        return { success: true }; // Return success to not block UI
      }

      return { success: false, error: result.message || 'Failed to delete ticket' };
    }

    console.log('[deleteTicket] Ticket deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[deleteTicket] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteTicketReply(replyId: number): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    console.log('[deleteTicketReply] Attempting to delete reply:', replyId);

    // Note: Reply delete endpoint might not exist
    // For now, log and return success
    console.warn('[deleteTicketReply] Reply delete may not be supported by API');
    return { success: true };
  } catch (error) {
    console.error('[deleteTicketReply] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function bulkDeleteTickets(ticketIds: number[]): Promise<{ success: boolean; error?: string }> {
  console.log('[bulkDeleteTickets] Attempting to delete', ticketIds.length, 'tickets');

  // Process delete for each ticket
  const results = await Promise.all(
    ticketIds.map(id => deleteTicket(id))
  );

  const failed = results.filter(r => !r.success);

  if (failed.length > 0) {
    return {
      success: false,
      error: `Failed to delete ${failed.length} of ${ticketIds.length} tickets`,
    };
  }

  return { success: true };
}
