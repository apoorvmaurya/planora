"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { motion, AnimatePresence } from "framer-motion"
import { ImagePlus, Sparkles, Heart, Share2, Copy, CheckCircle2 } from "lucide-react"
import confetti from "canvas-confetti"
import { AddMemoryModal } from "@/components/shared/AddMemoryModal"
import { Button } from "@/components/ui/button"

export default function MemoriesPage() {
  const params = useParams()
  const planId = params.planId as string
  const supabase = createClient()
  const { profile } = useUserStore()

  const [plan, setPlan] = useState<any>(null)
  const [memories, setMemories] = useState<any[]>([])
  const [likedMemories, setLikedMemories] = useState<Set<string>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const fetchData = async () => {
    // Fetch Plan
    const { data: pData } = await supabase.from('plans').select('*').eq('id', planId).single()
    setPlan(pData)

    // Trigger Confetti if completed and hasn't triggered yet (we can just trigger on mount if status == completed for demo)
    if (pData?.status === 'completed' && !sessionStorage.getItem(`confetti_${planId}`)) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
      sessionStorage.setItem(`confetti_${planId}`, 'true')
    }

    // Fetch Memories
    const { data: mData } = await supabase
      .from('trip_memories')
      .select(`
        *,
        user:profiles(full_name, avatar_url),
        memory_likes(user_id)
      `)
      .eq('plan_id', planId)
      .order('created_at', { ascending: false })

    if (mData) {
      setMemories(mData)
      if (profile) {
        const liked = new Set(
          mData.filter(m => m.memory_likes.some((l: any) => l.user_id === profile.id)).map(m => m.id)
        )
        setLikedMemories(liked)
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [planId, profile])

  const handleLike = async (memoryId: string) => {
    if (!profile) return
    const isLiked = likedMemories.has(memoryId)
    
    // Optimistic UI
    setLikedMemories(prev => {
      const next = new Set(prev)
      if (isLiked) next.delete(memoryId)
      else next.add(memoryId)
      return next
    })

    setMemories(prev => prev.map(m => {
      if (m.id === memoryId) {
        const likes = [...m.memory_likes]
        if (isLiked) {
          return { ...m, memory_likes: likes.filter((l: any) => l.user_id !== profile.id) }
        } else {
          return { ...m, memory_likes: [...likes, { user_id: profile.id }] }
        }
      }
      return m
    }))

    if (isLiked) {
      await supabase.from('memory_likes').delete().eq('memory_id', memoryId).eq('user_id', profile.id)
    } else {
      await supabase.from('memory_likes').insert({ memory_id: memoryId, user_id: profile.id })
    }
  }

  const handleShare = () => {
    if (!plan?.share_token) return
    const url = `${window.location.origin}/share/${plan.share_token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (!plan) return <div className="text-center py-20 text-slate-500 dark:text-slate-450 transition-colors duration-500">Loading memories...</div>

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 transition-colors duration-550">
            Trip Memories
            {plan.status === 'completed' && (
              <span className="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors duration-500">
                <Sparkles className="w-3 h-3" /> Completed
              </span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-450 transition-colors duration-500">Relive the best moments from {plan.destination_name}.</p>
        </div>
        
        <div className="flex gap-3">
          {plan.share_token && (
            <Button variant="outline" onClick={handleShare} className="rounded-xl flex items-center gap-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300">
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
              {copiedLink ? 'Copied Link!' : 'Share Publicly'}
            </Button>
          )}
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-[#1D9E75] hover:bg-[#15805e] text-white flex items-center gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            Add Memory
          </Button>
        </div>
      </div>

      {plan.recap_text && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden transition-colors duration-500"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1D9E75]" />
          <div className="flex gap-4 items-start">
            <div className="bg-teal-50 dark:bg-teal-950/20 p-3 rounded-2xl text-[#1D9E75] dark:text-teal-400 shrink-0 hidden sm:block transition-colors duration-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2 transition-colors duration-500">AI Trip Recap</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap transition-colors duration-500">{plan.recap_text}</p>
            </div>
          </div>
        </motion.div>
      )}

      {memories.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors duration-500">
          <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mb-4 transition-colors duration-500">
            <ImagePlus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors duration-550">No memories yet</h3>
          <p className="text-slate-500 dark:text-slate-450 mt-1 max-w-sm mx-auto transition-colors duration-500">Upload the first photo to start building your trip's shared album.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {memories.map((memory, i) => {
            const isLiked = likedMemories.has(memory.id)
            const likeCount = memory.memory_likes?.length || 0

            return (
              <motion.div 
                key={memory.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="break-inside-avoid bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden group transition-colors duration-500"
              >
                <div className="relative">
                  <img src={memory.photo_url} alt="Trip memory" className="w-full object-cover" />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                    <button 
                      onClick={() => handleLike(memory.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors ${
                        isLiked ? 'bg-red-500/90 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-semibold">{likeCount > 0 ? likeCount : 'Like'}</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-4">
                  {memory.caption && (
                    <p className="text-slate-800 dark:text-slate-200 text-sm mb-3 transition-colors duration-500">{memory.caption}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <img 
                      src={memory.user?.avatar_url || `https://ui-avatars.com/api/?name=${memory.user?.full_name}`} 
                      className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 object-cover border border-slate-200 dark:border-slate-700"
                      alt="" 
                    />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors duration-500">{memory.user?.full_name}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AddMemoryModal 
        planId={planId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  )
}
