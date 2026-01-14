"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Link2,
  List,
  ListOrdered,
  Undo,
  Paperclip,
  Check,
  X,
  Loader2
} from "lucide-react"
import { FaEnvelope } from "react-icons/fa"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createTicket } from "@/utils/api/tickets/insert"
import { fetchAdmins, type AdminUser } from "@/utils/api/users/fetch-admins"
import { fetchRegularUsers, type RegularUser } from "@/utils/api/users/fetch-users"

const departments = ["Marketing", "Technical", "Product", "Engineering", "Data", "Audio", "Sales", "Support"]
const priorities = ["Low", "Medium", "High"]
const services = ["Mobile App", "Memorization Feature", "Verse Reader", "Bookmark", "Sync", "Streaming"]

const predefinedReplies = [
  "Thank you for contacting us. We will follow up on your report shortly.",
  "We apologize for any inconvenience. Our team is working on this issue.",
  "Please try the following steps to resolve your issue...",
]

const knowledgeBaseLinks = [
  { title: "How to Reset Password", url: "#" },
  { title: "Memorization Feature FAQ", url: "#" },
  { title: "Sync Guide", url: "#" },
]

interface Attachment {
  name: string
  url: string
  type: "image" | "file"
}

export default function NewTicketFormWrapper() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data dari Supabase
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [users, setUsers] = useState<RegularUser[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [subject, setSubject] = useState("")
  const [selectedContact, setSelectedContact] = useState<AdminUser | null>(null)
  const [contactSearch, setContactSearch] = useState("")
  const [showContactDropdown, setShowContactDropdown] = useState(false)

  const [assigneeSearch, setAssigneeSearch] = useState("")
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)

  const [priority, setPriority] = useState("Medium")
  const [service, setService] = useState("")
  const [department, setDepartment] = useState("")
  const [cc, setCc] = useState("")
  const [ticketBody, setTicketBody] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showPredefinedDropdown, setShowPredefinedDropdown] = useState(false)
  const [showKnowledgeDropdown, setShowKnowledgeDropdown] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [newService, setNewService] = useState("")
  const [customServices, setCustomServices] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Fetch admins dan users saat komponen mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingAdmins(true)
      const adminResult = await fetchAdmins()
      if (!adminResult.error) {
        setAdmins(adminResult.admins)
      }
      setLoadingAdmins(false)

      setLoadingUsers(true)
      const userResult = await fetchRegularUsers()
      if (!userResult.error) {
        setUsers(userResult.users)
      }
      setLoadingUsers(false)
    }

    loadData()
  }, [])

  const allServices = [...services, ...customServices]

  // Filter admins berdasarkan search
  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    admin.email.toLowerCase().includes(contactSearch.toLowerCase())
  )

  // Filter users berdasarkan search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  const handleSelectContact = (admin: AdminUser) => {
    setSelectedContact(admin)
    setContactSearch(admin.name)
    setShowContactDropdown(false)
  }

  const handleSelectAssignee = (user: RegularUser) => {
    setAssigneeSearch(user.name)
    setShowAssigneeDropdown(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    for (const file of files) {
      const isImg = file.type.startsWith("image/")
      const reader = new FileReader()
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          url: reader.result as string,
          type: isImg ? "image" : "file"
        }])
      }
      reader.readAsDataURL(file)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const insertPredefinedReply = (reply: string) => {
    setTicketBody(prev => prev + (prev ? "\n\n" : "") + reply)
    setShowPredefinedDropdown(false)
  }

  const insertKnowledgeLink = (link: { title: string; url: string }) => {
    setTicketBody(prev => prev + (prev ? "\n\n" : "") + `[${link.title}](${link.url})`)
    setShowKnowledgeDropdown(false)
  }

  const applyFormat = (format: string) => {
    const textarea = document.getElementById("ticket-body") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = ticketBody.substring(start, end)

    let formattedText = selectedText
    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`
        break
      case "italic":
        formattedText = `*${selectedText}*`
        break
      case "link":
        formattedText = `[${selectedText}](url)`
        break
    }

    setTicketBody(ticketBody.substring(0, start) + formattedText + ticketBody.substring(end))
  }

  const handleAddService = () => {
    if (newService.trim() && !allServices.includes(newService.trim())) {
      setCustomServices(prev => [...prev, newService.trim()])
      setService(newService.trim())
      setNewService("")
      setShowServiceModal(false)
    }
  }

  const handleOpenTicket = async () => {
    if (!subject.trim()) {
      setError("Subject is required!")
      return
    }

    if (!selectedContact) {
      setError("Contact is required!")
      return
    }

    if (!ticketBody.trim()) {
      setError("Ticket body is required!")
      return
    }

    setError("")
    setIsSubmitting(true)

    try {
      const result = await createTicket({
        subject: subject,
        contact: selectedContact.name,
        department: department || "Support",
        project: "My Qurani",
        service: service || undefined,
        priority: priority,
        body: ticketBody
      })

      if (result.success && result.data) {
        const ticketId = result.data.id
        setShowSuccess(true)
        setTimeout(() => {
          router.push(`/support/tickets/${ticketId}`)
        }, 1500)
      } else {
        setError(result.error || "Failed to create ticket")
      }
    } catch (err) {
      setError("An error occurred while creating the ticket")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5" />
          <span className="font-medium">Ticket created successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/support/tickets')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Ticket Information
            </h1>
            <FaEnvelope className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Ticket without contact</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Row 1: Subject & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder=""
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="text-emerald-500">●</span> Tags
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Tag</p>
              </div>
            </div>

            {/* Row 2: Contact (Admin) & Assign ticket (User) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact - Admin Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact
                </label>
                <div className="relative">
                  <div className="flex items-center">
                    <Input
                      value={contactSearch}
                      onChange={(e) => {
                        setContactSearch(e.target.value)
                        setShowContactDropdown(true)
                        if (!e.target.value) setSelectedContact(null)
                      }}
                      onFocus={() => setShowContactDropdown(true)}
                      onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                      placeholder="Nothing selected"
                      className="w-full pr-10"
                    />
                    {loadingAdmins ? (
                      <Loader2 className="absolute right-3 w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <ChevronDown className="absolute right-3 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  {showContactDropdown && !loadingAdmins && filteredAdmins.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                      {filteredAdmins.map((admin) => (
                        <button
                          key={admin.id}
                          onMouseDown={() => handleSelectContact(admin)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">{admin.name}</p>
                          <p className="text-xs text-gray-500">{admin.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assign ticket - User Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign ticket (default is current user)
                </label>
                <div className="relative">
                  <div className="flex items-center">
                    <Input
                      value={assigneeSearch}
                      onChange={(e) => {
                        setAssigneeSearch(e.target.value)
                        setShowAssigneeDropdown(true)
                      }}
                      onFocus={() => setShowAssigneeDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAssigneeDropdown(false), 200)}
                      placeholder="Nothing selected"
                      className="w-full pr-10"
                    />
                    {loadingUsers ? (
                      <Loader2 className="absolute right-3 w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <ChevronDown className="absolute right-3 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  {showAssigneeDropdown && !loadingUsers && filteredUsers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onMouseDown={() => handleSelectAssignee(user)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Name & Email (auto from Contact) & Priority & Service */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <Input
                  value={selectedContact?.name || ""}
                  readOnly
                  placeholder=""
                  className="w-full bg-gray-50 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email address
                </label>
                <Input
                  value={selectedContact?.email || ""}
                  readOnly
                  placeholder=""
                  className="w-full bg-gray-50 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none pr-10"
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none pr-10"
                    >
                      <option value="">Nothing selected</option>
                      {allServices.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => setShowServiceModal(true)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 4: Department & CC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none pr-10"
                  >
                    <option value="">Nothing selected</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CC
                </label>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder=""
                  className="w-full"
                />
              </div>
            </div>

            {/* Ticket Body Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Ticket Body <span className="text-red-500">*</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowPredefinedDropdown(!showPredefinedDropdown)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-left text-gray-600 dark:text-gray-400 flex items-center justify-between"
                  >
                    <span>Insert predefined reply</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showPredefinedDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                      {predefinedReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => insertPredefinedReply(reply)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          {reply.substring(0, 60)}...
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowKnowledgeDropdown(!showKnowledgeDropdown)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-left text-gray-600 dark:text-gray-400 flex items-center justify-between"
                  >
                    <span>Insert knowledge base link</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showKnowledgeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                      {knowledgeBaseLinks.map((link, idx) => (
                        <button
                          key={idx}
                          onClick={() => insertKnowledgeLink(link)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          {link.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                  <button onClick={() => applyFormat("bold")} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Bold">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button onClick={() => applyFormat("italic")} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Italic">
                    <Italic className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Align Left">
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Align Center">
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Align Right">
                    <AlignRight className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Justify">
                    <AlignJustify className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Insert Image">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => applyFormat("link")} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Insert Link">
                    <Link2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Bullet List">
                    <List className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Numbered List">
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Undo">
                    <Undo className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  id="ticket-body"
                  value={ticketBody}
                  onChange={(e) => setTicketBody(e.target.value)}
                  placeholder="Write ticket body here..."
                  className="w-full h-48 p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach File
                </label>
                {attachments.length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {attachments.length} file(s) attached
                  </span>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex justify-end">
              <button
                onClick={handleOpenTicket}
                disabled={isSubmitting}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? "Creating ticket..." : "Open Ticket"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add New Service
            </h3>
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Service name"
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowServiceModal(false)
                  setNewService("")
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
