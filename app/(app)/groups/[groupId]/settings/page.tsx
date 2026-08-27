"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useGroup } from "@/hooks/useGroup"
import { useFriends } from "@/hooks/useFriends"
import { useUserStore } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"
import { AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Users,
  Image as ImageIcon,
  ArrowLeft,
  Copy,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { GroupGeneralSettings } from "@/components/shared/GroupGeneralSettings"
import { GroupMembersSettings } from "@/components/shared/GroupMembersSettings"
import { GroupInviteSettings } from "@/components/shared/GroupInviteSettings"
import { GroupDangerSettings } from "@/components/shared/GroupDangerSettings"

export default function GroupSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const supabase = createClient()

  const { profile } = useUserStore()
  const { group, members, isLoading, isProcessing, removeMember, updateGroup, deleteGroup } = useGroup(groupId)
  const { friends } = useFriends()

  const [activeTab, setActiveTab] = useState<"general" | "members" | "invite" | "danger">("general")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isLeaveOpen, setIsLeaveOpen] = useState(false)
  const [originUrl, setOriginUrl] = useState("")

  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = useState(true)

  const fetchPendingInvites = async () => {
    if (!groupId) return
    setIsLoadingInvites(true)
    try {
      const { data, error } = await supabase
        .from("group_invitations")
        .select("*, invitee:profiles!group_invitations_invitee_id_fkey(*)")
        .eq("group_id", groupId)
        .eq("status", "pending")

      if (error) throw error
      setPendingInvites(data || [])
    } catch (err: any) {
      console.error("Failed to fetch invites:", err)
    } finally {
      setIsLoadingInvites(false)
    }
  }

  useEffect(() => {
    setOriginUrl(window.location.origin)
  }, [])

  useEffect(() => {
    if (group) {
      setName(group.name || "")
      setDescription(group.description || "")
      setCoverPreview(group.cover_image_url || null)
    }
  }, [group])

  useEffect(() => {
    if (groupId) {
      fetchPendingInvites()
    }
  }, [groupId])

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsUpdating(true)
    try {
      let cover_image_url = group?.cover_image_url

      if (coverFile) {
        const fileExt = coverFile.name.split(".").pop()
        const fileName = `${groupId}-${Date.now()}.${fileExt}`
        const filePath = `group-covers/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("group-assets")
          .upload(filePath, coverFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from("group-assets").getPublicUrl(filePath)
        cover_image_url = data.publicUrl
      }

      await updateGroup({
        name,
        description,
        cover_image_url,
      })

      toast.success("Group details updated successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to update group")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCopyInvite = () => {
    if (!group?.invite_code) return
    const link = `${originUrl}/invite/${group.invite_code}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    toast.success("Invite link copied to clipboard!")
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleRegenerateInviteCode = async () => {
    setIsRegeneratingCode(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/regenerate-invite`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to regenerate invite link")

      toast.success("New invite link generated!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate invite link")
    } finally {
      setIsRegeneratingCode(false)
    }
  }

  const handleToggleMemberRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin"
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) throw new Error("Failed to update role")
      toast.success(`Role updated to ${newRole}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to update role")
    }
  }

  const handleInviteFriend = async (friendId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeId: friendId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send invitation")

      toast.success("Group invitation sent!")
      fetchPendingInvites()
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation")
    }
  }

  const handleCancelInvitation = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/invitations?inviteId=${inviteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to cancel invitation")

      toast.success("Invitation cancelled")
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId))
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel invitation")
    }
  }

  const inviteableFriends = friends.filter(
    (friend) =>
      !members.some((m) => m.user?.id === friend.user?.id) &&
      !pendingInvites.some((i) => i.invitee_id === friend.user?.id)
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#16795A] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 sm:px-0">
      <div className="flex items-center gap-3">
        <Link
          href={`/groups/${groupId}`}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Group Settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage {group?.name} members, profile, and invites</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1.5">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "general"
                ? "bg-[#16795A] text-white shadow-lg shadow-[#16795A]/30"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> General Info
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "members"
                ? "bg-[#16795A] text-white shadow-lg shadow-[#16795A]/30"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            <Users className="w-4 h-4" /> Manage Members
          </button>
          <button
            onClick={() => setActiveTab("invite")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "invite"
                ? "bg-[#16795A] text-white shadow-lg shadow-[#16795A]/30"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            <Copy className="w-4 h-4" /> Invite Link
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800/60 my-2" />
          <button
            onClick={() => setActiveTab("danger")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "danger"
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Danger Zone
          </button>
        </div>

        <div className="md:col-span-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[50vh] flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <GroupGeneralSettings
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                coverPreview={coverPreview}
                onCoverChange={handleCoverChange}
                isUpdating={isUpdating}
                onSubmit={handleSaveGeneral}
              />
            )}

            {activeTab === "members" && (
              <GroupMembersSettings
                members={members}
                currentUserId={profile?.id}
                inviteableFriends={inviteableFriends}
                pendingInvites={pendingInvites}
                isProcessing={isProcessing}
                onInviteFriend={handleInviteFriend}
                onToggleRole={handleToggleMemberRole}
                onRemoveMember={removeMember}
                onCancelInvitation={handleCancelInvitation}
              />
            )}

            {activeTab === "invite" && (
              <GroupInviteSettings
                inviteCode={group?.invite_code}
                originUrl={originUrl}
                copiedLink={copiedLink}
                isRegeneratingCode={isRegeneratingCode}
                onCopyInvite={handleCopyInvite}
                onRegenerateCode={handleRegenerateInviteCode}
              />
            )}

            {activeTab === "danger" && (
              <GroupDangerSettings
                onOpenDelete={() => setIsDeleteOpen(true)}
                onOpenLeave={() => setIsLeaveOpen(true)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Permanently delete this group?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              This action is final. All trip plans, shared lists, itineraries, and chat boards linked to this group will be deleted forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>
              Cancel
            </AlertDialogClose>
            <Button
              onClick={deleteGroup}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-5 h-11 cursor-pointer font-bold border-0"
            >
              Delete Permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Leave this group?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              You will no longer be able to view or edit itineraries, participate in expense settlements, or see group details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>
              Cancel
            </AlertDialogClose>
            <Button
              onClick={() => removeMember(profile?.id || "")}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-5 h-11 cursor-pointer font-bold border-0"
            >
              Leave Group
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
