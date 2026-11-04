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
    <div className="bg-slate-900 text-white rounded-3xl relative overflow-hidden shadow-lg min-h-64 sm:min-h-72 md:h-80 h-auto flex flex-col justify-end p-5 sm:p-8">
      <ScenicImage
        destination={plan.destination_name}
        alt={plan.destination_name}
        width={1600}
        height={800}
        fill
        priority
        className="object-cover object-center opacity-60 pointer-events-none"
      />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/40 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <span className="bg-white/20 backdrop-blur text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider">
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
                      size="w-7 h-7 sm:w-8 sm:h-8"
                      textSize="text-[9px] sm:text-[10px]"
                      className="border-2 border-slate-900"
                    />
                  ))
                : profile && (
                    <UserAvatar
                      avatarUrl={profile.avatar_url}
                      name={profile.full_name ?? undefined}
                      userId={profile.id}
                      size="w-7 h-7 sm:w-8 sm:h-8"
                      textSize="text-[9px] sm:text-[10px]"
                      className="border-2 border-slate-900"
                    />
                  )}
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-1.5 sm:mb-2 break-words leading-tight">
            {plan.title}
          </h1>
          <p className="text-white/80 max-w-xl text-sm sm:text-base md:text-lg flex items-center gap-2">
            <Map className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> {plan.destination_name}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <Button
            onClick={onOpenHistory}
            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-9 sm:h-12 px-3 sm:px-6 text-xs sm:text-sm cursor-pointer"
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" /> Activity Log
          </Button>
          <Button
            onClick={onOpenChat}
            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-9 sm:h-12 px-3 sm:px-6 text-xs sm:text-sm cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" /> Ask Planora AI
          </Button>
          {isAdmin && (
            <Button
              onClick={onOpenAdmin}
              className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-9 sm:h-12 px-3 sm:px-6 text-xs sm:text-sm lg:hidden"
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" /> Admin Panel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
