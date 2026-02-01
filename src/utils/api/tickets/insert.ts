"use server"

/**
 * Tickets Insert API
 * 
 * This module provides ticket creation functions using the MyQurani API.
 * Interface remains the same as before for backward compatibility.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export interface CreateTicketData {
  subject: string
  contact: string
  department: string
  project?: string
  service?: string
  priority?: string
  body: string
}

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

// Map priority name to number for API
function getPriorityNumber(priority?: string): number {
  const priorityMap: Record<string, number> = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
  };
  return priorityMap[priority || 'Medium'] || 2;
}

// Map department name to number for API (placeholder - adjust as needed)
function getDepartmentNumber(department: string): number {
  const deptMap: Record<string, number> = {
    'Marketing': 1,
    'Teknis': 2,
    'Produk': 3,
    'Engineering': 4,
    'Data': 5,
    'Audio': 6,
    'Sales': 7,
    'Support': 8,
  };
  return deptMap[department] || 8; // Default to Support
}

// ============================================
// API Functions
// ============================================

export async function createTicket(ticketData: CreateTicketData): Promise<{
  success: boolean
  data?: { id: number; ticket_number: string }
  error?: string
}> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    console.log('[createTicket] Creating ticket via API');

    const response = await fetch(`${API_BASE_URL}/api/v1/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject: ticketData.subject,
        department: getDepartmentNumber(ticketData.department),
        priority: getPriorityNumber(ticketData.priority),
        message: ticketData.body,
        name: ticketData.contact,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('[createTicket] API error:', result);
      return { success: false, error: result.message || 'Failed to create ticket' };
    }

    console.log('[createTicket] Ticket created:', result.data?.ticketKey);

    return {
      success: true,
      data: {
        id: result.data.id,
        ticket_number: result.data.ticketKey,
      },
    };
  } catch (error) {
    console.error('[createTicket] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createTicketReply(replyData: {
  ticket_id: number
  author: string
  message: string
  attachments?: string
  isFromAdmin?: boolean
}): Promise<{ success: boolean; data?: { id: number }; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    console.log('[createTicketReply] Adding reply to ticket:', replyData.ticket_id);

    const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${replyData.ticket_id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: replyData.message,  // API only requires 'message' field
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[createTicketReply] HTTP error:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    const replyId = result?.data?.id || result?.id || Date.now();

    console.log('[createTicketReply] Reply added:', replyId);

    return {
      success: true,
      data: { id: replyId },
    };
  } catch (error) {
    console.error('[createTicketReply] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
