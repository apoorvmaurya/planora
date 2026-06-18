"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useFriends } from "@/hooks/useFriends"
import { Loader2, Users, Image as ImageIcon, ArrowRight } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

const groupSchema = z.object({
  name: z.string().min(3, "Group name is required"),
  description: z.string().optional(),
})

export function CreateGroupModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const supabase = createClient()
  const { friends } = useFriends()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({})

  const handleAvatarError = (userId: string) => {
    setAvatarErrors(prev => ({ ...prev, [userId]: true }))
  }

  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "" }
  })

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  const onSubmit = async (values: z.infer<typeof groupSchema>) => {
    setIsSubmitting(true)
    try {
      let finalCoverUrl = ""
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('group-covers')
          .upload(fileName, coverFile)
        
        if (uploadError) throw new Error("Failed to upload cover: " + uploadError.message)
        
        const { data: publicUrlData } = supabase.storage.from('group-covers').getPublicUrl(fileName)
        finalCoverUrl = publicUrlData.publicUrl
      }

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          cover_image_url: finalCoverUrl,
          member_ids: selectedFriends
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      toast.success("Group created!")
      onOpenChange(false)
      router.push(`/groups/${data.id}`)
      
      setStep(1)
      form.reset()
      setCoverFile(null)
      setCoverPreview(null)
      setSelectedFriends([])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && isSubmitting) return; 
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-0 overflow-hidden transition-all duration-500">
        <div className="h-2 bg-slate-100 dark:bg-slate-900 w-full relative transition-colors duration-500">
          <div 
            className="absolute left-0 top-0 h-full bg-[#16795A] transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
        
        <div className="p-6 sm:p-8">
          <DialogHeader className="mb-6 text-left">
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-500">
              {step === 1 ? "Create a new group" : "Add members"}
            </DialogTitle>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group w-full h-40 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#16795A] hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all duration-300">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 group-hover:text-[#16795A] dark:group-hover:text-teal-400 transition-colors duration-300">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Upload group cover</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCoverChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <Form {...form}>
                <form className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-800 dark:text-slate-200 transition-colors duration-500">Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Europe 2026 Crew" className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-[#16795A] transition-all duration-300" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-800 dark:text-slate-200 transition-colors duration-500">Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="What is this group for?" className="resize-none rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-[#16795A] transition-all duration-300" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors duration-500">
                <Button 
                  onClick={async () => {
                    const valid = await form.trigger()
                    if (valid) setStep(2)
                  }}
                  className="bg-[#16795A] hover:bg-[#115E46] rounded-xl h-12 px-6 shadow-sm hover:shadow cursor-pointer transition-all duration-200"
                >
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <ScrollArea className="h-72 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 transition-colors duration-500">
                {friends.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-10 transition-colors duration-500">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3 transition-colors duration-500" />
                    <p>No friends found.</p>
                    <p className="text-sm">You can add friends later.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map(friend => (
                      <div key={friend.user.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-lg cursor-pointer transition-all duration-200" onClick={() => toggleFriend(friend.user.id)}>
                        <Checkbox checked={selectedFriends.includes(friend.user.id)} className="transition-all duration-200" />
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 transition-colors duration-500 flex items-center justify-center">
                          {friend.user.avatar_url && !avatarErrors[friend.user.id] ? (
                            <img 
                              src={friend.user.avatar_url} 
                              alt="avatar" 
                              className="w-full h-full object-cover" 
                              onError={() => handleAvatarError(friend.user.id)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 select-none uppercase">
                              {friend.user.full_name?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white transition-colors duration-500">{friend.user.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-500">@{friend.user.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 transition-colors duration-500">
                <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl h-12 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                  Back
                </Button>
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="bg-[#16795A] hover:bg-[#115E46] rounded-xl h-12 px-6 shadow-sm hover:shadow cursor-pointer transition-all duration-200"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Group
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
