import React, { useState, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ThumbsUp, ThumbsDown, Edit2, Sparkles, MapPin, Loader2, History, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export const ItineraryItemCard = memo(function ItineraryItemCard({ item, votes, currentUserId, isAdmin, onVote }: any) {
  const upvotes = votes.filter((v: any) => v.vote === 'up')
  const downvotes = votes.filter((v: any) => v.vote === 'down')
  const userVote = votes.find((v: any) => v.user_id === currentUserId)?.vote

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
  const displayTitle = item.title.replace('[Tie-Breaker]', '').trim()

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

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/plans/${item.plan_id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      if (!res.ok) throw new Error("Failed to update item")
      toast.success("Item updated successfully!")
      setIsEditing(false)
    } catch (err) {
      toast.error("Error updating item")
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

  return (
    <div className="relative flex items-start group">
      <div className="flex flex-col items-center mr-4">
        <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shadow-sm z-10 shrink-0">
          {item.time_of_day.substring(0,3)}
        </div>
        <div className="w-0.5 h-full bg-slate-200 absolute top-12 left-6 -translate-x-1/2 group-last:hidden" />
      </div>
      
      <motion.div 
        layout
        className={`flex-1 bg-white/80 backdrop-blur-xl rounded-2xl p-5 border ${isTieBreaker ? 'border-[#1D9E75] shadow-teal-500/10' : 'border-slate-100 shadow-slate-200/50'} shadow-xl hover:shadow-2xl transition-all duration-300 mb-6 relative overflow-hidden`}
      >
        {isTieBreaker && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-bl-full -z-10 blur-2xl" />
        )}
        
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-bold text-xl text-slate-900 flex items-center gap-2">
              {displayTitle}
              {isTieBreaker && (
                <span className="text-[10px] uppercase bg-gradient-to-r from-teal-400 to-emerald-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Suggestion
                </span>
              )}
            </h4>
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0 ml-4 justify-end">
            {item.history && item.history.length > 0 && (
              <Dialog>
                <DialogTrigger render={
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600 bg-white shadow-sm border-slate-200 hover:bg-slate-50">
                    <History className="w-3 h-3 mr-1.5" /> History ({item.history.length})
                  </Button>
                } />
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Version History</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {item.history.map((hist: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                        <p className="text-xs text-slate-400 mb-2">Saved on {new Date(hist.saved_at).toLocaleString()}</p>
                        <h4 className="font-bold text-sm text-slate-900">{hist.title.replace('[Tie-Breaker]', '')}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1 mb-3">{hist.description}</p>
                        <Button 
                          onClick={() => handleRestore(idx)}
                          disabled={isRestoring}
                          size="sm" 
                          className="w-full bg-slate-900 text-white"
                        >
                          <RotateCcw className="w-3 h-3 mr-2" /> Restore This Version
                        </Button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {isAdmin && (
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger render={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Itinerary Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="resize-none h-24" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Time of Day</Label>
                        <Select value={editData.time_of_day} onValueChange={v => setEditData({...editData, time_of_day: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                        <Input type="number" value={editData.duration_minutes} onChange={e => setEditData({...editData, duration_minutes: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input value={editData.location_name} onChange={e => setEditData({...editData, location_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Est. Cost</Label>
                        <Input type="number" value={editData.estimated_cost} onChange={e => setEditData({...editData, estimated_cost: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveEdit} className="bg-[#1D9E75] hover:bg-[#15805e]">
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button 
              onClick={handleSuggest}
              disabled={isSuggesting}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold text-[#1D9E75] border-teal-200 bg-teal-50 hover:bg-teal-100 hover:text-[#15805e] transition-colors shrink-0"
            >
              {isSuggesting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
              Re-suggest
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-slate-600 mb-5 leading-relaxed">{item.description}</p>
        
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
          <div className="flex items-center text-xs font-semibold text-slate-500 gap-4">
            <span className="flex items-center bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100"><MapPin className="w-3 h-3 mr-1.5 text-rose-400" />{item.location_name}</span>
            <span className="bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">{item.duration_minutes}m</span>
            <span className="bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 font-mono">{item.estimated_cost}</span>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onVote(item.id, 'up')}
              className={`h-8 px-3 rounded-md text-xs font-bold transition-all ${userVote === 'up' ? 'bg-teal-500 text-white hover:bg-teal-600' : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'}`}
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
            <div className="w-px h-4 bg-slate-200" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onVote(item.id, 'down')}
              className={`h-8 px-3 rounded-md text-xs font-bold transition-all ${userVote === 'down' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'text-slate-500 hover:bg-slate-50 hover:text-rose-600'}`}
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
        </div>
      </motion.div>
    </div>
  )
})
