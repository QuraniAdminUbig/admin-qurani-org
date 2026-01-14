"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Crown, Edit, Shield, MoreVertical, Settings2, Trash2, LogOut } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { GroupDetail } from "@/types/grup"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/providers/i18n-provider"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { leaveGrup } from "@/utils/api/grup/delete"
import { CATEGORY_LIST } from "@/data/categories-data"

interface GroupInfoHeaderProps {
  group: GroupDetail
  userRole?: "owner" | "admin" | "member"
  isOwner: boolean                         // konsisten dengan KelolaGrup
  onEditGroup?: () => void
  onDeleteGroup?: () => void
  isDeletingGroup?: boolean
  avatarPreview?: string | null
}

export function GroupInfoHeader({ group, userRole, isOwner, onEditGroup, onDeleteGroup, isDeletingGroup, avatarPreview }: GroupInfoHeaderProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const categoryList = CATEGORY_LIST

  const divRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [shouldMargin, setShouldMargin] = useState<boolean>()
  const [isLeavingGroup, setIsLeavingGroup] = useState(false)

  useEffect(() => {
    if (divRef.current) {
      setHeight(divRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    if (height < 170) {
      setShouldMargin(true)
    } else {
      setShouldMargin(false)
    }
  }, [height])
  // Generate avatar fallback
  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .filter(n => n.length > 0)
      .slice(0, 3)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "G"
  }

  // Sort members by role priority: owner -> admin -> member
  const getSortedMembers = () => {
    const roleOrder = { 'owner': 1, 'admin': 2, 'member': 3 }
    return [...group.grup_members].sort((a, b) => {
      return roleOrder[a.role] - roleOrder[b.role]
    })
  }

  // Generate CSS gradient colors for background when no profile image
  const generateLinearGradient = (name: string) => {
    const gradients = [
      '#667eea, #764ba2',
      '#f093fb, #f5576c',
      '#4facfe, #00f2fe',
      '#43e97b, #38f9d7',
      '#ffecd2, #fcb69f',
      '#a8edea, #fed6e3',
      '#ff9a9e, #fecfef',
      '#fdcbf1, #e6dee9'
    ]
    const index = name.length % gradients.length
    return gradients[index]
  }

  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const el = textRef.current;
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, []);

  const handleLeaveGroup = useCallback(async () => {
    setIsLeavingGroup(true)
    try {
      const result = await leaveGrup(group.id)
      if (result.status === 'success') {
        toast.success(t('kelola grup.leave_group.success', 'Successfully left the group'))
        router.push('/grup')
      } else {
        toast.error(t('kelola grup.leave_group.failed', 'Failed to leave the group'))
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      toast.error(t('kelola grup.leave_group.error', 'An error occurred while leaving the group'))
    } finally {
      setIsLeavingGroup(false)
    }
  }, [group.id, t, router])

  return (
    <div className="relative overflow-hidden rounded-xl text-white"
      style={{
        backgroundImage: avatarPreview ? `url(${avatarPreview})` : group.photo_path
          ? `url(${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${group.photo_path})`
          : `linear-gradient(135deg, ${generateLinearGradient(group.name)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
      {/* Enhanced shadow overlay for text readability over images */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-black/30" />

      {/* Three Dots Menu - Positioned at top right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex gap-1 items-center">
          {group.category?.id && (
            <Badge className="px-3 py-1 rounded-full text-xs sm:text-sm font-semibold tracking-wide uppercase border border-emerald-400/40 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30 ring-1 ring-emerald-400/20 shadow-sm hover:ring-emerald-300/30 transition text-emerald-400 gap-0">
              {categoryList.find((cat) => cat.id === Number(group.category?.id))?.name}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="bg-transparent hover:bg-white/30 text-white border-white/40 border backdrop-blur-md shadow-xl p-2 rounded-lg transition-all duration-200"
                size="sm"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-40 backdrop-blur-md shadow-xl border border-gray-200/50">
              {(isOwner || userRole === "admin") && (
                <>
                  <DropdownMenuItem onClick={onEditGroup} className="cursor-pointer hover:bg-gray-100/50">
                    <Edit className="h-4 w-4 mr-2" />
                    {t('grup detail.manage.edit_group')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/grup/${group.id}/pengaturan-qurani`)} className="cursor-pointer hover:bg-gray-100/50">
                    <Settings2 className="h-4 w-4 mr-2" />
                    {t('grup detail.manage.qurani_settings')}
                  </DropdownMenuItem>
                </>
              )}

              {/* AlertDialog untuk Delete Group */}
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('kelola grup.delete_group.delete', 'Delete Group')}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-sm mx-auto sm:max-w-md lg:max-w-lg dark:bg-gray-800">
                    <AlertDialogHeader className="space-y-3">
                      <AlertDialogTitle className="text-base sm:text-lg leading-tight">
                        {t('kelola grup.mistake_labels.confirm_delete', 'Confirm Group Deletion')}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-sm leading-relaxed">
                        {t('kelola grup.mistake_labels.confirm_delete_description', 'Are you sure you want to delete the group "{groupName}"? This action cannot be undone and will permanently remove all group data including members and history.').replace('{groupName}', group.name)}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-row gap-1 sm:gap-2">
                      <AlertDialogCancel className="flex-1 text-sm">
                        {t('kelola grup.delete_group.cancel', 'Cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteGroup?.()}
                        disabled={isDeletingGroup || !onDeleteGroup}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-sm text-gray-100"
                      >
                        {isDeletingGroup ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2 flex-shrink-0" />
                            <span className="truncate">{t('kelola grup.mistake_labels.deleting', 'Deleting...')}</span>
                          </>
                        ) : (
                          <span className="truncate">{t('kelola grup.mistake_labels.yes_delete', 'Yes')}</span>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* AlertDialog untuk Keluar Group */}
              {!isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('kelola grup.leave_group.leave_button', 'Keluar Grup')}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-[425px] dark:bg-gray-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('grup detail.leave_group.dialog_title', 'Leave Group')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('grup detail.leave_group.dialog_description_before', 'Are you sure you want to leave')} <strong>{group.name}</strong>? {t('grup detail.leave_group.dialog_description_after', 'This action cannot be undone and you\'ll need to be re-invited to join again.')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-row">
                      <AlertDialogCancel
                        className="cursor-pointer flex-1"
                      >
                        {t('grup detail.leave_group.no')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleLeaveGroup}
                        disabled={isLeavingGroup}
                      >
                        {t('grup detail.leave_group.yes')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div ref={divRef} className="relative px-6 py-8">
        <div className="flex items-center justify-between sm:gap-10">
          <div className="flex flex-col md:flex-row items-start gap-6 flex-1">
            {/* Group Avatar with role badge */}
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-white/40 shadow-2xl">
                <AvatarImage className="object-cover"
                  src={avatarPreview ? avatarPreview : group.photo_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${group.photo_path}` : ""}
                  alt={group.name}
                />
                <AvatarFallback className="bg-white/20 text-white font-semibold text-2xl backdrop-blur-sm">
                  {getAvatarFallback(group.name)}
                </AvatarFallback>
              </Avatar>
              {/* Role Badge */}
              {userRole && (userRole === "owner" || userRole === "admin") && (
                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${userRole === "owner"
                  ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                  : "bg-gradient-to-br from-blue-500 to-blue-700"
                  }`}>
                  {userRole === "owner" ? (
                    <Crown className="w-3 h-3 text-white" />
                  ) : (
                    <Shield className="w-3 h-3 text-white" />
                  )}
                </div>
              )}
            </div>

            {/* Group Info */}
            <div className="flex-1">
              <div className="flex flex-col justify-end gap-1 mb-2">
                <h1 className="text-xl font-bold drop-shadow-lg md:text-3xl">{group.name}</h1>
                {(group.city_name && group.province_name) && (
                  <span className="text-gray-300">
                    {`${group.city_name} - ${group.province_name}`}
                  </span>
                )}
              </div>

              {/* Description */}
              {group.description && (
                <div>
                  <p
                    ref={textRef}
                    title={group.description}
                    className={`text-white/90 mb-3 drop-shadow-md text-xs md:text-base transition-all duration-300 ${expanded ? "" : "line-clamp-3"}`}
                  >
                    {group.description}
                  </p>
                  {isClamped && ( // tampilkan tombol hanya kalau teks panjang
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-xs md:text-sm hover:underline font-semibold"
                    >
                      {expanded ? "Sembunyikan" : "Baca Selengkapnya"}
                    </button>
                  )}
                </div>
              )}

              {/* Members count and online status */}
              <div className="flex items-center gap-4 text-sm text-white/90 drop-shadow-sm">
                {/* <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {group.grup_members.length.toLocaleString()} members
                </span> */}
              </div>
            </div>
          </div>

          {/* Member Avatars Preview */}
          <div className={`flex items-center gap-4 ${shouldMargin ? "mt-5" : ""}`}>
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex -space-x-2">
                {getSortedMembers().slice(0, 3).map((member) => (
                  <div key={member.id} className="relative">
                    <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg">
                      <AvatarImage className="object-cover"
                        src={member.user.avatar || ""}
                        alt={member.user.name || ""}
                      />
                      <AvatarFallback className="bg-white/20 text-white text-sm font-medium backdrop-blur-sm">
                        {getAvatarFallback(member.user.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    {/* Role indicator */}
                    {member.role === 'owner' && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                        <Crown className="h-2.5 w-2.5 text-gray-900" />
                      </div>
                    )}
                    {member.role === 'admin' && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <Shield className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {group.grup_members.length > 3 && (
                  <div className="h-10 w-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs font-medium text-white backdrop-blur-sm shadow-lg">
                    +{group.grup_members.length - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
