"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import {
  ArrowLeft,
  Send,
  Paperclip,
  AlertCircle,
  Clock,
  User,
  Plus,
  Trash2,
  MessageSquare,
  StickyNote,
  ChevronDown,
  X,
  Check,
  CheckCircle,
  Bell,
  Layers,
  ListChecks,
  PanelRight,
  Edit,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"


import {
  fetchTicketById,
  fetchRelatedTickets,
  type TicketWithReplies,
  type TicketListItem,
} from "@/utils/api/tickets/fetch"
import { createTicketReply } from "@/utils/api/tickets/insert"
import { updateTicketStatus, updateTicketPriority } from "@/utils/api/tickets/update"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/utils/supabase/client"
import { fetchRegularUsers, type RegularUser } from "@/utils/api/users/fetch-users"
import { cn } from "@/lib/utils"

type DetailTab = "reply" | "note" | "reminder" | "others" | "task"

interface Note {
  id: string
  content: string
  author: string
  date: string
}

interface Reminder {
  id: string
  title: string
  date: string
  notifyEmail: boolean
  staff: string
}

interface Task {
  id: string
  title: string
  status: "pending" | "in_progress" | "completed"
  assignee: string
  dueDate: string
}

interface TicketDetailPageWrapperProps {
  ticketId: string
  backUrl?: string
}

