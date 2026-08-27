"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { History, XCircle, RotateCcw } from "lucide-react"

interface PlanActivityLogDrawerProps {
  isOpen: boolean
  onClose: () => void
  activityLogs: any[]
  members: any[]
  isAdmin: boolean
  planCurrency?: string
  onRevertChange: (logId: string) => Promise<void>
  revertingLogIds: string[]
}

export function PlanActivityLogDrawer({
  isOpen,
  onClose,
  activityLogs,
  members,
  isAdmin,
  planCurrency = "USD",
  onRevertChange,
  revertingLogIds,
}: PlanActivityLogDrawerProps) {
  const formatLogTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return (
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " - " +
      date.toLocaleDateString([], { month: "short", day: "numeric" })
    )
  }

  const renderPayloadDiff = (log: any) => {
    if (!log.payload) return null
    const { old_item, new_item, deleted_item } = log.payload

    if (deleted_item) {
      return (
        <div className="mt-2 text-xs bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 p-2.5 rounded-lg space-y-1">
          <p className="font-bold">Deleted Item Details:</p>
          <p>
            <span className="font-semibold text-slate-500">Location:</span> {deleted_item.location_name}
          </p>
          <p>
            <span className="font-semibold text-slate-500">Cost:</span> {deleted_item.estimated_cost} {planCurrency}
          </p>
        </div>
      )
    }

    if (old_item && new_item) {
      const changes: string[] = []
      if (old_item.title !== new_item.title) changes.push(`Title: "${old_item.title}" ➔ "${new_item.title}"`)
      if (old_item.description !== new_item.description) changes.push(`Description updated`)
      if (old_item.time_of_day !== new_item.time_of_day)
        changes.push(`Time: "${old_item.time_of_day}" ➔ "${new_item.time_of_day}"`)
      if (old_item.day_number !== new_item.day_number)
        changes.push(`Day: Day ${old_item.day_number} ➔ Day ${new_item.day_number}`)
      if (old_item.location_name !== new_item.location_name)
        changes.push(`Location: "${old_item.location_name}" ➔ "${new_item.location_name}"`)
      if (old_item.estimated_cost !== new_item.estimated_cost)
        changes.push(`Cost: ${old_item.estimated_cost} ➔ ${new_item.estimated_cost} ${planCurrency}`)
      if (old_item.duration_minutes !== new_item.duration_minutes)
        changes.push(`Duration: ${old_item.duration_minutes}m ➔ ${new_item.duration_minutes}m`)

      if (changes.length === 0) return null

      return (
        <div className="mt-2 text-[11px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 p-2.5 rounded-lg space-y-1">
          {changes.map((c, i) => (
            <p key={i} className="flex items-center gap-1.5 font-medium">
              🔹 {c}
            </p>
          ))}
        </div>
      )
    }

    if (new_item) {
      return (
        <div className="mt-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-lg space-y-1">
          <p className="font-bold">Added Item Details:</p>
          {new_item.description && (
            <p className="italic text-slate-500 truncate">&quot;{new_item.description}&quot;</p>
          )}
          <p>
            <span className="font-semibold text-slate-500">Location:</span> {new_item.location_name}
          </p>
          <p>
            <span className="font-semibold text-slate-500">Duration:</span> {new_item.duration_minutes} mins
          </p>
          <p>
            <span className="font-semibold text-slate-500">Cost:</span> {new_item.estimated_cost} {planCurrency}
          </p>
        </div>
      )
    }

    return null
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200/50 dark:border-slate-800/50 shadow-2xl z-50 flex flex-col"
        >
          <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/35">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-base">
                  Plan Activity Log
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Audit Trail
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full w-8 h-8 p-0 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-slate-50/30 to-white dark:from-slate-900/10 dark:to-slate-950">
            {activityLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-8 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No activity logged yet</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px] mt-1">
                    Changes made to the itinerary will appear here in real-time.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6">
                {activityLogs.map((log) => {
                  const member = members.find((m: any) => (m.user?.id || m.id) === log.user_id)
                  const avatarUrl = member?.user?.avatar_url
                  const authorName = member?.user?.full_name || (log.user_id ? "Group Member" : "Planora AI")
                  const isSystem = !log.user_id

                  let iconBg = "bg-blue-100 dark:bg-blue-950/40 text-blue-650 dark:text-blue-400"
                  let actionIcon = "✏️"
                  if (log.activity_type === "ADD_ITEM") {
                    iconBg = "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    actionIcon = "➕"
                  } else if (log.activity_type === "DELETE_ITEM") {
                    iconBg = "bg-rose-100 dark:bg-rose-950/40 text-rose-650 dark:text-rose-405"
                    actionIcon = "🗑️"
                  } else if (log.activity_type === "PROMOTE_ITEM") {
                    iconBg = "bg-teal-100 dark:bg-teal-950/40 text-teal-650 dark:text-teal-400"
                    actionIcon = "💡"
                  } else if (log.activity_type === "PROPOSE_ITEM") {
                    iconBg = "bg-purple-100 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400"
                    actionIcon = "❓"
                  } else if (log.activity_type === "REVERT_ACTION") {
                    iconBg = "bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                    actionIcon = "↩️"
                  }

                  return (
                    <div key={log.id} className="relative group">
                      <div
                        className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 ${iconBg}`}
                      >
                        {actionIcon}
                      </div>

                      <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-900/60 transition-all shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          {isSystem ? (
                            <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-[#16795A] flex items-center justify-center text-[10px] shrink-0 border border-teal-100 dark:border-teal-900/40">
                              🤖
                            </div>
                          ) : (
                            <UserAvatar
                              avatarUrl={avatarUrl}
                              name={authorName}
                              userId={log.user_id}
                              size="w-5 h-5"
                              textSize="text-[8px]"
                              className="shrink-0"
                            />
                          )}
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{authorName}</span>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                            {formatLogTime(log.created_at)}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                          {log.description}
                        </p>

                        {renderPayloadDiff(log)}

                        {isAdmin &&
                          ["ADD_ITEM", "DELETE_ITEM", "UPDATE_ITEM", "PROMOTE_ITEM"].includes(log.activity_type) &&
                          (() => {
                            const isReverted = activityLogs.some(
                              (l) => l.activity_type === "REVERT_ACTION" && l.payload?.reverted_log_id === log.id
                            )
                            const isReverting = revertingLogIds.includes(log.id)

                            if (isReverted) {
                              return (
                                <div className="mt-3 pt-3 border-t border-slate-100/50 dark:border-slate-800/50 flex justify-end">
                                  <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    ↩️ Reverted
                                  </span>
                                </div>
                              )
                            }

                            return (
                              <div className="mt-3 pt-3 border-t border-slate-100/50 dark:border-slate-800/50 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isReverting}
                                  onClick={() => onRevertChange(log.id)}
                                  className="h-7 text-[10px] font-extrabold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 rounded-lg cursor-pointer transition-colors"
                                >
                                  <RotateCcw className={`w-3 h-3 ${isReverting ? "animate-spin" : ""}`} />
                                  {isReverting ? "Reverting..." : "Revert Change"}
                                </Button>
                              </div>
                            )
                          })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
