"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Map, MessageSquare, History, Shield } from "lucide-react"
import { ScenicImage } from "@/components/shared/ScenicImage"
import { UserAvatar } from "@/components/shared/UserAvatar"

interface PlanHeaderBannerProps {
  plan: any
  members: any[]
  profile: any
  isAdmin: boolean
  onOpenHistory: () => void
  onOpenChat: () => void
  onOpenAdmin: () => void
}

export function PlanHeaderBanner({
  plan,
  members,
  profile,
  isAdmin,
  onOpenHistory,
  onOpenChat,
  onOpenAdmin,
}: PlanHeaderBannerProps) {
  return (
    <div className="bg-slate-900 text-white rounded-3xl relative overflow-hidden shadow-lg h-56 sm:h-64 md:h-80 flex flex-col justify-end p-6 sm:p-8">
      <ScenicImage
        destination={plan.destination_name}
        alt={plan.destination_name}
        width={1600}
        height={800}
        fill
        priority
        className="object-cover object-center opacity-60 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {plan.status}
            </span>
            <div className="flex -space-x-2">
              {plan.group_id
                ? members.slice(0, 5).map((m) => (
                    <UserAvatar
                      key={m.user?.id}
                      avatarUrl={m.user?.avatar_url}
                      name={m.user?.full_name}
                      userId={m.user?.id}
                      size="w-8 h-8"
                      textSize="text-[10px]"
                      className="border-2 border-slate-900"
                    />
                  ))
                : profile && (
                    <UserAvatar
                      avatarUrl={profile.avatar_url}
                      name={profile.full_name ?? undefined}
                      userId={profile.id}
                      size="w-8 h-8"
                      textSize="text-[10px]"
                      className="border-2 border-slate-900"
                    />
                  )}
            </div>
          </div>
          <h1 className="text-5xl font-extrabold mb-2">{plan.title}</h1>
          <p className="text-white/80 max-w-xl text-lg flex items-center gap-2">
            <Map className="w-5 h-5" /> {plan.destination_name}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={onOpenHistory}
            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6 cursor-pointer"
          >
            <History className="w-5 h-5 mr-2" /> Activity Log
          </Button>
          <Button
            onClick={onOpenChat}
            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5 mr-2" /> Ask Planora AI
          </Button>
          {isAdmin && (
            <Button
              onClick={onOpenAdmin}
              className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6 lg:hidden"
            >
              <Shield className="w-5 h-5 mr-2" /> Admin Panel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
