"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Trash2, LogOut } from "lucide-react"

interface GroupDangerSettingsProps {
  onOpenDelete: () => void
  onOpenLeave: () => void
}

export function GroupDangerSettings({ onOpenDelete, onOpenLeave }: GroupDangerSettingsProps) {
  return (
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Irreversible administrative actions for this group.
          </p>
        </div>

        <div className="border border-red-200 dark:border-red-950/30 rounded-3xl overflow-hidden divide-y divide-red-100 dark:divide-red-950/20 bg-red-50/10 dark:bg-red-950/5">
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1 max-w-lg">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Group</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanently delete this group and all its plans, expense records, memories, and dashboard charts. This action cannot be undone.
              </p>
            </div>
            <Button
              onClick={onOpenDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-11 px-5 shadow-lg shadow-red-500/10 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Group
            </Button>
          </div>

          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1 max-w-lg">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Leave Group</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exit the group. You will lose access to all collaborative itineraries and charts. You can rejoin if another member invites you.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onOpenLeave}
              className="border-red-200 dark:border-red-950/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl h-11 px-5 shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" /> Leave Group
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
