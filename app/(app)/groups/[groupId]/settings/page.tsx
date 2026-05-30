"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useGroup } from "@/hooks/useGroup"
import { useFriends } from "@/hooks/useFriends"
import { useUserStore } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Users,
  Image as ImageIcon,
  ArrowLeft,
  Shield,
  Copy,
  CheckCircle2,
  Trash2,
  Save,
  Loader2,
  UserPlus,
  RefreshCw,
  LogOut,
  Mail,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

export default function GroupSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const supabase = createClient()

  const { profile } = useUserStore()
  const { group, members, isLoading, isProcessing, removeMember, updateGroup, deleteGroup } = useGroup(groupId)
  const { friends } = useFriends()

  // State management
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

  // Invitations state
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = useState(true)

  // Fetch pending invitations for this group
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

  // Set origin URL on client mount to avoid hydration mismatch
  useEffect(() => {
    setOriginUrl(window.location.origin)
  }, [])

  // Load group details once they are available
  useEffect(() => {
    if (group) {
      setName(group.name || "")
      setDescription(group.description || "")
      setCoverPreview(group.cover_image_url || null)
    }
  }, [group])

  // Setup pending invites and subscription on mount/groupId change
  useEffect(() => {
    fetchPendingInvites()

    if (groupId) {
      const channel = supabase.channel(`group_${groupId}_settings_invites`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "group_invitations", filter: `group_id=eq.${groupId}` },
          () => fetchPendingInvites()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [groupId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading settings...</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="text-center py-20 text-red-500">
        Group not found or you don&apos;t have permission.
      </div>
    )
  }

  // Determine current user status
  const currentUserMember = members.find(m => m.user.id === profile?.id)
  const isAdmin = currentUserMember?.role === "admin"

  // Only admins can access this page
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto text-red-555">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-550 dark:text-slate-400">
          Only group administrators can access the group settings.
        </p>
        <Link href={`/groups/${groupId}`}>
          <Button className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Group
          </Button>
        </Link>
      </div>
    )
  }

  // Handle cover image selection
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverFile(file)
      // Revoke previous ObjectURL to prevent memory leak
      if (coverPreview && coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview)
      }
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  // Handle updating group general settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Group name is required")
      return
    }

    setIsUpdating(true)
    try {
      let finalCoverUrl = group.cover_image_url || ""

      if (coverFile) {
        const fileExt = coverFile.name.split(".").pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("group-covers")
          .upload(fileName, coverFile)

        if (uploadError) throw new Error("Failed to upload cover: " + uploadError.message)

        const { data: publicUrlData } = supabase.storage.from("group-covers").getPublicUrl(fileName)
        finalCoverUrl = publicUrlData.publicUrl
      }

      await updateGroup({
        name: name.trim(),
        description: description.trim(),
        cover_image_url: finalCoverUrl
      })
      toast.success("Settings saved successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setIsUpdating(false)
    }
  }

  // Copy Group invite link
  const handleCopyInvite = () => {
    if (!group.invite_code) return
    const url = `${originUrl}/invite/${group.invite_code}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Regenerate Group invite code
  const handleRegenerateInviteCode = async () => {
    setIsRegeneratingCode(true)
    try {
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      await updateGroup({ invite_code: newCode })
      toast.success("Invite link regenerated!")
    } catch (err: any) {
      toast.error("Failed to regenerate code")
    } finally {
      setIsRegeneratingCode(false)
    }
  }

  // Toggle member role between admin and member
  const handleToggleMemberRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin"
    
    // Check if user is trying to demote themselves when they are the only admin
    const adminCount = members.filter(m => m.role === "admin").length
    if (userId === profile?.id && currentRole === "admin" && adminCount <= 1) {
      toast.error("You cannot demote yourself. The group must have at least one administrator.")
      return
    }

    try {
      const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", groupId)
        .eq("user_id", userId)

      if (error) throw error
      toast.success("Member role updated!")
    } catch (err: any) {
      toast.error(err.message || "Failed to update role")
    }
  }

  // Send group invitation to friend
  const handleInviteFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from("group_invitations")
        .insert({
          group_id: groupId,
          invitee_id: friendId,
          invited_by: profile?.id
        })

      if (error) throw error
      toast.success("Invitation sent to friend!")
      fetchPendingInvites()
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation")
    }
  }

  // Cancel pending invitation
  const handleCancelInvitation = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("group_invitations")
        .delete()
        .eq("id", inviteId)

      if (error) throw error
      toast.success("Invitation cancelled")
      fetchPendingInvites()
    } catch (err: any) {
      toast.error("Failed to cancel invitation")
    }
  }

  // Filter inviteable friends: not currently members, and no pending invitation sent
  const activeMemberIds = members.map(m => m.user.id)
  const pendingInviteeIds = pendingInvites.map(i => i.invitee_id)
  const inviteableFriends = friends.filter(
    f => !activeMemberIds.includes(f.user.id) && !pendingInviteeIds.includes(f.user.id)
  )

  return (
    <div className="relative min-h-[85vh] pb-12 max-w-5xl mx-auto space-y-8">
      {/* Background Fluid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-40 -z-10">
        <div className="glass-bubble bubble-anim-1 w-32 h-32 top-10 right-10" style={{ animationDelay: "0s" }} />
        <div className="glass-bubble bubble-anim-2 w-24 h-24 bottom-20 left-10" style={{ animationDelay: "-5s" }} />
        <div className="glass-bubble bubble-anim-3 w-40 h-40 top-1/2 left-1/3" style={{ animationDelay: "-10s" }} />
      </div>

      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <Link href={`/groups/${groupId}`} className="flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-[#1D9E75] dark:hover:text-teal-400 transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to {group.name}
        </Link>
        <span className="text-xs bg-teal-50 dark:bg-teal-950/30 text-[#1D9E75] dark:text-teal-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          Admin Settings
        </span>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar Card */}
        <div className="md:col-span-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-none h-fit space-y-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "general"
                ? "bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/30"
                : "text-slate-650 dark:text-slate-450 hover:bg-slate-105 dark:hover:bg-slate-800/50"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> General Info
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "members"
                ? "bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/30"
                : "text-slate-650 dark:text-slate-455 hover:bg-slate-105 dark:hover:bg-slate-800/50"
            }`}
          >
            <Users className="w-4 h-4" /> Manage Members
          </button>
          <button
            onClick={() => setActiveTab("invite")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "invite"
                ? "bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/30"
                : "text-slate-650 dark:text-slate-450 hover:bg-slate-105 dark:hover:bg-slate-800/50"
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
                : "text-red-500 hover:bg-red-55 dark:hover:bg-red-950/20"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Danger Zone
          </button>
        </div>

        {/* Content Area Card */}
        <div className="md:col-span-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[50vh] flex flex-col">
          
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.form
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSaveGeneral}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">General Information</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your group cover photo, name, and bio.</p>
                  </div>

                  {/* Cover Image Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Group Cover Photo</label>
                    <div className="relative group w-full h-48 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-850 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#1D9E75] dark:hover:border-teal-400 transition-colors">
                      {coverPreview ? (
                        <>
                          <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold bg-[#1D9E75] px-3 py-1.5 rounded-full shadow">Change Image</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 group-hover:text-[#1D9E75] transition-colors">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-sm font-medium">Upload new cover image</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Name field */}
                  <div className="space-y-2">
                    <label htmlFor="group-name" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Group Name</label>
                    <Input
                      id="group-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter group name"
                      className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white focus-visible:ring-[#1D9E75] transition-colors"
                      required
                    />
                  </div>

                  {/* Description field */}
                  <div className="space-y-2">
                    <label htmlFor="group-description" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                    <Textarea
                      id="group-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this group planning?"
                      rows={4}
                      className="resize-none rounded-xl bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white focus-visible:ring-[#1D9E75] transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl px-6 h-12 shadow shadow-[#1D9E75]/25 flex items-center gap-2 cursor-pointer"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </Button>
                </div>
              </motion.form>
            )}

            {activeTab === "members" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Members ({members.length})</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Control administrative roles, remove members, or invite friends.</p>
                  </div>

                  {/* Direct Invite Friends Form */}
                  {inviteableFriends.length > 0 && (
                    <div className="bg-teal-50/40 dark:bg-teal-950/10 border border-teal-100/50 dark:border-teal-900/20 p-4 rounded-2xl">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[#1D9E75]" /> Invite Friends (Pending Confirmation)
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-550 mb-3">Invited friends will see a request on their dashboard and must accept it to join.</p>
                      <div className="flex flex-wrap gap-2">
                        {inviteableFriends.map((friend) => (
                          <div
                            key={friend.user.id}
                            className="bg-white/90 dark:bg-slate-950/90 border border-slate-200/50 dark:border-slate-850 px-3 py-2 rounded-xl flex items-center justify-between gap-4 text-xs shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                                {friend.user.avatar_url ? (
                                  <img src={friend.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  friend.user.full_name?.charAt(0) || "U"
                                )}
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{friend.user.full_name}</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleInviteFriend(friend.user.id)}
                              className="bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75] hover:text-white rounded-lg h-7 px-2.5 font-bold border-0 cursor-pointer"
                            >
                              Invite
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Members section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Active Group Members</h4>
                    {members.map((member) => {
                      const isSelf = member.user.id === profile?.id
                      
                      return (
                        <div
                          key={member.id}
                          className="bg-white/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                              {member.user.avatar_url ? (
                                <img src={member.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                                  {member.user.full_name?.charAt(0) || "U"}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {member.user.full_name}
                                {member.role === "admin" && <Shield className="w-3.5 h-3.5 text-[#1D9E75]" />}
                              </p>
                              <p className="text-xs text-slate-505 dark:text-slate-400">@{member.user.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Role Toggle Button */}
                            <Button
                              variant="ghost"
                              disabled={isProcessing || isSelf}
                              onClick={() => handleToggleMemberRole(member.user.id, member.role)}
                              className="text-xs rounded-xl h-9 px-3 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {member.role === "admin" ? "Make Member" : "Make Admin"}
                            </Button>

                            {/* Kick member */}
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                disabled={isProcessing}
                                onClick={() => removeMember(member.user.id)}
                                className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs rounded-xl h-9 px-3"
                              >
                                Kick
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pending Invitations list */}
                  {pendingInvites.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                      <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Sent Invites (Pending)
                      </h4>
                      <div className="space-y-3">
                        {pendingInvites.map((invite) => (
                          <div
                            key={invite.id}
                            className="bg-slate-50/45 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                {invite.invitee?.avatar_url ? (
                                  <img src={invite.invitee.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-bold text-slate-400">{invite.invitee?.full_name?.charAt(0) || "U"}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{invite.invitee?.full_name}</p>
                                <p className="text-xs text-slate-450 dark:text-slate-500">@{invite.invitee?.username}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              onClick={() => handleCancelInvitation(invite.id)}
                              className="text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs rounded-xl h-9 px-3 flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel Invite
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {activeTab === "invite" && (
              <motion.div
                key="invite"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex-1"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Invite Link Settings</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage the join link that people use to enter your group.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/50 dark:border-slate-850 p-6 rounded-3xl space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Group Link</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-slate-200 select-all font-mono truncate">
                      {originUrl ? `${originUrl}/invite/${group.invite_code}` : "Loading..."}
                    </div>

                    <Button
                      onClick={handleCopyInvite}
                      className={`rounded-xl px-5 h-12 font-bold cursor-pointer transition-colors ${
                        copiedLink
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-[#1D9E75] hover:bg-[#15805e] text-white"
                      }`}
                    >
                      {copiedLink ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-slate-450 dark:text-slate-500 leading-relaxed pt-2">
                    Share this link with anyone you want to invite to the group. They will be added as a member automatically when they visit.
                  </p>
                </div>

                <div className="border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-950 dark:text-white">Need to invalidate old links?</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400">Regenerating the link will break any invite links you have previously shared.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateInviteCode}
                    disabled={isRegeneratingCode}
                    className="border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350 rounded-xl h-11 px-5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer flex items-center gap-2"
                  >
                    {isRegeneratingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate Link
                  </Button>
                </div>
              </motion.div>
            )}

            {activeTab === "danger" && (
              <motion.div
                key="danger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-red-650 dark:text-red-500">Danger Zone</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Irreversible administrative actions for this group.</p>
                  </div>

                  {/* Settings danger items */}
                  <div className="border border-red-200 dark:border-red-950/30 rounded-3xl overflow-hidden divide-y divide-red-100 dark:divide-red-950/20 bg-red-50/10 dark:bg-red-950/5">
                    
                    {/* Delete group option */}
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="space-y-1 max-w-lg">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Group</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Permanently delete this group and all its plans, expense records, memories, and dashboard charts. This action cannot be undone.
                        </p>
                      </div>
                      <Button
                        onClick={() => setIsDeleteOpen(true)}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-11 px-5 shadow-lg shadow-red-500/10 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                      </Button>
                    </div>

                    {/* Leave group option */}
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="space-y-1 max-w-lg">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Leave Group</h4>
                        <p className="text-xs text-slate-505 dark:text-slate-400">
                          Exit the group. You will lose access to all collaborative itineraries and charts. You can rejoin if another member invites you.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsLeaveOpen(true)}
                        className="border-red-200 dark:border-red-950/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl h-11 px-5 shrink-0 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2" /> Leave Group
                      </Button>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Delete Group Confirmation Alert */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Permanently delete this group?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              This action is final. All trip plans, shared lists, itineraries, and chat boards linked to this group will be deleted forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 cursor-pointer" />}>
              Cancel
            </AlertDialogClose>
            <Button
              onClick={deleteGroup}
              className="bg-red-500 hover:bg-red-655 text-white rounded-xl px-5 h-11 cursor-pointer font-bold border-0"
            >
              Delete Permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation Alert */}
      <AlertDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Leave this group?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              You will no longer be able to view or edit itineraries, participate in expense settlements, or see group details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 cursor-pointer" />}>
              Cancel
            </AlertDialogClose>
            <Button
              onClick={() => removeMember(profile?.id || "")}
              className="bg-red-500 hover:bg-red-655 text-white rounded-xl px-5 h-11 cursor-pointer font-bold border-0"
            >
              Leave Group
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
