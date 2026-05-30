"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Plus, Mail, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateGroupModal } from "@/components/shared/CreateGroupModal"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"
import confetti from "canvas-confetti"

export default function GroupsPage() {
  const supabase = createClient()
  const { profile } = useUserStore()

  const [groups, setGroups] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Invitations state
  const [invitations, setInvitations] = useState<any[]>([])
  const [isInvitesLoading, setIsInvitesLoading] = useState(true)

  // Fetch groups where user is a member
  async function fetchGroups() {
    try {
      const res = await fetch('/api/groups')
      if (res.ok) {
        setGroups(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch groups", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch pending invitations for the current user
  const fetchInvitations = async () => {
    if (!profile?.id) return
    setIsInvitesLoading(true)
    try {
      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          id,
          created_at,
          group:groups(id, name, description, cover_image_url),
          inviter:profiles!group_invitations_invited_by_fkey(full_name, avatar_url)
        `)
        .eq('invitee_id', profile.id)
        .eq('status', 'pending')

      if (error) throw error
      setInvitations(data || [])
    } catch (err: any) {
      console.error("Failed to fetch invitations:", err)
    } finally {
      setIsInvitesLoading(false)
    }
  }

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups()
  }, [])

  // Fetch invitations and subscribe to updates when profile is available
  useEffect(() => {
    if (profile?.id) {
      fetchInvitations()

      const channel = supabase.channel(`user_${profile.id}_invites_subscription`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_invitations', filter: `invitee_id=eq.${profile.id}` },
          () => fetchInvitations()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [profile?.id])

  // Handle accepting an invitation
  const handleAcceptInvite = async (invitation: any) => {
    try {
      // 1. Add user to group_members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: invitation.group.id,
          user_id: profile?.id,
          role: 'member'
        })
      
      if (memberError) throw memberError

      // 2. Delete invitation
      const { error: inviteError } = await supabase
        .from('group_invitations')
        .delete()
        .eq('id', invitation.id)
      
      if (inviteError) throw inviteError

      toast.success(`Joined "${invitation.group.name}"!`)
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })

      // Reload groups list and invitations
      fetchInvitations()
      fetchGroups()
    } catch (err: any) {
      toast.error(err.message || "Failed to join group")
    }
  }

  // Handle declining an invitation
  const handleDeclineInvite = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('group_invitations')
        .delete()
        .eq('id', invitationId)
      
      if (error) throw error

      toast.success("Invitation declined")
      fetchInvitations()
    } catch (err: any) {
      toast.error("Failed to decline invitation")
    }
  }

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto relative">
      {/* Background Fluid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-30 -z-10">
        <div className="glass-bubble bubble-anim-1 w-24 h-24 top-20 right-10" />
        <div className="glass-bubble bubble-anim-2 w-20 h-20 bottom-10 left-10" style={{ animationDelay: "-3s" }} />
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-500">Groups</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg transition-colors duration-500">Plan trips together with your favorite people.</p>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl h-11 px-6 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create group
        </Button>
      </header>

      {/* Group Invitations list */}
      <AnimatePresence>
        {invitations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-teal-100 dark:border-teal-900/30 rounded-3xl p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <Mail className="w-5 h-5 text-[#1D9E75]" />
              <h2>Group Invitations ({invitations.length})</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map((invite) => (
                <motion.div
                  layout
                  key={invite.id}
                  className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                      {invite.group?.cover_image_url ? (
                        <img src={invite.group.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-teal-400 to-emerald-600 flex items-center justify-center font-bold text-white uppercase">
                          {invite.group?.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{invite.group?.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Invited by {invite.inviter?.full_name || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeclineInvite(invite.id)}
                      className="text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl h-9 px-3 border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvite(invite)}
                      className="bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl h-9 px-3 font-bold shadow-sm cursor-pointer"
                    >
                      <Check className="w-4 h-4 mr-1" /> Join
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Groups grid */}
      {isLoading ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-20 transition-colors duration-500">Loading groups...</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 border-dashed transition-all duration-500">
          <div className="w-20 h-20 bg-teal-50 dark:bg-teal-950/20 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-500">
            <Users className="w-10 h-10 text-[#1D9E75] dark:text-teal-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-500">No groups yet</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 transition-colors duration-500">
            Start a group to begin collaborating on itineraries, voting on dates, and tracking expenses together.
          </p>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl cursor-pointer"
          >
            Create your first group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group, i) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                whileHover={{ scale: 1.025, y: -2 }}
                whileTap={{ scale: 0.975 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  delay: i * 0.05
                }}
                className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-lg dark:shadow-none hover:border-[#1D9E75]/40 dark:hover:border-teal-500/40 transition-all duration-300 overflow-hidden group cursor-pointer h-full flex flex-col"
              >
                <div className="h-32 bg-slate-100 dark:bg-slate-800 relative overflow-hidden transition-colors duration-500">
                  {group.cover_image_url ? (
                    <img src={group.cover_image_url} alt={group.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-teal-400 to-emerald-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#1D9E75] dark:group-hover:text-teal-400 transition-colors duration-300">{group.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 flex-1 transition-colors duration-500">
                    {group.description || "No description provided."}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between transition-colors duration-500">
                    <div className="flex -space-x-2">
                      {group.group_members?.slice(0, 3).map((member: any) => (
                        <div key={member.user_id} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 overflow-hidden transition-colors duration-500">
                          {member.user?.avatar_url ? (
                            <img src={member.user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            member.user?.full_name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                      ))}
                      {(group.group_members?.length || 0) > 3 && (
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors duration-500">
                          +{(group.group_members?.length || 0) - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#1D9E75] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2 py-1 rounded-full transition-colors duration-500">
                      Active
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      <CreateGroupModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  )
}
