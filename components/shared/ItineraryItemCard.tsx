"use client"

import React, { useState, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ThumbsUp, ThumbsDown, Sparkles, MapPin, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { queueOfflineOp, offlineDB } from "@/lib/supabase/offlineSync"
import { ItineraryItemCardProps, PlanItem } from "@/lib/types/itinerary"
import { ItineraryItemEditDialog } from "./ItineraryItemEditDialog"
import { handleApiError } from "@/lib/errors"

export const ItineraryItemCard = memo(function ItineraryItemCard({ 
  item, 
  votes = [], 
  currentUserId, 
  isAdmin, 
  onVote, 
  onUpdate,
  members = [],
  isSolo = false
}: ItineraryItemCardProps) {
  const upvotes = votes.filter((v) => v.vote === 'up')
  const downvotes = votes.filter((v) => v.vote === 'down')
  const userVote = votes.find((v) => v.user_id === currentUserId)?.vote

  const [isApproveLoading, setIsApproveLoading] = useState(false)
  const [isRejectLoading, setIsRejectLoading] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)

  const isTieBreaker = item.title.includes('[Tie-Breaker]')
  const displayTitle = item.title.replace('[Tie-Breaker]', '').replace('[Delete Proposal]', '').trim()
  const isPersonal = !!(item as any).user_id
  const isSuggestion = item.suggestion_status === 'suggestion'
  const isDeleteProposal = !!item.is_delete_suggestion

  const suggestor = members?.find((m) => m.user?.id === item.created_by)?.user

  const getCategoryEmoji = () => {
    if (isDeleteProposal) return '🗑️'
    const category = (item.category || "").toLowerCase()
    const title = (item.title || "").toLowerCase()
    
    if (category === 'transit' || category === 'transport') {
      if (title.includes('flight') || title.includes('plane') || title.includes('✈️')) return '✈️'
      if (title.includes('train') || title.includes('rail')) return '🚆'
      if (title.includes('bus')) return '🚌'
      return '🚗'
    }
    if (category === 'accommodation' || category === 'hotel') return '🏨'
    if (category === 'food' || category === 'restaurant' || category === 'dining' || category === 'dinner' || category === 'lunch') return '🍽️'
    if (category === 'leisure' || category === 'beach' || category === 'spa') return '🏖️'
    if (category === 'activity') {
      if (title.includes('museum') || title.includes('art') || title.includes('gallery')) return '🏛️'
      if (title.includes('park') || title.includes('garden')) return '🌳'
      if (title.includes('shop') || title.includes('market') || title.includes('mall')) return '🛍️'
      return '🎟️'
    }
    return '📍'
  }

  const handleSuggest = async () => {
    setIsSuggesting(true)
    try {
      const res = await fetch(`/api/plans/${item.plan_id}/resuggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to resuggest item")
      toast.success("New alternative suggested!")
      onUpdate?.()
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Failed to suggest alternative"))
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleApprove = async () => {
    setIsApproveLoading(true)
    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to approve item")
      toast.success(isDeleteProposal ? "Activity deleted!" : "Suggestion approved!")
      onUpdate?.()
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Failed to approve"))
    } finally {
      setIsApproveLoading(false)
    }
  }

  const handleReject = async () => {
    setIsRejectLoading(true)
    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reject suggestion")
      toast.success("Suggestion rejected")
      onUpdate?.()
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Failed to reject"))
    } finally {
      setIsRejectLoading(false)
    }
  }

  const handleSaveEdit = async (editData: any) => {
    if (!navigator.onLine) {
      try {
        const cached = await offlineDB.items.get(item.plan_id)
        if (cached) {
          const updatedList = cached.data.map((i: any) => 
            i.id === item.id ? { ...i, ...editData } : i
          )
          await offlineDB.items.put({ id: item.plan_id, planId: item.plan_id, data: updatedList })
        }
        await queueOfflineOp(item.plan_id, 'EDIT_ITEM', { item_id: item.id, editData })
        toast.info("Offline: Proposal/Changes queued for sync")
        onUpdate?.()
      } catch (err: unknown) {
        toast.error(handleApiError(err, "Error updating item offline"))
      }
      return
    }

    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update item")
      
      if (data.proposed) {
        toast.success("Alternative proposal submitted to the group!")
      } else {
        toast.success("Item updated successfully!")
      }
      onUpdate?.()
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Error updating item"))
    }
  }

  const handleDelete = async () => {
    const isDirectDelete = isSolo || isAdmin || isPersonal || (isSuggestion && item.created_by === currentUserId)
    const promptMsg = isDirectDelete
      ? "Are you sure you want to delete this activity?"
      : "Propose deleting this official activity? Group members will vote on it."

    const confirmDelete = window.confirm(promptMsg)
    if (!confirmDelete) return

    if (!navigator.onLine) {
      try {
        const cached = await offlineDB.items.get(item.plan_id)
        if (cached) {
          const updatedList = cached.data.filter((i: any) => i.id !== item.id)
          await offlineDB.items.put({ id: item.plan_id, planId: item.plan_id, data: updatedList })
        }
        await queueOfflineOp(item.plan_id, 'DELETE_ITEM', { item_id: item.id })
        toast.info("Offline: Deletion/Proposal queued for sync")
        onUpdate?.()
      } catch (err: unknown) {
        toast.error(handleApiError(err, "Error deleting item offline"))
      }
      return
    }

    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error("Failed to delete item")

      if (data.proposed) {
        toast.success("Delete proposal submitted to the group!")
      } else {
        toast.success("Activity deleted successfully!")
      }
      onUpdate?.()
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Error deleting activity"))
    }
  }

  const handleRevert = async (hist: any) => {
    const historyList = ((item as any).history as any[]) || []
    const historyIndex = historyList.findIndex(h => h.saved_at === hist.saved_at)
    if (historyIndex === -1) return

    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyIndex })
      })
      if (!res.ok) throw new Error("Failed to restore item")
      toast.success("Restored to previous version!")
      onUpdate?.()
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Error restoring item"))
    }
  }

  const isSuggestionOwner = isSuggestion && item.created_by === currentUserId
  const isApproved = item.suggestion_status === 'approved' || !item.suggestion_status
  const canEditDirectOrPropose = isAdmin || isPersonal || isSuggestionOwner || (!isPersonal && isApproved)

  return (
    <div className="relative flex items-start group">
      <div className="flex flex-col items-center mr-4">
        <div className={`w-12 h-12 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center text-xl shadow-sm z-10 shrink-0 ${
          isPersonal 
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-650 dark:text-indigo-300' 
            : isDeleteProposal 
              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-650 dark:text-rose-300'
              : isSuggestion 
                ? 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          {getCategoryEmoji()}
        </div>
        <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-800 absolute top-12 left-6 -translate-x-1/2 group-last:hidden" />
      </div>
      
      <motion.div 
        layout
        className={`flex-1 backdrop-blur-xl rounded-2xl p-5 border transition-all duration-300 mb-6 relative overflow-hidden ${
          isPersonal 
            ? 'bg-indigo-50/15 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/40 shadow-xl shadow-indigo-100/10 dark:shadow-none' 
            : isDeleteProposal
              ? 'bg-rose-50/10 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 shadow-xl shadow-rose-100/5'
              : isSuggestion
                ? 'bg-teal-50/20 dark:bg-teal-950/20 border-teal-200/60 dark:border-teal-900/40 shadow-xl shadow-teal-500/5'
                : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-100/50 dark:shadow-none'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="space-y-1 max-w-[80%]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                item.time_of_day === 'Morning' 
                  ? 'bg-amber-50 text-amber-650 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40' 
                  : item.time_of_day === 'Afternoon'
                    ? 'bg-sky-50 text-sky-650 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/40'
                    : item.time_of_day === 'Evening'
                      ? 'bg-indigo-50 text-indigo-650 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40'
                      : 'bg-purple-50 text-purple-650 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40'
              }`}>
                {item.time_of_day}
              </span>

              {isSuggestion && (
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isDeleteProposal
                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40'
                    : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40'
                }`}>
                  {isDeleteProposal ? "Proposed Deletion" : "Proposed Suggestion"}
                </span>
              )}

              {isTieBreaker && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Tie-Breaker
                </span>
              )}
            </div>

            <h3 className={`font-bold text-slate-800 dark:text-slate-100 text-lg leading-snug flex items-center gap-2 ${
              isDeleteProposal ? 'line-through text-rose-500 dark:text-rose-400' : ''
            }`}>
              {displayTitle}
            </h3>

            {isSuggestion && suggestor && (
              <p className="text-xs text-slate-400 font-medium">
                Suggested by <span className="font-semibold text-slate-600 dark:text-slate-300">{suggestor.full_name || "a member"}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {canEditDirectOrPropose && (
              <ItineraryItemEditDialog
                item={item}
                isAdmin={isAdmin}
                isPersonal={isPersonal}
                onSave={handleSaveEdit}
                onDelete={handleDelete}
                onRevert={isAdmin ? handleRevert : undefined}
              />
            )}

            {!isPersonal && isApproved && !isSolo && (
              <Button 
                onClick={handleSuggest}
                disabled={isSuggesting}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold text-[#16795A] border-teal-200 bg-teal-50 hover:bg-teal-100 hover:text-[#115E46] transition-colors shrink-0 cursor-pointer"
              >
                {isSuggesting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                Re-suggest
              </Button>
            )}
          </div>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">{item.description}</p>
        
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center text-xs font-semibold text-slate-500 dark:text-slate-400 gap-4">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location_name || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <MapPin className="w-3 h-3 mr-1.5 text-rose-400" />
              {item.location_name}
            </a>
            <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-slate-800/80">{item.duration_minutes}m</span>
            <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-slate-800/80 font-mono">{item.estimated_cost}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isPersonal && !isSolo && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800/80">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onVote(item.id, 'up')}
                  aria-label="Upvote suggestion"
                  className={`h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${userVote === 'up' ? 'bg-teal-500 text-white hover:bg-teal-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600'}`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 mr-1.5 ${userVote === 'up' ? 'fill-white' : ''}`} />
                  <AnimatePresence mode="popLayout">
                    {upvotes.length > 0 && (
                      <motion.span key={upvotes.length} initial={{scale:0, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0, opacity:0}} className="ml-1">
                        {upvotes.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onVote(item.id, 'down')}
                  aria-label="Downvote suggestion"
                  className={`h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${userVote === 'down' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-600'}`}
                >
                  <ThumbsDown className={`w-3.5 h-3.5 mr-1.5 ${userVote === 'down' ? 'fill-white' : ''}`} />
                  <AnimatePresence mode="popLayout">
                    {downvotes.length > 0 && (
                      <motion.span key={downvotes.length} initial={{scale:0, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0, opacity:0}} className="ml-1">
                        {downvotes.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            )}

            {isAdmin && isSuggestion && !isSolo && (
              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                <Button 
                  size="sm" 
                  disabled={isApproveLoading}
                  onClick={handleApprove} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 h-8 flex items-center gap-1 cursor-pointer font-bold text-xs"
                >
                  {isApproveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />} 
                  {isDeleteProposal ? "Confirm Delete" : "Approve"}
                </Button>
                <Button 
                  size="sm" 
                  disabled={isRejectLoading}
                  onClick={handleReject} 
                  className="bg-rose-650 hover:bg-rose-700 text-white rounded-lg px-2.5 h-8 flex items-center gap-1 cursor-pointer font-bold text-xs"
                >
                  {isRejectLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} 
                  Reject
                </Button>
              </div>
            )}

            {isPersonal && (
              <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-1.5 shadow-sm">
                ✨ Personal Schedule
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
})
