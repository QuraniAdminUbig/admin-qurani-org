"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  MessageSquare,
  StickyNote,
  Paperclip,
  Send,
  ChevronDown,
  X,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  Tag,
  Bell,
  Layers,
  ListChecks,
  Building2,
  UserPlus,
  Briefcase,
  GitMerge,
  User
} from "lucide-react"
import React, { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface Attachment {
  name: string
  url: string
  type?: "image" | "file"
}

interface Message {
  id: string
  sender: string
  role: "staff" | "user"
  content: string
  posted_at: string
  attachments?: Attachment[]
  isNote?: boolean
}

interface TicketDetail {
  id: number
  subject: string
  status: "open" | "in_progress" | "answered" | "on_hold" | "closed"
  priority: "low" | "medium" | "high"
  contact: {
    name: string
    email: string
  }
  department: string
  service: string
  project: string
  assignedTo: string
  tags: string[]
  created_at: string
  last_reply: string
  messages: Message[]
}

const ADMIN_OPTIONS = [
  { id: "admin-support", name: "Admin Support", email: "support@qurani.app", username: "support_admin" },
  { id: "admin-tech", name: "Technical Admin", email: "tech@qurani.app", username: "tech_admin" },
  { id: "admin-qc", name: "Quality Control", email: "qc@qurani.app", username: "qc_admin" },
]

type DetailTab = "reply" | "note" | "reminder" | "others" | "task"

const initialTicketsData: Record<string, TicketDetail> = {
  "6": {
    id: 6,
    subject: "Tidak bisa login ke aplikasi",
    status: "closed",
    priority: "medium",
    contact: { name: "Ahmad Fauzi", email: "ahmad@example.com" },
    department: "Teknis",
    service: "Aplikasi Mobile",
    project: "My Qurani",
    assignedTo: "Anda (current user)",
    tags: ["Login", "Bug"],
    created_at: "2025-12-04 03:42:05",
    last_reply: "5 jam lalu",
    messages: [
      {
        id: "1",
        sender: "Ahmad Fauzi",
        role: "user",
        content: "Saya tidak bisa login ke aplikasi sejak kemarin. Sudah coba reset password tapi tetap tidak bisa.",
        posted_at: "2025-12-04 03:42:05",
        attachments: [
          { name: "login-error.png", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80", type: "image" }
        ]
      },
      { id: "2", sender: "Admin Support", role: "staff", content: "Terima kasih telah menghubungi kami. Bisa tolong informasikan email yang digunakan untuk login?", posted_at: "2025-12-04 03:44:12", attachments: [] },
      { id: "3", sender: "Ahmad Fauzi", role: "user", content: "Email saya ahmad@example.com, saya juga sudah mencoba di perangkat lain.", posted_at: "2025-12-04 03:45:00", attachments: [] },
      {
        id: "4",
        sender: "Admin Support",
        role: "staff",
        content: "Sudah kami reset dari sistem. Silakan coba login kembali dengan password baru yang dikirim ke email Anda.",
        posted_at: "2025-12-04 03:45:27",
        attachments: [
          { name: "reset-proof.png", url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80", type: "image" }
        ]
      }
    ]
  },
  "5": {
    id: 5,
    subject: "Pertanyaan tentang fitur hafalan",
    status: "open",
    priority: "low",
    contact: { name: "Siti Nurhaliza", email: "siti@example.com" },
    department: "Produk",
    service: "Fitur Hafalan",
    project: "My Qurani",
    assignedTo: "Anda (current user)",
    tags: ["Feature", "Question"],
    created_at: "2025-12-03 19:00:24",
    last_reply: "Belum ada balasan",
    messages: [
      { id: "1", sender: "Siti Nurhaliza", role: "user", content: "Bagaimana cara menggunakan fitur hafalan yang baru?", posted_at: "2025-12-03 19:00:24", attachments: [] }
    ]
  },
  "4": {
    id: 4,
    subject: "Laporan bug di halaman ayat",
    status: "in_progress",
    priority: "high",
    contact: { name: "Budi Santoso", email: "budi@example.com" },
    department: "Engineering",
    service: "Pembaca Ayat",
    project: "My Qurani",
    assignedTo: "Anda (current user)",
    tags: ["Bug"],
    created_at: "2025-12-03 19:00:24",
    last_reply: "Belum ada balasan",
    messages: [
      {
        id: "1",
        sender: "Budi Santoso",
        role: "user",
        content: "Ada bug ketika membuka halaman ayat nomor 255. Aplikasi langsung crash.",
        posted_at: "2025-12-03 19:00:24",
        attachments: [
          { name: "crash-log.png", url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80", type: "image" }
        ]
      }
    ]
  },
  "3": {
    id: 3,
    subject: "Request fitur bookmark baru",
    status: "answered",
    priority: "medium",
    contact: { name: "Dewi Lestari", email: "dewi@example.com" },
    department: "Produk",
    service: "Bookmark",
    project: "My Qurani",
    assignedTo: "Anda (current user)",
    tags: ["Feature Request"],
    created_at: "2025-12-03 19:00:24",
    last_reply: "1 hari lalu",
    messages: [
      { id: "1", sender: "Dewi Lestari", role: "user", content: "Saya ingin request fitur untuk bookmark ayat favorit dengan kategori.", posted_at: "2025-12-03 19:00:24", attachments: [] }
    ]
  },
  "2": {
    id: 2,
    subject: "Masalah sinkronisasi data",
    status: "on_hold",
    priority: "low",
    contact: { name: "Rudi Hartono", email: "rudi@example.com" },
    department: "Data",
    service: "Sinkronisasi",
    project: "My Qurani",
    assignedTo: "Anda (current user)",
    tags: ["Bug", "Data"],
    created_at: "2025-12-03 19:00:24",
    last_reply: "Belum ada balasan",
    messages: [
      { id: "1", sender: "Rudi Hartono", role: "user", content: "Data hafalan saya tidak tersinkronisasi antar device.", posted_at: "2025-12-03 19:00:24", attachments: [] }
    ]
  },
  "1": {
    id: 1,
    subject: "Tidak bisa mendengarkan audio",
    status: "closed",
    priority: "medium",
    contact: { name: "Maya Sari", email: "maya@example.com" },
    department: "Audio",
    service: "Streaming",
    project: "My Qurani",
    assignedTo: "Anda (current user)",
    tags: ["Bug", "Audio"],
    created_at: "2025-12-03 19:00:24",
    last_reply: "2 hari lalu",
    messages: [
      { id: "1", sender: "Maya Sari", role: "user", content: "Audio murottal tidak bisa diputar di aplikasi saya.", posted_at: "2025-12-03 19:00:24", attachments: [] }
    ]
  }
}

const STORAGE_KEY = "support_tickets_data"

const isImageAttachment = (attachment: Attachment) => {
  const target = `${attachment.url || ""} ${attachment.name || ""}`
  return attachment.type === "image" || /\.(png|jpe?g|gif|webp)$/i.test(target)
}

const normalizeTicketsData = (tickets: Record<string, TicketDetail>): Record<string, TicketDetail> => {
  const normalized: Record<string, TicketDetail> = {}

  const mergeTicket = (incoming: TicketDetail, fallback?: TicketDetail): TicketDetail => {
    const base = fallback || incoming
    return {
      ...base,
      ...incoming,
      contact: { ...base.contact, ...incoming.contact },
      department: incoming.department || base.department,
      service: incoming.service || base.service,
      project: incoming.project || base.project,
      assignedTo: incoming.assignedTo || base.assignedTo || "Anda (current user)",
      tags: incoming.tags || base.tags || [],
      messages: (incoming.messages || base.messages || []).map((message) => ({
        ...message,
        attachments: (message.attachments || []).map((attachment) => ({
          ...attachment,
          type: attachment.type || (isImageAttachment(attachment) ? "image" : "file")
        }))
      }))
    }
  }

  Object.entries(initialTicketsData).forEach(([id, template]) => {
    const incoming = tickets[id] || template
    normalized[id] = mergeTicket(incoming, template)
  })

  Object.entries(tickets).forEach(([id, incoming]) => {
    if (!normalized[id]) {
      normalized[id] = mergeTicket(incoming)
    }
  })

  return normalized
}

const getStoredTickets = (): Record<string, TicketDetail> => {
  if (typeof window === "undefined") return initialTicketsData
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    return normalizeTicketsData(JSON.parse(stored))
  }
  const normalized = normalizeTicketsData(initialTicketsData)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

const saveTicketsToStorage = (tickets: Record<string, TicketDetail>) => {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTicketsData(tickets)))
}

interface TicketDetailPageProps {
  ticketId?: string
  backUrl?: string
}

export default function TicketDetailPage({ ticketId, backUrl = "/support/reports" }: TicketDetailPageProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>("reply")
  const [replyContent, setReplyContent] = useState("")
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>([])
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [ticketStatus, setTicketStatus] = useState<TicketDetail["status"]>("open")
  const [ticketPriority, setTicketPriority] = useState<TicketDetail["priority"]>("medium")
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [relatedTickets, setRelatedTickets] = useState<TicketDetail[]>([])
  const [mergeTarget, setMergeTarget] = useState("")
  const [selectedAdminId, setSelectedAdminId] = useState(ADMIN_OPTIONS[0].id)
  const selectedAdmin = useMemo(
    () => ADMIN_OPTIONS.find((admin) => admin.id === selectedAdminId) || ADMIN_OPTIONS[0],
    [selectedAdminId]
  )

  const reminderList = [
    { id: "r1", title: "Follow up user", time: "Hari ini 16:00" },
    { id: "r2", title: "Kirim update perbaikan", time: "Besok 09:00" }
  ]

  const taskList = [
    { id: "t1", title: "Cek log server", done: false },
    { id: "t2", title: "Reproduksi bug di staging", done: true },
    { id: "t3", title: "Koordinasi dengan tim produk", done: false }
  ]

  useEffect(() => {
    if (ticketId) {
      const tickets = getStoredTickets()
      const ticketData = tickets[ticketId]
      if (ticketData) {
        setTicket(ticketData)
        setTicketStatus(ticketData.status)
        setTicketPriority(ticketData.priority)
        const matchedAdmin = ADMIN_OPTIONS.find((a) => a.name === ticketData.assignedTo)
        if (matchedAdmin) {
          setSelectedAdminId(matchedAdmin.id)
        }
      }
      const currentId = Number(ticketId)
      setRelatedTickets(
        Object.values(tickets)
          .filter(t => t.id !== currentId)
          .slice(0, 4)
      )
    }
  }, [ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ticket?.messages])

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string; bgClass: string; icon: React.ReactNode }> = {
      open: {
        label: 'Open',
        className: 'text-red-700 dark:text-red-400',
        bgClass: 'bg-red-500',
        icon: <AlertCircle className="w-4 h-4" />
      },
      in_progress: {
        label: 'In Progress',
        className: 'text-yellow-700 dark:text-yellow-400',
        bgClass: 'bg-yellow-500',
        icon: <Clock className="w-4 h-4" />
      },
      answered: {
        label: 'Answered',
        className: 'text-blue-700 dark:text-blue-400',
        bgClass: 'bg-blue-500',
        icon: <MessageSquare className="w-4 h-4" />
      },
      on_hold: {
        label: 'On Hold',
        className: 'text-gray-700 dark:text-gray-400',
        bgClass: 'bg-gray-500',
        icon: <Clock className="w-4 h-4" />
      },
      closed: {
        label: 'Closed',
        className: 'text-green-700 dark:text-green-400',
        bgClass: 'bg-green-500',
        icon: <CheckCircle className="w-4 h-4" />
      },
    }
    return config[status] || { label: status, className: 'text-gray-700', bgClass: 'bg-gray-500', icon: null }
  }

  const getPriorityConfig = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      low: { label: 'Low', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      high: { label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    }
    return config[priority] || { label: priority, className: 'bg-gray-100 text-gray-700' }
  }

  const formatDateTime = (dateValue?: string) => {
    try {
      const date = dateValue ? new Date(dateValue) : new Date()
      if (Number.isNaN(date.getTime())) return dateValue || "-"
      const day = date.getDate().toString().padStart(2, "0")
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      const hour = date.getHours().toString().padStart(2, "0")
      const minute = date.getMinutes().toString().padStart(2, "0")
      return `${day} ${month} ${year} ${hour}:${minute}`
    } catch {
      return dateValue || "-"
    }
  }

  const fileToAttachment = (file: File): Promise<Attachment> => {
    const isImg = file.type.startsWith("image/")
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          name: file.name,
          url: reader.result as string,
          type: isImg ? "image" : "file"
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const attachments = await Promise.all(files.map(fileToAttachment))
    setDraftAttachments((prev) => [...prev, ...attachments])
    setFileInputKey(Date.now())
  }

  const handleSendMessage = (mode: "reply" | "note") => {
    if (!replyContent.trim() || !ticket || !ticketId) return

    const nextStatus = mode === "reply" ? (ticketStatus === "open" ? "answered" : ticketStatus) : ticketStatus

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "Admin Support",
      role: "staff",
      content: replyContent,
      posted_at: formatDateTime(),
      attachments: draftAttachments,
      isNote: mode === "note"
    }

    const updatedTicket: TicketDetail = {
      ...ticket,
      messages: [...ticket.messages, newMessage],
      status: nextStatus,
      priority: ticketPriority,
      last_reply: "Baru saja"
    }

    setTicket(updatedTicket)
    setTicketStatus(updatedTicket.status)

    const tickets = getStoredTickets()
    tickets[ticketId] = updatedTicket
    saveTicketsToStorage(tickets)

    setReplyContent("")
    setDraftAttachments([])
    setFileInputKey(Date.now())
    showSuccessToast()
  }

  const handleStatusChange = (newStatus: TicketDetail["status"]) => {
    setTicketStatus(newStatus)
    setShowStatusDropdown(false)

    if (ticket && ticketId) {
      const updatedTicket = { ...ticket, status: newStatus }
      setTicket(updatedTicket)
      const tickets = getStoredTickets()
      tickets[ticketId] = updatedTicket
      saveTicketsToStorage(tickets)
      showSuccessToast()
    }
  }

  const handlePriorityChange = (newPriority: TicketDetail["priority"]) => {
    setTicketPriority(newPriority)

    if (ticket && ticketId) {
      const updatedTicket = { ...ticket, priority: newPriority }
      setTicket(updatedTicket)
      const tickets = getStoredTickets()
      tickets[ticketId] = updatedTicket
      saveTicketsToStorage(tickets)
      showSuccessToast()
    }
  }

  const handleAssignChange = (assignee: string) => {
    if (!ticket || !ticketId) return
    const admin = ADMIN_OPTIONS.find((item) => item.id === assignee)
    const updatedTicket = { ...ticket, assignedTo: admin?.name || assignee }
    setTicket(updatedTicket)
    const tickets = getStoredTickets()
    tickets[ticketId] = updatedTicket
    saveTicketsToStorage(tickets)
    showSuccessToast()
  }

  const handleMergeTicket = () => {
    if (!mergeTarget.trim()) return
    setMergeTarget("")
    showSuccessToast()
  }


  const handleAddTag = () => {
    if (!newTag.trim() || !ticket || !ticketId) return
    if (ticket.tags.includes(newTag.trim())) return

    const updatedTicket = { ...ticket, tags: [...ticket.tags, newTag.trim()] }
    setTicket(updatedTicket)

    const tickets = getStoredTickets()
    tickets[ticketId] = updatedTicket
    saveTicketsToStorage(tickets)

    setNewTag("")
    showSuccessToast()
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (!ticket || !ticketId) return

    const updatedTicket = { ...ticket, tags: ticket.tags.filter(t => t !== tagToRemove) }
    setTicket(updatedTicket)

    const tickets = getStoredTickets()
    tickets[ticketId] = updatedTicket
    saveTicketsToStorage(tickets)
    showSuccessToast()
  }

  const showSuccessToast = () => {
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 mb-6 rounded-lg">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Skeleton */}
          <div className="flex-1 space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-3/4 rounded-lg" />
              <Skeleton className="h-20 w-1/2 rounded-lg self-end ml-auto" />
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="w-full lg:w-80 bg-white dark:bg-gray-800 p-6 space-y-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(ticketStatus)
  const noteMessages = ticket.messages.filter((message) => message.isNote)
  const conversationMessages = ticket.messages.filter((message) => !message.isNote)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Success Toast */}
      {showSaveSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5" />
          <span className="font-medium">Berhasil disimpan!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(backUrl)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Tiket #{ticket.id}
                </h1>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white ${statusConfig.bgClass}`}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 min-w-[160px] overflow-hidden">
                      {(["open", "in_progress", "answered", "on_hold", "closed"] as const).map((status) => {
                        const config = getStatusConfig(status)
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${ticketStatus === status ? "bg-gray-100 dark:bg-gray-700" : ""
                              }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${config.bgClass}`}></span>
                            {config.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{ticket.subject}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Notes */}
          {noteMessages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span>Note</span>
              </div>
              <div className="space-y-3">
                {noteMessages.slice(-3).map((note) => (
                  <Card
                    key={note.id}
                    className="border border-amber-100 dark:border-amber-900/40 bg-white dark:bg-gray-800 shadow-sm"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-semibold flex items-center justify-center">
                          {note.sender.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Ticket note by {note.sender}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Note added: {formatDateTime(note.posted_at)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      {note.attachments && note.attachments.length > 0 && (
                        <div className="pt-3 border-t border-amber-100 dark:border-amber-900/40">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Lampiran:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {note.attachments.map((file, idx) => {
                              const isImage = isImageAttachment(file)
                              return isImage ? (
                                <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={file.url} alt={file.name} className="w-full h-32 object-cover" />
                                  <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                                    <span className="truncate">{file.name}</span>
                                    <Paperclip className="w-3 h-3" />
                                  </div>
                                </div>
                              ) : (
                                <a
                                  key={idx}
                                  href={file.url}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                                >
                                  <Paperclip className="w-4 h-4" />
                                  {file.name}
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Reply Form */}
          <Card className="bg-white dark:bg-gray-800 shadow-md border-0">
            <CardContent className="p-0">
              {/* Tabs */}
              <div className="flex flex-wrap border-b border-gray-100 dark:border-gray-700">
                {[
                  { key: "reply", label: "Add Reply", icon: <MessageSquare className="w-4 h-4" /> },
                  { key: "note", label: "Add Note", icon: <StickyNote className="w-4 h-4" /> },
                  { key: "reminder", label: "Reminders", icon: <Bell className="w-4 h-4" /> },
                  { key: "others", label: "Other Tickets", icon: <Layers className="w-4 h-4" /> },
                  { key: "task", label: "Task", icon: <ListChecks className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as DetailTab)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {(activeTab === "reply" || activeTab === "note") && (
                  <>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={activeTab === "reply" ? "Tulis balasan untuk user..." : "Tulis catatan internal..."}
                      className="w-full h-32 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                    />

                    {activeTab === "reply" ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-sm">
                          <Paperclip className="w-4 h-4" />
                          <span>Lampirkan File</span>
                          <input
                            key={fileInputKey}
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="mark-completed"
                              onChange={(e) => {
                                if (e.target.checked) handleStatusChange("closed")
                              }}
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                            <label htmlFor="mark-completed" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                              Selesai
                            </label>
                          </div>

                          <select
                            value={ticketStatus}
                            onChange={(e) => handleStatusChange(e.target.value as TicketDetail["status"])}
                            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="answered">Answered</option>
                            <option value="on_hold">On Hold</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            onClick={() => handleSendMessage("reply")}
                            disabled={!replyContent.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                          >
                            <Send className="w-4 h-4" />
                            Kirim Balasan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleSendMessage("note")}
                          disabled={!replyContent.trim()}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                        >
                          <Send className="w-4 h-4" />
                          Add Note
                        </button>
                      </div>
                    )}

                    {draftAttachments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {draftAttachments.map((file, idx) => {
                          const isImg = isImageAttachment(file)
                          return isImg ? (
                            <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={file.url} alt={file.name} className="w-full h-32 object-cover" />
                              <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                                <span className="truncate">{file.name}</span>
                                <Paperclip className="w-3 h-3" />
                              </div>
                            </div>
                          ) : (
                            <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200">
                              <Paperclip className="w-4 h-4" />
                              <span className="truncate">{file.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "reminder" && (
                  <div className="space-y-3">
                    {reminderList.map((reminder) => (
                      <div key={reminder.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{reminder.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{reminder.time}</p>
                        </div>
                        <Bell className="w-4 h-4 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "others" && (
                  <div className="space-y-3">
                    {relatedTickets.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada tiket lain.</p>
                    ) : relatedTickets.map((item) => {
                      const config = getStatusConfig(item.status)
                      return (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">#{item.id} • {item.subject}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.department} • {item.priority} • {item.last_reply}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${config.className}`}>
                            {config.icon}
                            {config.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeTab === "task" && (
                  <div className="space-y-3">
                    {taskList.map((task) => (
                      <label key={task.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/40 cursor-pointer">
                        <input type="checkbox" checked={task.done} readOnly className="rounded border-gray-300 dark:border-gray-600" />
                        <span className={`text-sm ${task.done ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-100"}`}>
                          {task.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Conversation
            </h2>
            <div className="space-y-0.5">
              {conversationMessages.map((message, index) => {
                const isStaff = message.role === "staff"
                const prevMessage = index > 0 ? conversationMessages[index - 1] : null
                const isSameSender = prevMessage && prevMessage.role === message.role

                // Format time (HH:MM)
                const getTime = (dateValue?: string) => {
                  try {
                    const date = dateValue ? new Date(dateValue) : new Date()
                    if (Number.isNaN(date.getTime())) return ""
                    return date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0")
                  } catch { return "" }
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex items-end gap-1 max-w-[75%] ${isStaff ? "flex-row-reverse" : ""}`}>
                      {!isSameSender ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0 ${isStaff ? "bg-emerald-500" : "bg-slate-500"}`}>
                          {message.sender.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className={`inline-flex items-end gap-1 px-2 py-1 rounded-lg text-[12px] ${isStaff
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                          }`}>
                          <span className="whitespace-pre-wrap leading-tight">{message.content}</span>
                          <span className={`text-[8px] flex-shrink-0 ${isStaff ? "text-emerald-200" : "text-gray-400"}`}>
                            {getTime(message.posted_at)}
                          </span>
                        </div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-0.5">
                            {message.attachments.map((file, idx) => {
                              const isImage = isImageAttachment(file)
                              return isImage ? (
                                <div key={idx} className="rounded overflow-hidden max-w-[80px]">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={file.url} alt={file.name} className="w-full h-12 object-cover rounded" />
                                </div>
                              ) : (
                                <a key={idx} href={file.url} className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px]">
                                  <Paperclip className="w-2 h-2" />{file.name}
                                </a>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Informasi Tiket
          </h2>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Subject</p>
              <p className="font-semibold text-gray-900 dark:text-white mt-1 leading-snug">{ticket.subject}</p>
            </div>

            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
              <label className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                Admin in Charge
              </label>
              <select
                value={selectedAdminId}
                onChange={(e) => {
                  setSelectedAdminId(e.target.value)
                  handleAssignChange(e.target.value)
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                {ADMIN_OPTIONS.map((admin) => (
                  <option key={admin.id} value={admin.id}>{admin.name}</option>
                ))}
              </select>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Link href={`/profile/${selectedAdmin.username || '#'}`}>
                  <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAdmin.name)}&background=10b981&color=fff`} />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${selectedAdmin.username || '#'}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-emerald-600 truncate block">
                    {selectedAdmin.name}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={selectedAdmin.email}>
                    {selectedAdmin.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Departement", value: ticket.department, icon: <Building2 className="w-3 h-3" /> },
              { label: "Service", value: ticket.service, icon: <Tag className="w-3 h-3" /> },
              { label: "Project", value: ticket.project, icon: <Briefcase className="w-3 h-3" /> },
              { label: "Status", value: ticketStatus.toUpperCase(), icon: <AlertCircle className="w-3 h-3" /> }
            ].map((item, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  {item.icon} {item.label}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Assigned Admin
            </label>
            <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-900 dark:text-white">
              {selectedAdmin.name}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <AlertCircle className="w-4 h-4" />
              Prioritas
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((priority) => {
                const config = getPriorityConfig(priority)
                return (
                  <button
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${ticketPriority === priority
                      ? `${config.className} ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600`
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <GitMerge className="w-4 h-4" />
              Merge Ticket
            </label>
            <div className="flex gap-2">
              <input
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                placeholder="Masukkan ID tiket"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              />
              <button
                onClick={handleMergeTicket}
                disabled={!mergeTarget.trim()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Merge
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {ticket.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Tambah tag..."
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">Dibuat</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(ticket.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">Balasan Terakhir</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(ticket.last_reply)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}
