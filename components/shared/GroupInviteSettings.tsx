"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle2, RefreshCw, Loader2 } from "lucide-react"

interface GroupInviteSettingsProps {
  inviteCode?: string
  originUrl: string
  copiedLink: boolean
  isRegeneratingCode: boolean
  onCopyInvite: () => void
  onRegenerateCode: () => Promise<void>
}

export function GroupInviteSettings({
  inviteCode,
  originUrl,
  copiedLink,
  isRegeneratingCode,
  onCopyInvite,
  onRegenerateCode,
}: GroupInviteSettingsProps) {
  return (
    <motion.div
      key="invite"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 flex-1"
    >
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Invite Link Settings</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage the join link that people use to enter your group.
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Group Link</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-slate-200 select-all font-mono truncate">
            {originUrl && inviteCode ? `${originUrl}/invite/${inviteCode}` : "Loading..."}
          </div>

          <Button
            onClick={onCopyInvite}
            className={`rounded-xl px-5 h-12 font-bold cursor-pointer transition-colors ${
              copiedLink
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-[#16795A] hover:bg-[#115E46] text-white"
            }`}
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pt-2">
          Share this link with anyone you want to invite to the group. They will be added as a member automatically when they visit.
        </p>
      </div>

      <div className="border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-950 dark:text-white">Need to invalidate old links?</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Regenerating the link will break any invite links you have previously shared.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRegenerateCode}
          disabled={isRegeneratingCode}
          className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl h-11 px-5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer flex items-center gap-2"
        >
          {isRegeneratingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Regenerate Link
        </Button>
      </div>
    </motion.div>
  )
}
