/**
 * Tickets API Service for MyQurani API
 * 
 * This module handles all ticket-related API calls to api.myqurani.com
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// ============================================
// Types
// ============================================

export interface TicketListDto {
    id: number;
    ticketKey: string;
    subject: string;
    email: string | null;
    name: string | null;
    status: number;
    statusName: string;
    priority: number;
    priorityName: string;
    department: number;
    assigned: number;
    date: string;
    lastReply: string | null;
    clientRead: number;
    adminRead: number;
    replyCount: number;
}

export interface TicketReplyDto {
    id: number;
    ticketId: number;
    userId: number | null;
    name: string | null;
    email: string | null;
    message: string | null;
    admin: number | null;
    isStaffReply: boolean;
    date: string;
    attachments: TicketAttachmentDto[] | null;
}

export interface TicketAttachmentDto {
    id: number;
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
}

export interface TicketDetailDto {
    id: number;
    ticketKey: string;
    userId: number | null;
    email: string | null;
    name: string | null;
    department: number | null;
    priority: number;
    priorityName: string | null;
    status: number;
    statusName: string | null;
    service: string | null;
    subject: string;
    message: string | null;
    date: string;
    lastReply: string | null;
    clientRead: number;
    adminRead: number;
    replies: TicketReplyDto[];
    attachments: TicketAttachmentDto[];
}

export interface CreateTicketRequest {
    subject: string;
    department: number;
    priority: number;
    message: string;
    name?: string;
    email?: string;
}

export interface CreateReplyRequest {
    message: string;
}

export interface TicketStatusDto {
    id: number;
    name: string;
    statusColor: string;
    statusOrder: number;
}

export interface TicketPriorityDto {
    priorityId: number;
    name: string;
}

export interface PagedResponse<T> {
    data: T[];
    offset: number;
    limit: number;
    totalCount: number;
    hasMore: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
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

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = await getAuthToken();

    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[TicketsAPI] Error:', data);
            return {
                success: false,
                error: data.message || `Request failed with status ${response.status}`,
            };
        }

        return { success: true, data };
    } catch (error) {
        console.error('[TicketsAPI] Request error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Request failed',
        };
    }
}

// ============================================
// Ticket Endpoints
// ============================================

/**
 * Get all tickets (staff only) with filtering
 */
export async function fetchTickets(filters?: {
    status?: number;
    priority?: number;
    department?: number;
    assigned?: number;
    keyword?: string;
    page?: number;
    pageSize?: number;
}): Promise<{ success: boolean; data?: TicketListDto[]; totalCount?: number; error?: string }> {
    const params = new URLSearchParams();

    if (filters?.status !== undefined) params.append('Status', String(filters.status));
    if (filters?.priority !== undefined) params.append('Priority', String(filters.priority));
    if (filters?.department !== undefined) params.append('Department', String(filters.department));
    if (filters?.assigned !== undefined) params.append('Assigned', String(filters.assigned));
    if (filters?.keyword) params.append('Keyword', filters.keyword);
    if (filters?.page) params.append('Page', String(filters.page));
    if (filters?.pageSize) params.append('PageSize', String(filters.pageSize));

    const endpoint = `/api/v1/tickets${params.toString() ? `?${params.toString()}` : ''}`;
    const result = await apiRequest<PagedResponse<TicketListDto>>(endpoint);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: result.data?.data || [],
        totalCount: result.data?.totalCount || 0,
    };
}

/**
 * Get ticket by ID
 */
export async function fetchTicketById(ticketId: number): Promise<{
    success: boolean;
    data?: TicketDetailDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<TicketDetailDto>>(`/api/v1/tickets/${ticketId}`);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: result.data?.data,
    };
}

/**
 * Create new ticket
 */
export async function createTicket(ticket: CreateTicketRequest): Promise<{
    success: boolean;
    data?: TicketDetailDto;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<TicketDetailDto>>('/api/v1/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: result.data?.data,
    };
}

/**
 * Add reply to ticket
 */
export async function addTicketReply(
    ticketId: number,
    request: CreateReplyRequest
): Promise<{ success: boolean; data?: TicketReplyDto; error?: string }> {
    const result = await apiRequest<ApiResponse<TicketReplyDto>>(
        `/api/v1/tickets/${ticketId}/reply`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        }
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: result.data?.data,
    };
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
    ticketId: number,
    status: number
): Promise<{ success: boolean; error?: string }> {
    const result = await apiRequest(`/api/v1/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });

    return { success: result.success, error: result.error };
}

/**
 * Update ticket priority
 */
export async function updateTicketPriority(
    ticketId: number,
    priority: number
): Promise<{ success: boolean; error?: string }> {
    const result = await apiRequest(`/api/v1/tickets/${ticketId}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
    });

    return { success: result.success, error: result.error };
}

/**
 * Assign ticket to user
 */
export async function assignTicket(
    ticketId: number,
    userId: number
): Promise<{ success: boolean; error?: string }> {
    const result = await apiRequest(`/api/v1/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: userId }),
    });

    return { success: result.success, error: result.error };
}

/**
 * Upload attachment to ticket
 */
export async function uploadTicketAttachment(
    ticketId: number,
    file: File
): Promise<{ success: boolean; data?: TicketAttachmentDto; error?: string }> {
    const token = await getAuthToken();

    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/v1/tickets/${ticketId}/attachments`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.message || 'Upload failed' };
        }

        return { success: true, data: data.data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
        };
    }
}

/**
 * Get ticket statuses
 */
export async function fetchTicketStatuses(): Promise<{
    success: boolean;
    data?: TicketStatusDto[];
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<TicketStatusDto[]>>(
        '/api/v1/tickets/statuses'
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: result.data?.data || [],
    };
}

/**
 * Get ticket priorities
 */
export async function fetchTicketPriorities(): Promise<{
    success: boolean;
    data?: TicketPriorityDto[];
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<TicketPriorityDto[]>>(
        '/api/v1/tickets/priorities'
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: result.data?.data || [],
    };
}

/**
 * Get predefined replies
 */
export async function fetchPredefinedReplies(): Promise<{
    success: boolean;
    data?: Array<{ id: number; name: string; message: string }>;
    error?: string;
}> {
    const result = await apiRequest<ApiResponse<Array<{ id: number; name: string; message: string }>>>(
        '/api/v1/tickets/predefined-replies'
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: result.data?.data || [],
    };
}

/**
 * Submit ticket feedback
 */
export async function submitTicketFeedback(
    ticketId: number,
    rating: number,
    comment?: string
): Promise<{ success: boolean; error?: string }> {
    const result = await apiRequest(`/api/v1/tickets/${ticketId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
    });

    return { success: result.success, error: result.error };
}
