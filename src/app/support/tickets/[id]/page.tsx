import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import TicketDetailClient from "./TicketDetailClient"
import { fetchTicketHeaderById, fetchTicketRepliesPage, fetchRelatedTickets } from "@/utils/api/tickets/fetch"
import { fetchRegularUsers } from "@/utils/api/users/fetch-users"

export default async function TicketDetailRoute({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const idInt = parseInt(id)

    // Data Fetching in Parallel (SSR)
    const [ticketHeaderResult, repliesResult, relatedResult, usersResult] = await Promise.all([
        fetchTicketHeaderById(idInt),
        fetchTicketRepliesPage(idInt, 20, 0), // Fetch first 20 replies
        fetchRelatedTickets(idInt),
        fetchRegularUsers()
    ])

    const initialTicket = (ticketHeaderResult.success && ticketHeaderResult.data) || null
    const initialReplies = repliesResult.success && repliesResult.data ? repliesResult.data : []
    const initialRelatedTickets = relatedResult.success && relatedResult.data ? relatedResult.data : []
    const initialUsers = usersResult.users || []

    return (
        <DashboardLayout>
            <I18nProvider namespaces={["support"]}>
                <TicketDetailClient
                    ticketId={id}
                    initialTicket={initialTicket}
                    initialReplies={initialReplies}
                    initialRelatedTickets={initialRelatedTickets}
                    initialUsers={initialUsers}
                />
            </I18nProvider>
        </DashboardLayout>
    )
}
