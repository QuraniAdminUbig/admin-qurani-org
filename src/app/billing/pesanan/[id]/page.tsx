"use client"

import { use } from "react"
import { redirect } from "next/navigation"

// Redirect /billing/pesanan/[id] → /billing/member-subscription/[id]
// This keeps the new clean URL while reusing the existing page component
export default function PesananDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    redirect(`/billing/member-subscription/${id}`)
}
