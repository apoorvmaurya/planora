import React, { useState, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ThumbsUp, ThumbsDown, Edit2, Sparkles, MapPin, Loader2, History, RotateCcw, Save, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { queueOfflineOp, offlineDB } from "@/lib/supabase/offlineSync"

export const ItineraryItemCard = memo(function ItineraryItemCard({ 
  item, 
  votes, 
  currentUserId, 
  isAdmin, 
  onVote, 
  onUpdate,
  members,
  isSolo = false
}: any) {
  const upvotes = votes.filter((v: any) => v.vote === 'up')
  const downvotes = votes.filter((v: any) => v.vote === 'down')
  const userVote = votes.find((v: any) => v.user_id === currentUserId)?.vote

  const [isApproveLoading, setIsApproveLoading] = useState(false)
  const [isRejectLoading, setIsRejectLoading] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  
  // Edit form state
  const [editData, setEditData] = useState({
    title: item.title,
    description: item.description,
    time_of_day: item.time_of_day,
    location_name: item.location_name,
    duration_minutes: item.duration_minutes,
    estimated_cost: item.estimated_cost
  })

  const isTieBreaker = item.title.includes('[Tie-Breaker]')
  const displayTitle = item.title.replace('[Tie-Breaker]', '').replace('[Delete Proposal]', '').trim()
  const isPersonal = !!item.user_id
  const isSuggestion = item.suggestion_status === 'suggestion'
  const isDeleteProposal = !!item.is_delete_suggestion

  // Find suggestor profile
  const suggestor = members?.find((m: any) => m.user.id === item.created_by)?.user

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
        body: JSON.stringify({ item_id: item.id })
      })
      if (!res.ok) throw new Error("Failed to resuggest")
      toast.success("AI generated a tie-breaker alternative!")
    } catch (err) {
      toast.error("Error generating alternative")
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
        body: JSON.stringify({ suggestion_status: 'approved' })
      })
      if (!res.ok) throw new Error("Failed to approve suggestion")
      toast.success(isDeleteProposal ? "Deletion request approved!" : "Suggestion approved!")
      onUpdate?.()
    } catch (err: any) {
      toast.error(err.message || "Failed to approve suggestion")
    } finally {
      setIsApproveLoading(false)
    }
  }

  const handleReject = async () => {
    const confirmReject = window.confirm(
      isDeleteProposal 
        ? "Are you sure you want to reject this delete proposal?" 
        : "Are you sure you want to reject and delete this suggestion?"
    )
    if (!confirmReject) return

    setIsRejectLoading(true)
    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error("Failed to reject suggestion")
      toast.success("Suggestion rejected and removed.")
      onUpdate?.()
    } catch (err: any) {
      toast.error(err.message || "Failed to reject suggestion")
    } finally {
      setIsRejectLoading(false)
    }
  }

  const handleSaveEdit = async () => {
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
        setIsEditing(false)
        onUpdate?.()
      } catch (err) {
        console.error("Offline edit save failed:", err)
        toast.error("Error updating item offline")
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
      setIsEditing(false)
      onUpdate?.()
    } catch (err: any) {
      toast.error(err.message || "Error updating item")
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
        setIsEditing(false)
        onUpdate?.()
      } catch (err) {
        console.error("Offline delete failed:", err)
        toast.error("Error deleting item offline")
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
      setIsEditing(false)
      onUpdate?.()
    } catch (err) {
      toast.error("Error deleting activity")
    }
  }

  const handleRestore = async (historyIndex: number) => {
    setIsRestoring(true)
    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyIndex })
      })
      if (!res.ok) throw new Error("Failed to restore item")
      toast.success("Restored to previous version!")
    } catch (err) {
      toast.error("Error restoring item")
    } finally {
      setIsRestoring(false)
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
                ? 'bg-teal-50/10 dark:bg-teal-950/5 border-dashed border-teal-200 dark:border-teal-900/40 shadow-lg'
                : isTieBreaker 
                  ? 'bg-white/80 dark:bg-slate-900/60 border-[#16795A] shadow-teal-500/10 shadow-xl' 
                  : 'bg-white/80 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/80 shadow-xl dark:shadow-teal-950/5'
        } hover:shadow-2xl`}
      >
        {isTieBreaker && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-bl-full -z-10 blur-2xl" />
        )}
        {isPersonal && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-bl-full -z-10 blur-2xl" />
        )}
        
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-bold text-xl text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              {displayTitle}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-750">
                {item.time_of_day}
              </span>
              {isTieBreaker && (
                <span className="text-[10px] uppercase bg-gradient-to-r from-teal-400 to-emerald-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Suggestion
                </span>
              )}
              {isPersonal && (
                <span className="text-[10px] uppercase bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1.5 tracking-wider">
                  🔒 Personal Travel
                </span>
              )}
              {isDeleteProposal && (
                <span className="text-[10px] uppercase bg-rose-500 text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm tracking-wider flex items-center gap-1.5 animate-pulse">
                  ⚠️ Proposed Deletion
                </span>
              )}
              {isSuggestion && !isDeleteProposal && (
                <span className="text-[10px] uppercase bg-teal-500 text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm tracking-wider flex items-center gap-1.5">
                  💡 Suggestion
                </span>
              )}
            </h4>
            {isSuggestion && (
              <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-1 font-semibold flex items-center gap-1">
                Proposed by <span className="text-slate-700 dark:text-slate-200 font-extrabold">{suggestor?.full_name || 'Group Member'}</span>
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0 ml-4 justify-end">
            {item.history && item.history.length > 0 && (
              <Dialog>
                <DialogTrigger render={
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <History className="w-3 h-3 mr-1.5" /> History ({item.history.length})
                  </Button>
                } />
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Version History</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {item.history.map((hist: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2" suppressHydrationWarning>Saved on {new Date(hist.saved_at).toLocaleString()}</p>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{hist.title.replace('[Tie-Breaker]', '')}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 mb-3">{hist.description}</p>
                        <Button 
                          onClick={() => handleRestore(idx)}
                          disabled={isRestoring}
                          size="sm" 
                          className="w-full bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 mr-2" /> Restore This Version
                        </Button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {canEditDirectOrPropose && (
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger render={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                } />
                <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white font-bold text-xl">
                      {isApproved && !isAdmin && !isPersonal ? "Propose Alternative Activity" : "Edit Activity Details"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="resize-none h-24 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Time of Day</Label>
                        <Select value={editData.time_of_day} onValueChange={v => setEditData({...editData, time_of_day: v})}>
                          <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Morning">Morning</SelectItem>
                            <SelectItem value="Afternoon">Afternoon</SelectItem>
                            <SelectItem value="Evening">Evening</SelectItem>
                            <SelectItem value="Night">Night</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (mins)</Label>
                        <Input type="number" value={editData.duration_minutes} onChange={e => setEditData({...editData, duration_minutes: parseInt(e.target.value)})} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input value={editData.location_name} onChange={e => setEditData({...editData, location_name: e.target.value})} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label>Est. Cost</Label>
                        <Input type="number" value={editData.estimated_cost} onChange={e => setEditData({...editData, estimated_cost: parseFloat(e.target.value)})} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex flex-row justify-between items-center sm:justify-between w-full mt-4">
                    <Button 
                      type="button"
                      variant="destructive" 
                      onClick={handleDelete}
                      className="bg-red-650 hover:bg-red-700 text-white rounded-xl h-10 px-4 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> 
                      {isApproved && !isAdmin && !isPersonal ? "Propose Delete" : "Delete Activity"}
                    </Button>
                    <Button onClick={handleSaveEdit} className="bg-[#16795A] hover:bg-[#115E46] rounded-xl h-10 px-5 flex items-center gap-1.5 text-white cursor-pointer">
                      <Save className="w-4 h-4" /> 
                      {isApproved && !isAdmin && !isPersonal ? "Propose Alternative" : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
        
        <p className="text-sm text-slate-600 dark:text-slate-350 mb-5 leading-relaxed">{item.description}</p>
        
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center text-xs font-semibold text-slate-500 dark:text-slate-400 gap-4">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location_name)}`}
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
            {/* Direct Voting for Suggestions & Approved items */}
            {!isPersonal && !isSolo && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800/80">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onVote(item.id, 'up')}
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

            {/* Admin Manual Approval/Rejection Controls */}
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
