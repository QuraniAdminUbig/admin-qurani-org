"use client"

import { Card, CardContent } from "@/components/ui/card"
import { 
  Plus, 
  RefreshCw, 
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter,
  FileSpreadsheet,
  FileText,
  Printer,
  X
} from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"

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

interface TicketListItem {
  id: number
  subject: string
  tags: string[]
  contact: string
  email: string
  department: string
  service: string
  project: string
  assignedTo: string
  status: "open" | "in_progress" | "answered" | "on_hold" | "closed"
  priority: "low" | "medium" | "high"
  last_reply: string
  created_at: string
  preview: string
  messageCount: number
}

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

const convertToTicketList = (ticketsData: Record<string, TicketDetail>): TicketListItem[] => {
  return Object.values(ticketsData)
    .map(t => ({
      id: t.id,
      subject: t.subject,
      tags: t.tags,
      contact: t.contact.name,
      email: t.contact.email,
      department: t.department,
      service: t.service,
      project: t.project,
      assignedTo: t.assignedTo,
      status: t.status,
      priority: t.priority,
      last_reply: t.last_reply,
      created_at: t.created_at,
      preview: t.messages[0]?.content || "",
      messageCount: t.messages.length
    }))
    .sort((a, b) => b.id - a.id)
}

type StatusType = "all" | "open" | "in_progress" | "answered" | "on_hold" | "closed"
type PriorityType = "all" | "low" | "medium" | "high"
type PageSize = number | "all"

