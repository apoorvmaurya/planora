"use client"

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { useGroup } from "@/hooks/useGroup"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { Users, Plus, MapPin, Map, Calendar, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function GroupDetailPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const { profile } = useUserStore()
  
  const { group, members, plans, isLoading, removeMember, isProcessing } = useGroup(groupId)
  
  if (isLoading) {
    return <div className="text-center py-20 text-slate-500">Loading group...</div>
  }

  if (!group) {
    return <div className="text-center py-20 text-red-500">Group not found or you don&apos;t have access.</div>
  }

  const currentUserMember = members.find(m => m.user.id === profile?.id)
  const isAdmin = currentUserMember?.role === 'admin'

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header Cover */}
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm relative">
        <div className="h-64 bg-slate-100 relative">
          {group.cover_image_url ? (
            <img src={group.cover_image_url} alt={group.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-teal-500 to-emerald-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-0 left-0 p-8 w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="text-white">
              <h1 className="text-4xl font-bold tracking-tight mb-2">{group.name}</h1>
              <p className="text-white/80 max-w-2xl">{group.description}</p>
            </div>
            {isAdmin && (
              <Link href={`/groups/${groupId}/settings`}>
                <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-md">
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Plans Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                <Map className="w-6 h-6 mr-2 text-[#1D9E75]" /> Group Plans
              </h2>
              <Link href={`/plans/new?groupId=${groupId}`}>
                <Button className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl h-10">
                  <Plus className="w-4 h-4 mr-1" /> New Plan
                </Button>
              </Link>
            </div>

            {plans.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center">
                <p className="text-slate-500">No plans yet. Start planning a trip!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan: any, i: number) => (
                  <Link key={plan.id} href={`/plans/${plan.id}`}>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center group cursor-pointer hover:border-[#1D9E75]/30 hover:shadow-md transition-all mb-4"
                  >
                    <div className="w-full sm:w-32 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0">
                      {plan.cover_image_url ? (
                        <img src={plan.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-teal-50 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-teal-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#1D9E75] transition-colors">{plan.title}</h3>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">{plan.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1 mb-3">{plan.description}</p>
                      <div className="flex items-center text-xs font-semibold text-slate-400 gap-4">
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(plan.start_date || plan.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Members Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-slate-400" /> Members ({members.length})
              </h3>
              {isAdmin && (
                <Button variant="ghost" className="text-[#1D9E75] hover:text-[#15805e] hover:bg-teal-50 px-3 rounded-lg h-8 text-xs font-bold">
                  + Invite
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      {member.user.avatar_url ? (
                        <img src={member.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                          {member.user.full_name?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                        {member.user.full_name} 
                        {member.role === 'admin' && <Shield className="w-3 h-3 text-[#1D9E75]" />}
                      </p>
                      <p className="text-xs text-slate-500">@{member.user.username}</p>
                    </div>
                  </div>
                  
                  {isAdmin && member.user.id !== profile?.id && (
                    <Button 
                      variant="ghost" 
                      disabled={isProcessing}
                      onClick={() => removeMember(member.user.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 hover:text-red-600 h-8 px-2 rounded-lg text-xs"
                    >
                      Kick
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
