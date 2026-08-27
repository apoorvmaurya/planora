"use client"

import React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { Shield, CheckCircle2, Sparkles, XCircle, Trash2, UserMinus } from "lucide-react"

interface PlanAdminSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  plan: any
  members: any[]
  currentUserId?: string
  onConfirmPlan: () => Promise<void>
  onMarkCompleted: () => Promise<void>
  onCancelPlan: () => void
  onDeletePlan: () => void
  onKickMember: (user: any) => void
}

export function PlanAdminSheet({
  isOpen,
  onOpenChange,
  plan,
  members,
  currentUserId,
  onConfirmPlan,
  onMarkCompleted,
  onCancelPlan,
  onDeletePlan,
  onKickMember,
}: PlanAdminSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-xl w-full p-0 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800">
        <SheetHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center gap-3 space-y-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 flex items-center justify-center text-[#16795A]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <SheetTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Admin Controls
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-400">
              Manage plan status and collaboration
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Current Status</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">{plan.status}</p>
            </div>
            <span className="bg-[#16795A]/10 text-[#16795A] text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
              {plan.status}
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Actions</h4>

            {plan.status === 'draft' && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12 border-[#16795A]/30 text-[#16795A] hover:bg-teal-50 dark:hover:bg-teal-950/20"
                onClick={onConfirmPlan}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" /> Confirm Plan
              </Button>
            )}

            {plan.status === 'confirmed' && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12 border-purple-200 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                onClick={onMarkCompleted}
              >
                <Sparkles className="w-5 h-5 mr-2" /> Mark as Completed
              </Button>
            )}

            {plan.status !== 'cancelled' && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12 border-orange-200 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                onClick={onCancelPlan}
              >
                <XCircle className="w-5 h-5 mr-2" /> Cancel Plan
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start rounded-xl h-12 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={onDeletePlan}
            >
              <Trash2 className="w-5 h-5 mr-2" /> Delete Permanently
            </Button>
          </div>

          {plan.group_id && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Group Collaboration ({members.length})
              </h4>
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                {members.map((m) => (
                  <div
                    key={m.user?.id || m.id}
                    className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatarUrl={m.user?.avatar_url}
                        name={m.user?.full_name}
                        userId={m.user?.id}
                        size="w-8 h-8"
                        textSize="text-[10px]"
                        className="border border-slate-200 dark:border-slate-700 object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {m.user?.full_name}
                        </p>
                        <p className="text-xs text-slate-400">@{m.user?.username || 'member'}</p>
                      </div>
                    </div>
                    {m.user?.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        onClick={() => onKickMember(m.user)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs px-2.5 h-8 rounded-lg"
                      >
                        <UserMinus className="w-4 h-4 mr-1" /> Kick
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/50">
          <Button onClick={() => onOpenChange(false)} className="w-full bg-[#16795A] hover:bg-[#115E46]">
            Close Panel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