export default function UserReportsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusType>("all")
  const [priorityFilter, setPriorityFilter] = useState<PriorityType>("all")
  const [selectedTickets, setSelectedTickets] = useState<number[]>([])
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<PageSize>(25)
  const [isExporting, setIsExporting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkMerge, setBulkMerge] = useState(false)
  const [bulkDelete, setBulkDelete] = useState(false)
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkDepartment, setBulkDepartment] = useState("")
  const [bulkPriority, setBulkPriority] = useState("")
  const [bulkService, setBulkService] = useState("")
  const [showBulkSuccess, setShowBulkSuccess] = useState(false)

  useEffect(() => {
    const ticketsData = getStoredTickets()
    setTickets(convertToTicketList(ticketsData))
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      const ticketsData = getStoredTickets()
      setTickets(convertToTicketList(ticketsData))
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = 
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tickets, searchQuery, statusFilter, priorityFilter])

  const paginatedTickets = useMemo(() => {
    if (itemsPerPage === "all") return filteredTickets
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredTickets.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredTickets, currentPage, itemsPerPage])

  const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filteredTickets.length / itemsPerPage)
  const startItem = filteredTickets.length === 0 ? 0 : (itemsPerPage === "all" ? 1 : ((currentPage - 1) * itemsPerPage) + 1)
  const endItem = itemsPerPage === "all" ? filteredTickets.length : Math.min(currentPage * itemsPerPage, filteredTickets.length)

  const handleExport = (type: "excel" | "csv" | "print") => {
    if (filteredTickets.length === 0) return
    setIsExporting(true)
    setShowExportDropdown(false)
    
    const headers = ["ID", "Subject", "Department", "Contact", "Email", "Status", "Priority", "Last Reply", "Created"]
    const rows = filteredTickets.map((t) => [
      t.id,
      t.subject,
      t.department,
      t.contact,
      t.email,
      t.status,
      t.priority,
      t.last_reply,
      t.created_at
    ])

    if (type === "csv") {
      const csvRows = rows.map((r) => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      const csv = [headers.join(","), ...csvRows].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "tickets.csv"
      link.click()
      URL.revokeObjectURL(url)
    } else if (type === "excel") {
      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'
      const workbookStart = '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Tickets"><Table>'
      const workbookEnd = '</Table></Worksheet></Workbook>'
      
      const headerRow = '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>'
      const dataRows = rows.map(r => '<Row>' + r.map(cell => `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('') + '</Row>').join('')
      
      const xml = xmlHeader + workbookStart + headerRow + dataRows + workbookEnd
      const blob = new Blob([xml], { type: "application/vnd.ms-excel" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "tickets.xls"
      link.click()
      URL.revokeObjectURL(url)
    } else if (type === "print") {
      const printContent = `
        <html>
        <head>
          <title>Tickets Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #10b981; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>Tickets Report</h1>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </body>
        </html>
      `
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
    
    setTimeout(() => setIsExporting(false), 300)
  }

  const handleBulkAction = () => {
    if (!selectedTickets.length) {
      window.alert("Pilih tiket terlebih dahulu untuk bulk action.")
      return
    }
    setShowBulkModal(true)
  }

  const handleBulkConfirm = () => {
    const storedData = localStorage.getItem(STORAGE_KEY)
    const ticketsData = storedData ? JSON.parse(storedData) : {}
    
    if (bulkDelete) {
      selectedTickets.forEach(id => {
        delete ticketsData[id.toString()]
      })
    } else {
      selectedTickets.forEach(id => {
        const ticket = ticketsData[id.toString()]
        if (ticket) {
          if (bulkStatus) ticket.status = bulkStatus
          if (bulkDepartment) ticket.department = bulkDepartment
          if (bulkPriority) ticket.priority = bulkPriority.toLowerCase()
          if (bulkService) ticket.service = bulkService
        }
      })
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ticketsData))
    setTickets(convertToTicketList(ticketsData))
    setSelectedTickets([])
    setShowBulkModal(false)
    setBulkMerge(false)
    setBulkDelete(false)
    setBulkStatus("")
    setBulkDepartment("")
    setBulkPriority("")
    setBulkService("")
    
    setShowBulkSuccess(true)
    setTimeout(() => setShowBulkSuccess(false), 2000)
  }

  const closeBulkModal = () => {
    setShowBulkModal(false)
    setBulkMerge(false)
    setBulkDelete(false)
    setBulkStatus("")
    setBulkDepartment("")
    setBulkPriority("")
    setBulkService("")
  }

  const statusCounts = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    answered: tickets.filter(t => t.status === "answered").length,
    on_hold: tickets.filter(t => t.status === "on_hold").length,
    closed: tickets.filter(t => t.status === "closed").length,
  }), [tickets])

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      open: { 
        label: 'Open', 
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: <AlertCircle className="w-3 h-3" />
      },
      in_progress: { 
        label: 'In Progress', 
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Clock className="w-3 h-3" />
      },
      answered: { 
        label: 'Answered', 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <MessageSquare className="w-3 h-3" />
      },
      on_hold: { 
        label: 'On Hold', 
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        icon: <Clock className="w-3 h-3" />
      },
      closed: { 
        label: 'Closed', 
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="w-3 h-3" />
      },
    }
    return config[status] || { label: status, className: 'bg-gray-100 text-gray-700', icon: null }
  }

  const getPriorityConfig = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      low: { label: 'Low', className: 'text-gray-500 dark:text-gray-400' },
      medium: { label: 'Medium', className: 'text-yellow-600 dark:text-yellow-400' },
      high: { label: 'High', className: 'text-red-600 dark:text-red-400 font-semibold' },
    }
    return config[priority] || { label: priority, className: 'text-gray-500' }
  }

  const handleSelectAll = () => {
    if (selectedTickets.length === paginatedTickets.length) {
      setSelectedTickets([])
    } else {
      setSelectedTickets(paginatedTickets.map(t => t.id))
    }
  }

  const handleSelectTicket = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTickets(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    )
  }

  const handleTicketClick = (ticketId: number) => {
    router.push(`/support/reports/${ticketId}`)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    const ticketsData = getStoredTickets()
    setTickets([...convertToTicketList(ticketsData)])
    setSearchQuery("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setCurrentPage(1)
    setSelectedTickets([])
    setTimeout(() => setIsRefreshing(false), 300)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Bulk Success Notification */}
      {showBulkSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Bulk action berhasil!</span>
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push('/support/reports/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-black rounded-lg font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
          {(["open", "in_progress", "answered", "on_hold", "closed"] as StatusType[]).map((status) => {
            const config = getStatusConfig(status)
            const tone: Record<StatusType, string> = {
              all: "text-gray-700",
              open: "text-red-500",
              in_progress: "text-green-600",
              answered: "text-blue-600",
              on_hold: "text-gray-600",
              closed: "text-blue-500",
            }
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(statusFilter === status ? "all" : status)
                  setCurrentPage(1)
                }}
                className={`inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-semibold transition-colors ${
                  statusFilter === status ? "ring-2 ring-emerald-500" : ""
                }`}
              >
                <span className={tone[status] || config.className}>{statusCounts[status]}</span>
                <span className={tone[status] || config.className}>{config.label}</span>
              </button>
            )
          })}
        </div>

        <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Ticket List */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const value = e.target.value === "all" ? "all" : Number(e.target.value)
                setItemsPerPage(value as PageSize)
                setCurrentPage(1)
              }}
              className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>

            <div className="relative" ref={exportDropdownRef}>
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 inline-flex items-center gap-2"
                disabled={isExporting}
              >
                Export
                <ChevronDown className="w-4 h-4" />
              </button>
              {showExportDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 min-w-[140px] overflow-hidden">
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Excel
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport("print")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-gray-600" />
                    Print
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleBulkAction}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Bulk Actions
            </button>
            <button 
              onClick={handleRefresh}
              className="px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Refresh"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 text-gray-700 dark:text-gray-200 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <div className="ml-auto w-full md:w-72">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {paginatedTickets.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Tidak ada tiket ditemukan
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Coba ubah filter atau kata kunci pencarian
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {/* Header Row */}
              <div className="hidden md:grid grid-cols-[42px_70px_1.6fr_1.2fr_1.3fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase rounded-t-lg">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedTickets.length === paginatedTickets.length && paginatedTickets.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="flex items-center">Angka</div>
                <div>Subject</div>
                <div>Departement</div>
                <div>Contact</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Last Reply</div>
                <div>Created</div>
              </div>

              {/* Ticket Rows */}
              {paginatedTickets.map((ticket) => {
                const statusConfig = getStatusConfig(ticket.status)
                const priorityConfig = getPriorityConfig(ticket.priority)
                
                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleTicketClick(ticket.id)}
                    className="grid grid-cols-1 md:grid-cols-[42px_70px_1.6fr_1.2fr_1.3fr_1fr_1fr_1fr_1fr] items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    {/* Checkbox */}
                    <div className="hidden md:flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedTickets.includes(ticket.id)}
                        onChange={(e) => handleSelectTicket(ticket.id, e as unknown as React.MouseEvent)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </div>

                    {/* Number */}
                    <div className="hidden md:flex items-center">
                      <span className="text-sm font-semibold text-emerald-600">#{ticket.id}</span>
                    </div>

                    {/* Subject */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="md:hidden text-xs font-semibold text-emerald-600">#{ticket.id}</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {ticket.subject}
                        </h3>
                        <span className={`md:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${statusConfig.className}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {ticket.preview}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ticket.tags.map((tag, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[11px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Department */}
                    <div className="hidden md:block text-sm font-medium text-gray-900 dark:text-white">
                      {ticket.department}
                    </div>

                    {/* Contact */}
                    <div className="hidden md:block">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {ticket.contact}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {ticket.email}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="hidden md:flex items-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="hidden md:flex items-center">
                      <span className={`text-sm font-semibold ${priorityConfig.className}`}>
                        {priorityConfig.label}
                      </span>
                    </div>

                    {/* Last Reply */}
                    <div className="hidden md:block text-sm text-gray-900 dark:text-white">
                      {ticket.last_reply}
                    </div>

                    {/* Created */}
                    <div className="hidden md:block text-sm text-gray-900 dark:text-white">
                      {ticket.created_at}
                    </div>

                    {/* Mobile Quick Info */}
                    <div className="md:hidden flex items-center justify-between text-xs text-gray-500">
                      <span>{ticket.department}</span>
                      <span className={priorityConfig.className}>{priorityConfig.label}</span>
                      <span>{ticket.last_reply}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Menampilkan {startItem} - {endItem} dari {filteredTickets.length} tiket
              </p>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Sebelumnya
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-emerald-500 text-white"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk Actions</h2>
              <button onClick={closeBulkModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkMerge}
                    onChange={(e) => setBulkMerge(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Merge Tickets</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkDelete}
                    onChange={(e) => setBulkDelete(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Mass Delete</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Change Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Nothing selected</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="answered">Answered</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select
                  value={bulkDepartment}
                  onChange={(e) => setBulkDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Nothing selected</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Teknis">Teknis</option>
                  <option value="Produk">Produk</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Data">Data</option>
                  <option value="Audio">Audio</option>
                  <option value="Sales">Sales</option>
                  <option value="Support">Support</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket Priority</label>
                <select
                  value={bulkPriority}
                  onChange={(e) => setBulkPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Nothing selected</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="text-emerald-500">●</span> Tags:
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tag</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label>
                <select
                  value={bulkService}
                  onChange={(e) => setBulkService(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Nothing selected</option>
                  <option value="Aplikasi Mobile">Aplikasi Mobile</option>
                  <option value="Fitur Hafalan">Fitur Hafalan</option>
                  <option value="Pembaca Ayat">Pembaca Ayat</option>
                  <option value="Bookmark">Bookmark</option>
                  <option value="Sinkronisasi">Sinkronisasi</option>
                  <option value="Streaming">Streaming</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeBulkModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleBulkConfirm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
