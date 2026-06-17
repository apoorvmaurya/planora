"use client"

import React, { useState } from "react"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"
import { Loader2, Mail } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function InviteModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { profile } = useUserStore()
  const [email, setEmail] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSending(true)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          inviterName: profile?.full_name || 'A friend' 
        })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      toast.success(`Invite sent to ${email}`)
      setEmail("")
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 transition-all duration-500">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 flex items-center justify-center mb-4 transition-colors duration-500">
            <Mail className="w-6 h-6" />
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Invite a friend</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Send them an email invitation to join you on Planora.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 mt-4">
          <Input 
            type="email" 
            placeholder="friend@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-[#16795A] transition-all duration-300"
          />
          <Button 
            type="submit" 
            disabled={isSending} 
            className="w-full rounded-xl h-12 bg-[#16795A] hover:bg-[#115E46] text-white shadow-sm hover:shadow cursor-pointer transition-all duration-200"
          >
            {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
