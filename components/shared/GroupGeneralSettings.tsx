"use client"

import React from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, Save, Loader2 } from "lucide-react"

interface GroupGeneralSettingsProps {
  name: string
  setName: (name: string) => void
  description: string
  setDescription: (desc: string) => void
  coverPreview: string | null
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isUpdating: boolean
  onSubmit: (e: React.FormEvent) => Promise<void>
}

export function GroupGeneralSettings({
  name,
  setName,
  description,
  setDescription,
  coverPreview,
  onCoverChange,
  isUpdating,
  onSubmit,
}: GroupGeneralSettingsProps) {
  return (
    <motion.form
      key="general"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={onSubmit}
      className="space-y-6 flex-1 flex flex-col justify-between"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">General Information</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update your group cover photo, name, and bio.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Group Cover Photo
          </label>
          <div className="relative group w-full h-48 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#16795A] dark:hover:border-teal-400 transition-colors">
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold bg-[#16795A] px-3 py-1.5 rounded-full shadow">
                    Change Image
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 group-hover:text-[#16795A] transition-colors">
                <ImageIcon className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Upload new cover image</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={onCoverChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="group-name" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Group Name
          </label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
            className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-[#16795A] transition-colors"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="group-description" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Description
          </label>
          <Textarea
            id="group-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group planning?"
            rows={4}
            className="resize-none rounded-xl bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-[#16795A] transition-colors"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <Button
          type="submit"
          disabled={isUpdating}
          className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl px-6 h-12 shadow shadow-[#16795A]/25 flex items-center gap-2 cursor-pointer"
        >
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </motion.form>
  )
}