export default function TicketDetailPageWrapper({ ticketId, backUrl = "/support/tickets" }: TicketDetailPageWrapperProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()

  // Assign ticket state
  const [users, setUsers] = useState<RegularUser[]>([])

  const [selectedAssignee, setSelectedAssignee] = useState<RegularUser | null>(null)
  const [assigneeSearch, setAssigneeSearch] = useState("")
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)

  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [newReminder, setNewReminder] = useState({ title: "", date: "", notifyEmail: false, staff: "" })
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState({ title: "", assignee: "", dueDate: "" })

  // UI States for Responsive Layout (Simplified for 2-col)
  const [showInfoPanel, setShowInfoPanel] = useState(false) // For mobile toggling only
  const [textareaHeight, setTextareaHeight] = useState("auto")

  // Auto-resize textarea
  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaHeight("auto") // Reset height
    const newHeight = `${Math.max(100, e.target.scrollHeight)}px`
    setTextareaHeight(newHeight)
    setReplyContent(e.target.value)
  }

  useEffect(() => {
    const savedNotes = localStorage.getItem(`ticket_${ticketId}_notes`)
    const savedReminders = localStorage.getItem(`ticket_${ticketId}_reminders`)
    const savedTasks = localStorage.getItem(`ticket_${ticketId}_tasks`)
    if (savedNotes) setNotes(JSON.parse(savedNotes))
    if (savedReminders) setReminders(JSON.parse(savedReminders))
    if (savedTasks) setTasks(JSON.parse(savedTasks))
  }, [ticketId])

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes)
    localStorage.setItem(`ticket_${ticketId}_notes`, JSON.stringify(newNotes))
  }

  const saveReminders = (newReminders: Reminder[]) => {
    setReminders(newReminders)
    localStorage.setItem(`ticket_${ticketId}_reminders`, JSON.stringify(newReminders))
  }

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    localStorage.setItem(`ticket_${ticketId}_tasks`, JSON.stringify(newTasks))
  }

  const [activeTab, setActiveTab] = useState<DetailTab>("reply")
  const [replyContent, setReplyContent] = useState("")
  const [ticket, setTicket] = useState<TicketWithReplies | null>(null)
  const [ticketStatus, setTicketStatus] = useState("Open")
  const [ticketPriority, setTicketPriority] = useState("Medium")
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  // Split loading states
  const [isTicketLoading, setIsTicketLoading] = useState(true)
  const [isSecondaryLoading, setIsSecondaryLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  const [relatedTickets, setRelatedTickets] = useState<TicketListItem[]>([])

  // ... (keep note/reminder states)

  const loadTicket = useCallback(async () => {
    // 1. Critical Data: Fetch Ticket ASAP
    setIsTicketLoading(true)
    try {
      const ticketResult = await fetchTicketById(parseInt(ticketId))

      if (ticketResult.success && ticketResult.data) {
        setTicket(ticketResult.data)
        setTicketStatus(ticketResult.data.status)
        setTicketPriority(ticketResult.data.priority)
      }
    } catch (error) {
      console.error("Error loading ticket:", error)
    } finally {
      // Unblock UI immediately after ticket loads
      setIsTicketLoading(false)
    }

    // 2. Secondary Data: Fetch in background
    setIsSecondaryLoading(true)
    try {
      const [relatedResult, userResult] = await Promise.all([
        fetchRelatedTickets(parseInt(ticketId)),
        fetchRegularUsers()
      ])

      if (relatedResult.success && relatedResult.data) {
        setRelatedTickets(relatedResult.data)
      }

      if (!userResult.error) {
        setUsers(userResult.users)
      }
    } catch (error) {
      console.error("Error loading secondary data:", error)
    } finally {
      setIsSecondaryLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    loadTicket()
  }, [loadTicket])

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  const handleSelectAssignee = (user: RegularUser) => {
    setSelectedAssignee(user)
    setAssigneeSearch(user.name)
    setShowAssigneeDropdown(false)
    showSuccessToast()
  }

  useEffect(() => {
    let supabase
    try {
      supabase = createClient()
    } catch (error) {
      console.error("Failed to init realtime client:", error)
      return
    }
    const channel = supabase
      .channel(`ticket-${ticketId}-replies`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_replies",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          console.log("🔔 New reply for ticket:", ticketId, payload)
          loadTicket()
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [ticketId, loadTicket])

  // Scroll to bottom on load/update
  useEffect(() => {
    if (activeTab === 'reply') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [ticket?.replies, activeTab])

  const getStatusConfig = (status: string) => {
    // Perfex Style: Often simple badges or text colors
    const config: Record<string, { label: string; className: string; bgClass: string; icon: React.ReactNode }> = {
      Open: {
        label: 'Open',
        className: 'text-red-700 dark:text-red-400',
        bgClass: 'bg-red-500',
        icon: <AlertCircle className="w-3.5 h-3.5" />
      },
      "In Progress": {
        label: 'In Progress',
        className: 'text-yellow-700 dark:text-yellow-400',
        bgClass: 'bg-yellow-500',
        icon: <Clock className="w-3.5 h-3.5" />
      },
      Answered: {
        label: 'Answered',
        className: 'text-blue-700 dark:text-blue-400',
        bgClass: 'bg-blue-500',
        icon: <MessageSquare className="w-3.5 h-3.5" />
      },
      "On Hold": {
        label: 'On Hold',
        className: 'text-gray-700 dark:text-gray-400',
        bgClass: 'bg-gray-500',
        icon: <Clock className="w-3.5 h-3.5" />
      },
      Closed: {
        label: 'Closed',
        className: 'text-green-700 dark:text-green-400',
        bgClass: 'bg-green-500',
        icon: <CheckCircle className="w-3.5 h-3.5" />
      },
    }
    return config[status] || { label: status, className: 'text-gray-700', bgClass: 'bg-gray-500', icon: null }
  }



  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-"
    try {
      let dateStr = dateString
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr.replace(' ', 'T') + 'Z'
      }
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) return dateString

      const day = date.getDate().toString().padStart(2, "0")
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      const hour = date.getHours().toString().padStart(2, "0")
      const minute = date.getMinutes().toString().padStart(2, "0")
      // Perfex format is often YYYY-MM-DD HH:mm or similar, but friendly format is better
      return `${day} ${month} ${year} ${hour}:${minute}`
    } catch {
      return dateString
    }
  }

  const isUserMessage = (author: string) => {
    if (!ticket) return false
    return author.toLowerCase() === ticket.contact.toLowerCase()
  }



  const handleSendMessage = async () => {
    if (!replyContent.trim() || !ticket) return
    setIsSending(true)
    const authorName = profile?.name || "Admin"
    const messageContent = replyContent.trim()

    // OPTIMISTIC UI: Show message immediately (before server confirms)
    const optimisticReply = {
      id: Date.now(),
      ticket_id: ticket.id,
      author: authorName,
      message: messageContent,
      date: new Date().toISOString(),
      attachments: null
    }
    setTicket(prev => prev ? { ...prev, replies: [...prev.replies, optimisticReply] } : prev)
    setReplyContent("")
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, 50)

    try {
      // User requested: Do NOT auto-update status on reply
      // const newStatus = ticketStatus === "Open" ? "Answered" : ticketStatus
      await Promise.all([
        createTicketReply({
          ticket_id: ticket.id,
          author: authorName,
          message: messageContent,
          isFromAdmin: true
        })
      ])
      showSuccessToast()
    } catch (error) {
      console.error("Error sending reply:", error)
      setTicket(prev => prev ? { ...prev, replies: prev.replies.filter(r => r.id !== optimisticReply.id) } : prev)
      setReplyContent(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  // Handle manual status change
  const handleStatusChange = async (newStatus: string) => {
    setTicketStatus(newStatus)
    if (ticket) {
      try {
        await updateTicketStatus(ticket.id, newStatus)
        showSuccessToast()
      } catch (error) {
        console.error("Failed to update status", error)
      }
    }
  }



  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket) return
    try {
      const result = await updateTicketPriority(ticket.id, newPriority)
      if (result.success) {
        setTicketPriority(newPriority)
        showSuccessToast()
      }
    } catch (error) {
      console.error("Error updating priority:", error)
    }
  }


  const handleAddNote = () => {
    if (!newNote.trim()) return
    const note: Note = { id: Date.now().toString(), content: newNote, author: profile?.name || "Admin", date: new Date().toISOString() }
    saveNotes([...notes, note])
    setNewNote("")
    showSuccessToast()
  }

  const handleAddReminder = () => {
    if (!newReminder.title.trim() || !newReminder.date) return
    const reminder: Reminder = { id: Date.now().toString(), ...newReminder }
    saveReminders([...reminders, reminder])
    setNewReminder({ title: "", date: "", notifyEmail: false, staff: "" })
    showSuccessToast()
  }

  const handleDeleteReminder = (reminderId: string) => {
    saveReminders(reminders.filter(r => r.id !== reminderId))
    showSuccessToast()
  }

  const handleAddTask = () => {
    if (!newTask.title.trim()) return
    const task: Task = { id: Date.now().toString(), title: newTask.title, status: "pending", assignee: newTask.assignee || profile?.name || "Admin", dueDate: newTask.dueDate }
    saveTasks([...tasks, task])
    setNewTask({ title: "", assignee: "", dueDate: "" })
    showSuccessToast()
  }

  const handleUpdateTaskStatus = (taskId: string, status: Task["status"]) => {
    saveTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
    showSuccessToast()
  }

  const handleDeleteTask = (taskId: string) => {
    saveTasks(tasks.filter(t => t.id !== taskId))
    showSuccessToast()
  }

  const showSuccessToast = () => {
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)
  }

  if (isTicketLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex flex-col gap-6">
        {/* Skeleton Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-6 rounded-lg">
          <div className="flex gap-4 items-center">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-48 h-6" />
          </div>
        </div>

        <div className="flex-1 flex gap-6">
          {/* Skeleton Main Content */}
          <div className="flex-1 space-y-6">
            <Skeleton className="w-full h-12 rounded-lg" />
            <Skeleton className="w-full h-48 rounded-lg" />
            <div className="space-y-4 ml-8 border-l-2 border-gray-200 pl-4">
              <Skeleton className="w-full h-24 rounded-lg" />
              <Skeleton className="w-full h-24 rounded-lg" />
            </div>
          </div>

          {/* Skeleton Sidebar */}
          <div className="w-[320px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-6">
            <Skeleton className="w-24 h-4 mb-4" />
            <Skeleton className="w-full h-10 rounded-md" />
            <Skeleton className="w-full h-10 rounded-md" />
            <Skeleton className="w-full h-24 rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ticket not found</h3>
          <button onClick={() => router.push(backUrl)} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg">Back to List</button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(ticketStatus)

  // -- Render Helpers --
  const renderTabs = () => (
    <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pt-2 sticky top-0 z-10">
      {[
        { key: "reply", label: "Add Reply", icon: <Edit className="w-4 h-4" /> },
        { key: "note", label: "Notes", icon: <StickyNote className="w-4 h-4" />, count: notes.length },
        { key: "reminder", label: "Reminders", icon: <Bell className="w-4 h-4" />, count: reminders.length },
        { key: "others", label: "Related Tickets", icon: <Layers className="w-4 h-4" /> },
        { key: "task", label: "Tasks", icon: <ListChecks className="w-4 h-4" />, count: tasks.length },
      ].map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as DetailTab)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 rounded-t-md hover:bg-gray-50 dark:hover:bg-gray-800",
            activeTab === tab.key
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-gray-50 dark:bg-gray-800"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )

  const renderReplyTab = () => (
    <div className="space-y-6">
      {/* 1. Reply Editor (Top) */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reply to Ticket</h3>
          <div className="flex items-center gap-2">
            {/* Presets or Macros could go here */}
          </div>
        </div>
        <div className="p-0">
          {notes.length > 0 && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900">
              <p className="text-xs text-yellow-700 font-semibold mb-1">Latest Notes (Last 3):</p>
              <div className="space-y-1">
                {notes.slice(-3).map(note => (
                  <div key={note.id} className="text-xs text-yellow-800 dark:text-yellow-200 line-clamp-1 border-b border-yellow-100/50 last:border-0 pb-1 last:pb-0">
                    <span className="font-medium mr-1">{note.author}:</span>{note.content}
                  </div>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={replyContent}
            onChange={handleTextareaInput}
            placeholder="Enter your reply here..."
            className="w-full min-h-[150px] p-4 text-sm bg-white dark:bg-gray-950 border-0 focus:ring-0 placeholder-gray-400 resize-none font-sans"
            style={{ height: textareaHeight }}
          />
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <button className="text-gray-500 hover:text-emerald-600 transition-colors p-1" title="Attach Files">
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                <input
                  type="checkbox"
                  id="mark-completed-wrapper"
                  checked={ticketStatus === "Closed"}
                  onChange={(e) => {
                    if (e.target.checked) setTicketStatus("Closed")
                  }}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="mark-completed-wrapper" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Selesai
                </label>
              </div>

              <select
                value={ticketStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Answered">Answered</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed">Closed</option>
              </select>
              <button
                onClick={handleSendMessage}
                disabled={!replyContent.trim() || isSending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-1.5 rounded-md shadow-sm transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Reply
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Conversation History */}
      <div className="space-y-6 pb-10">
        {/* Original Ticket Body */}
        {ticket.body && (
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold border border-blue-200 dark:border-blue-800">
                {ticket.contact.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">{ticket.contact}</span>
                  <span className="text-xs text-gray-500">opened this ticket</span>
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(ticket.submitted_date)}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {ticket.body}
              </div>
            </div>
          </div>
        )}

        {/* History Timeline Look */}
        <div className="relative pl-5 border-l-2 border-gray-100 dark:border-gray-800 ml-5 space-y-8">
          {ticket.replies.map((reply) => {
            const isUser = isUserMessage(reply.author)
            return (
              <div key={reply.id} className="relative">
                <div className={cn(
                  "absolute -left-[29px] top-0 w-8 h-8 rounded-full border-4 border-white dark:border-gray-950 flex items-center justify-center text-xs font-bold",
                  isUser
                    ? "bg-blue-100 text-blue-600"
                    : "bg-emerald-600 text-white"
                )}>
                  {reply.author.charAt(0).toUpperCase()}
                </div>

                <div className={cn(
                  "rounded-[8px] border overflow-hidden",
                  isUser
                    ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    : "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-900 shadow-sm"
                )}>
                  <div className={cn(
                    "px-4 py-2 text-xs flex justify-between items-center border-b",
                    isUser
                      ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
                      : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"
                  )}>
                    <div className="font-semibold text-gray-700 dark:text-gray-300">
                      {reply.author} <span className="font-normal text-gray-500 ml-1">{isUser ? "(Client)" : "(Staff)"}</span>
                    </div>
                    <div className="text-gray-400">{formatDateTime(reply.date)}</div>
                  </div>
                  <div className="p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {reply.message}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div ref={messagesEndRef}></div>
    </div>
  )

  // --- Main Render ---
  return (
    <div className="flex flex-col h-screen bg-gray-100/50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">

      {showSaveSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" /> Saved Successfully
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-6 flex-shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(backUrl)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
              #{ticket.id} <span className="font-normal text-gray-400">|</span> {ticket.subject}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Info Toggle */}
          <button
            className="lg:hidden p-2 text-gray-500"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
          >
            <PanelRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* BODY (2-Columns) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT: MAIN CONTENT */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-950 relative overflow-hidden">

          {/* Horizontal Tabs */}
          {renderTabs()}

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-black/20 scroll-smooth">
            <div className="max-w-4xl mx-auto">

              {activeTab === 'reply' && renderReplyTab()}

              {activeTab === 'note' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add an internal note..."
                      className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm h-24 resize-none bg-white dark:bg-gray-900"
                    />
                    <button onClick={handleAddNote} className="h-24 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {notes.map(note => (
                      <div key={note.id} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-sm text-yellow-800 dark:text-yellow-500">{note.author}</span>
                          <span className="text-xs text-yellow-600 dark:text-yellow-600">{formatDateTime(note.date)}</span>
                        </div>
                        <p className="text-sm text-yellow-900 dark:text-yellow-100">{note.content}</p>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-center text-gray-400 py-8">No internal notes yet.</p>}
                  </div>
                </div>
              )}

              {activeTab === 'reminder' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Add Reminder</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <Input value={newReminder.title} onChange={e => setNewReminder({ ...newReminder, title: e.target.value })} placeholder="Reminder title..." />
                      <div className="flex gap-3">
                        <Input type="datetime-local" value={newReminder.date} onChange={e => setNewReminder({ ...newReminder, date: e.target.value })} className="flex-1" />
                        <Input value={newReminder.staff} onChange={e => setNewReminder({ ...newReminder, staff: e.target.value })} placeholder="Staff..." className="flex-1" />
                      </div>
                      <button onClick={handleAddReminder} className="w-full bg-emerald-600 text-white py-2 rounded-md text-sm font-medium hover:bg-emerald-700">Create Reminder</button>
                    </CardContent>
                  </Card>
                  {reminders.map(rem => (
                    <div key={rem.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{rem.title}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(rem.date)} • {rem.staff}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteReminder(rem.id)}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'task' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="New task..." className="flex-1" />
                    <button onClick={handleAddTask} className="px-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg group">
                        <input type="checkbox" checked={task.status === 'completed'} onChange={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        <span className={cn("flex-1 text-sm font-medium", task.status === 'completed' && "line-through text-gray-400")}>{task.title}</span>
                        <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'others' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isSecondaryLoading && relatedTickets.length === 0 ? (
                    [...Array(4)].map((_, i) => (
                      <div key={i} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between mb-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-16" /></div>
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    ))
                  ) : (
                    relatedTickets.map(t => (
                      <div key={t.id} onClick={() => router.push(`/support/tickets/${t.id}`)} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:ring-2 hover:ring-emerald-500/20 cursor-pointer transition-all">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-mono text-gray-500">#{t.id}</span>
                          <span className={cn("px-2 py-0.5 rounded-full", getStatusConfig(t.status).bgClass, "bg-opacity-20 text-gray-700")}>{t.status}</span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{t.subject}</h4>
                        <p className="text-xs text-gray-500">{formatDateTime(t.submitted_date)}</p>
                      </div>
                    )))}
                </div>
              )}

            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR (Ticket Info) */}
        <aside className={cn(
          "w-[320px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto transition-transform duration-300 absolute lg:static inset-y-0 right-0 z-30 shadow-2xl lg:shadow-none",
          showInfoPanel ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          <div className="p-4 space-y-6">

            {/* Mobile Close Button */}
            <div className="lg:hidden flex justify-end mb-2">
              <button onClick={() => setShowInfoPanel(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Ticket Details Card */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Ticket Info</h3>

              <div className="space-y-3">
                <div className="group">
                  <label className="text-xs text-gray-500 font-medium block mb-1">Status</label>
                  <div className="relative">
                    <div className={cn("w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm font-medium transition-colors cursor-default", statusConfig.bgClass, "bg-opacity-10 border-transparent text-gray-800 dark:text-gray-200")}>
                      <span className="flex items-center gap-2">{statusConfig.icon} {statusConfig.label}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Priority</label>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
                    {["Low", "Medium", "High"].map(p => (
                      <button key={p} onClick={() => handlePriorityChange(p)} className={cn("flex-1 text-xs py-1.5 rounded transition-all font-medium", ticketPriority === p ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700")}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Customer</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {ticket.contact.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{ticket.contact}</p>
                  <p className="text-xs text-gray-500 truncate">{ticket.project || "No Company"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Tickets</span>
                  <span className="font-semibold">{relatedTickets.length + 1}</span>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Projects</span>
                  <span className="font-semibold">{ticket.project ? 1 : 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Department</dt>
                  <dd className="font-medium">{ticket.department}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Service</dt>
                  <dd className="font-medium">{ticket.service || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Submitted</dt>
                  <dd className="font-medium text-right">{formatDateTime(ticket.submitted_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Last Reply</dt>
                  <dd className="font-medium text-right">{formatDateTime(ticket.last_reply)}</dd>
                </div>
              </dl>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <label className="text-xs text-gray-500 font-medium block mb-2">Assigned to</label>
              {isSecondaryLoading ? (
                <div className="flex items-center gap-3 p-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-gray-200 transition-all group">
                    <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
                      <AvatarImage src={selectedAssignee?.avatar_url || ""} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                        {selectedAssignee?.name.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                        {selectedAssignee?.name || "Unassigned"}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                  </div>

                  {/* Dropdown for selecting assignee */}
                  {showAssigneeDropdown && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                      <div className="p-3 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700 z-10">
                        <input
                          autoFocus
                          value={assigneeSearch}
                          onChange={e => setAssigneeSearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Search admin..."
                        />
                      </div>
                      <div className="p-1">
                        {filteredUsers.map(u => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectAssignee(u)}
                            className="flex items-center gap-3 p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg cursor-pointer transition-colors group"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={u.avatar_url || ""} />
                              <AvatarFallback className="text-[10px] bg-gray-100">{u.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden flex flex-col">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">{u.name}</span>
                              <span className="text-[10px] text-emerald-600/70 font-medium uppercase tracking-wider">Admin</span>
                            </div>
                          </div>
                        ))}
                        {filteredUsers.length === 0 && (
                          <p className="text-xs text-center text-gray-400 py-2">No admins found</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* View Profile Link */}
                  {selectedAssignee && (
                    <Link
                      href={`/admin/users/${selectedAssignee.id}`}
                      className="block mt-2 text-xs text-center text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      View Profile
                    </Link>
                  )}
                </div>
              )}
            </div>

          </div>
        </aside>
      </div>
    </div>
  )
}
