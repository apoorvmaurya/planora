"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { UserPlus, Shield, Mail, X } from "lucide-react"

interface GroupMembersSettingsProps {
  members: any[]
  currentUserId?: string
  inviteableFriends: any[]
  pendingInvites: any[]
  isProcessing: boolean
  onInviteFriend: (friendId: string) => Promise<void>
  onToggleRole: (userId: string, currentRole: string) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  onCancelInvitation: (inviteId: string) => Promise<void>
}

export function GroupMembersSettings({
  members,
  currentUserId,
  inviteableFriends,
  pendingInvites,
  isProcessing,
  onInviteFriend,
  onToggleRole,
  onRemoveMember,
  onCancelInvitation,
}: GroupMembersSettingsProps) {
  return (
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Control administrative roles, remove members, or invite friends.
          </p>
        </div>

        {inviteableFriends.length > 0 && (
          <div className="bg-teal-50/40 dark:bg-teal-950/10 border border-teal-100/50 dark:border-teal-900/20 p-4 rounded-2xl">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#16795A]" /> Invite Friends (Pending Confirmation)
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Invited friends will see a request on their dashboard and must accept it to join.
            </p>
            <div className="flex flex-wrap gap-2">
              {inviteableFriends.map((friend) => (
                <div
                  key={friend.user.id}
                  className="bg-white/90 dark:bg-slate-950/90 border border-slate-200/50 dark:border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between gap-4 text-xs shadow-sm"
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
                    onClick={() => onInviteFriend(friend.user.id)}
                    className="bg-[#16795A]/10 text-[#16795A] hover:bg-[#16795A] hover:text-white rounded-lg h-7 px-2.5 font-bold border-0 cursor-pointer"
                  >
                    Invite
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Active Group Members
          </h4>
          {members.map((member) => {
            const isSelf = member.user?.id === currentUserId

            return (
              <div
                key={member.id}
                className="bg-white/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    {member.user?.avatar_url ? (
                      <img src={member.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                        {member.user?.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {member.user?.full_name}
                      {member.role === "admin" && <Shield className="w-3.5 h-3.5 text-[#16795A]" />}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">@{member.user?.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    disabled={isProcessing || isSelf}
                    onClick={() => onToggleRole(member.user?.id, member.role)}
                    className="text-xs rounded-xl h-9 px-3 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {member.role === "admin" ? "Make Member" : "Make Admin"}
                  </Button>

                  {!isSelf && (
                    <Button
                      variant="ghost"
                      disabled={isProcessing}
                      onClick={() => onRemoveMember(member.user?.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs rounded-xl h-9 px-3"
                    >
                      Kick
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {pendingInvites.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Sent Invites (Pending)
            </h4>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-slate-50/45 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4"
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
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        {invite.invitee?.full_name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">@{invite.invitee?.username}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => onCancelInvitation(invite.id)}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs rounded-xl h-9 px-3 flex items-center gap-1.5 cursor-pointer"
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
  )
}
