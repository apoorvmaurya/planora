"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { Calendar, DollarSign, Users, UserMinus, Wallet, Camera, Bell, PenSquare, Share2, CheckCircle2, Sparkles, XCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface PlanSidebarProps {
  plan: any
  members: any[]
  profile: any
  isAdmin: boolean
  mounted: boolean
  onKickTarget: (user: any) => void
  onConfirmPlan: () => Promise<void>
  onMarkCompleted: () => Promise<void>
  onShowCancelDialog: () => void
  onShowDeleteDialog: () => void
}

export function PlanSidebar({
  plan,
  members,
  profile,
  isAdmin,
  mounted,
  onKickTarget,
  onConfirmPlan,
  onMarkCompleted,
  onShowCancelDialog,
  onShowDeleteDialog,
}: PlanSidebarProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm sticky top-8 space-y-6 transition-colors duration-500">
        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 transition-colors duration-500">
          Trip Summary
        </h3>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Dates
            </p>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {mounted && plan.start_date && plan.end_date
                ? `${new Date(plan.start_date).toLocaleDateString()} - ${new Date(plan.end_date).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Total Budget
            </p>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-2xl">
              {plan.budget_total} {plan.currency}
            </p>
            {members.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                ~{(plan.budget_total / members.length).toFixed(0)} per person
              </p>
            )}
          </div>

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> {members.length > 0 ? "The Group" : "Solo Trip"}
            </p>
            <div className="space-y-2">
              {members.length === 0 && <p className="text-xs text-slate-400">Just you on this adventure!</p>}
              {members.map((m) => (
                <div key={m.user?.id || m.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={m.user?.avatar_url}
                      name={m.user?.full_name}
                      userId={m.user?.id}
                      size="w-8 h-8"
                      textSize="text-[10px]"
                      className="border border-slate-200 dark:border-slate-700 object-cover"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {m.user?.full_name}
                    </span>
                  </div>
                  {isAdmin && m.user?.id !== profile?.id && plan.group_id && (
                    <button
                      onClick={() => onKickTarget(m.user)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Features</p>
          <Link
            href={`/plans/${plan.id}/expenses`}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <Wallet className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Expenses & Budget
          </Link>
          <Link
            href={`/plans/${plan.id}/memories`}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <Camera className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Trip Memories
          </Link>
          <Link
            href={`/plans/${plan.id}/notifications`}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Momentum Engine
          </Link>
          {plan.status === "draft" && (
            <Link
              href={`/plans/${plan.id}/edit`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              <PenSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Edit Draft
            </Link>
          )}
          {plan.share_token && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/share/${plan.share_token}`)
                toast.success("Share link copied!")
              }}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 w-full text-left"
            >
              <Share2 className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Copy Share Link
            </button>
          )}
        </div>

        {isAdmin && plan.status !== "cancelled" && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Admin</p>
            {plan.status === "draft" && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl border-[#16795A]/30 text-[#16795A] hover:bg-teal-50 dark:hover:bg-teal-950/20"
                onClick={onConfirmPlan}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Plan
              </Button>
            )}
            {plan.status === "confirmed" && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                onClick={onMarkCompleted}
              >
                <Sparkles className="w-4 h-4 mr-2" /> Mark as Completed
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              onClick={onShowCancelDialog}
            >
              <XCircle className="w-4 h-4 mr-2" /> Cancel Plan
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={onShowDeleteDialog}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
