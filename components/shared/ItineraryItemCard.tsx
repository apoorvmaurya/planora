import React, { useState, memo } from "react"
import { motion } from "framer-motion"
import { Check, ThumbsUp, ThumbsDown, Edit2, Sparkles, MapPin, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export const ItineraryItemCard = memo(function ItineraryItemCard({ item, votes, currentUserId, isAdmin, onVote }: any) {
  const upvotes = votes.filter((v: any) => v.vote === 'up')
  const downvotes = votes.filter((v: any) => v.vote === 'down')
  const userVote = votes.find((v: any) => v.user_id === currentUserId)?.vote

  const [isSuggesting, setIsSuggesting] = useState(false)

  const handleSuggest = async () => {
    setIsSuggesting(true)
    setTimeout(() => {
      setIsSuggesting(false)
      toast.info("AI resuggestion generated (mocked for rate limits)")
    }, 2000)
  }

  return (
    <div className="relative flex items-start group">
      <div className="flex flex-col items-center mr-4">
        <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shadow-sm z-10 shrink-0">
          {item.time_of_day.substring(0,3)}
        </div>
        <div className="w-0.5 h-full bg-slate-200 absolute top-12 left-6 -translate-x-1/2 group-last:hidden" />
      </div>
      
      <div className="flex-1 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow mb-6">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-lg text-slate-900">{item.title}</h4>
          <div className="flex gap-2">
            {isAdmin && (
              <button className="text-slate-400 hover:text-slate-600"><Edit2 className="w-4 h-4" /></button>
            )}
            <button 
              onClick={handleSuggest}
              disabled={isSuggesting}
              className="text-[#1D9E75] hover:text-[#15805e] bg-teal-50 px-2 py-1 rounded flex items-center text-xs font-bold transition-colors"
            >
              {isSuggesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Re-suggest
            </button>
          </div>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">{item.description}</p>
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3">
          <div className="flex items-center text-xs font-semibold text-slate-500 gap-4">
            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{item.location_name}</span>
            <span>{item.duration_minutes}m</span>
            <span>{item.estimated_cost}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onVote(item.id, 'up')}
              className={`h-8 px-2 rounded-lg text-xs ${userVote === 'up' ? 'bg-teal-50 text-[#1D9E75]' : 'text-slate-500'}`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 mr-1.5 ${userVote === 'up' ? 'fill-[#1D9E75]' : ''}`} />
              {upvotes.length > 0 && <motion.span key={upvotes.length} initial={{scale:0.5}} animate={{scale:1}}>{upvotes.length}</motion.span>}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onVote(item.id, 'down')}
              className={`h-8 px-2 rounded-lg text-xs ${userVote === 'down' ? 'bg-red-50 text-red-500' : 'text-slate-500'}`}
            >
              <ThumbsDown className={`w-3.5 h-3.5 mr-1.5 ${userVote === 'down' ? 'fill-red-500' : ''}`} />
              {downvotes.length > 0 && <motion.span key={downvotes.length} initial={{scale:0.5}} animate={{scale:1}}>{downvotes.length}</motion.span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})
