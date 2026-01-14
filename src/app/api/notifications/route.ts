import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface NotificationRaw {
  id: string;
  type: string;
  is_read: boolean;
  is_action_taken: boolean;
  is_accept_friend: boolean | null;
  created_at: string;
  group_id: string | null;
  from_user_id: string;
  user_id: string;
  recap_id: number | null;
  ticket_id: number | null;
  grup: {
    name: string;
  } | null;
  from_user: {
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
  recap: {
    recitation_type: string;
    conclusion?: string;
    memorization?: string;
    examiner: {
      name: string;
    } | null;
  } | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const viewMode = searchParams.get("viewMode"); // 'all' untuk admin view
  const limitParam = Number(searchParams.get("limit"));
  const offsetParam = Number(searchParams.get("offset"));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.floor(limitParam), 1), 100)
    : 30;
  const offset = Number.isFinite(offsetParam)
    ? Math.max(Math.floor(offsetParam), 0)
    : 0;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Build query based on view mode
  let query = supabase
    .from("notifications")
    .select(
      `
      id,
      type,
      is_read,
      is_action_taken,
      is_accept_friend,
      created_at,
      group_id,
      from_user_id,
      user_id,
      recap_id,
      ticket_id,
      grup:grup(name),
      from_user:user_profiles!notifications_from_user_id_fkey(
        name,
        username,
        avatar
      ),
      recap:recaps!notifications_recap_id_fkey(
        recitation_type,
        conclusion,
        memorization,
        examiner:user_profiles!recaps_examiner_id_fkey(name)
      )
    `
    )

  // SECURITY FIX: All users (including admins) only see notifications where user_id matches their ID
  // This prevents users from seeing notifications intended for others

  if (viewMode !== 'all') {
    // All users (admin and regular) see only their own notifications
    query = query.eq('user_id', userId)
    console.log('🎯 User query: only notifications where user_id =', userId)
  } else {
    console.log('⚠️ WARNING: viewMode "all" used - this should only be for admin dashboard!')
  }

  // Explicitly exclude old ticket_new_message type
  query = query.neq('type', 'ticket_new_message')

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Basic logging for monitoring
  console.log(`📊 Fetched ${data?.length || 0} notifications for user ${userId}`);

  // Get unique ticket IDs from notifications
  const ticketIds = [...new Set(data?.filter(n => n.ticket_id).map(n => n.ticket_id) || [])];

  // Fetch ticket data and latest replies separately if there are any ticket notifications
  let ticketsData: { [key: number]: { contact: string; subject: string; ticket_number: string; latestReply?: { author: string; message: string } } } = {};
  if (ticketIds.length > 0) {
    // Get ticket basic info
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, contact, subject, ticket_number")
      .in("id", ticketIds);

    // Get latest reply for each ticket
    const { data: latestReplies } = await supabase
      .from("ticket_replies")
      .select("ticket_id, author, message, date")
      .in("ticket_id", ticketIds)
      .order("date", { ascending: false });

    // Create a lookup map for latest replies
    const latestRepliesMap: { [key: number]: { author: string; message: string } } = {};
    if (latestReplies) {
      // Group by ticket_id and take the first (latest) reply for each ticket
      latestReplies.forEach(reply => {
        if (!latestRepliesMap[reply.ticket_id]) {
          latestRepliesMap[reply.ticket_id] = {
            author: reply.author,
            message: reply.message
          };
        }
      });
    }

    // Create a combined lookup map
    ticketsData = (tickets || []).reduce((acc, ticket) => {
      acc[ticket.id] = {
        contact: ticket.contact,
        subject: ticket.subject,
        ticket_number: ticket.ticket_number,
        latestReply: latestRepliesMap[ticket.id]
      };
      return acc;
    }, {} as { [key: number]: { contact: string; subject: string; ticket_number: string; latestReply?: { author: string; message: string } } });
  }

  const mapped = ((data ?? []) as unknown as NotificationRaw[]).map((notif) => {
    const ticketInfo = notif.ticket_id ? ticketsData[notif.ticket_id] : null;

    return {
      id: notif.id,
      type: notif.type,
      is_read: notif.is_read,
      is_action_taken: notif.is_action_taken,
      is_accept_friend: notif.is_accept_friend,
      created_at: notif.created_at,
      group_id: notif.group_id,
      groupName: notif.grup?.name ?? "Tidak Diketahui",
      // For ticket notifications, show ticket contact instead of system
      fromUserName: notif.type === "ticket_reply" ? (ticketInfo?.contact ?? "Support Ticket") : (notif.from_user?.name ?? "Tidak Diketahui"),
      fromUserUsername: notif.type === "ticket_reply" ? "support" : (notif.from_user?.username ?? "Tidak Diketahui"),
      fromUserAvatar: notif.type === "ticket_reply" ? null : (notif.from_user?.avatar ?? null),
      fromUserProfileUser: notif.type === "ticket_reply" ? null : (notif.from_user?.avatar ?? null),
      fromUserId: notif.from_user_id,
      userId: notif.user_id,
      recap_id: notif.recap_id,
      ticket_id: notif.ticket_id,
      ticketContact: ticketInfo?.contact ?? undefined,
      ticketSubject: ticketInfo?.subject ?? undefined,
      ticketNumber: ticketInfo?.ticket_number ?? undefined,
      latestReplyAuthor: ticketInfo?.latestReply?.author ?? undefined,
      latestReplyMessage: ticketInfo?.latestReply?.message ?? undefined,
      recitationType: notif.recap?.recitation_type ?? undefined,
      examinerName: notif.recap?.examiner?.name ?? "Tidak Diketahui",
      conclusion: notif.recap?.conclusion ?? undefined,
      memorization: notif.recap?.memorization ?? undefined,
    };
  });

  return NextResponse.json(mapped);
}
