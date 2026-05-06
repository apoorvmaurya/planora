import React, { memo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Check, X, UserMinus, UserPlus, Clock } from "lucide-react"

interface FriendCardProps {
  user: any 
  friendshipId?: string
  context: 'friends' | 'incoming_request' | 'outgoing_request' | 'search'
  onAdd?: (userId: string) => void
  onAccept?: (friendshipId: string) => void
  onDecline?: (friendshipId: string) => void
  onRemove?: (friendshipId: string) => void
  isProcessing?: boolean
}


export const FriendCard = memo(function FriendCard({
  user,
  friendshipId,
  context,
  onAdd,
  onAccept,
  onDecline,
  onRemove,
  isProcessing
}: FriendCardProps) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="flex items-center gap-4 text-left w-full">
        <div className="w-14 h-14 rounded-full border border-slate-200 bg-slate-100 flex-shrink-0 overflow-hidden">
          {user.avatar_url ? (
            <Image 
              src={user.avatar_url} 
              alt={user.full_name} 
              width={56}
              height={56}
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-400">
              {user.full_name?.charAt(0) || "U"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{user.full_name}</h3>
          <p className="text-sm font-medium text-slate-500 truncate">@{user.username}</p>
          {(user.city || user.country) && (
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{user.city}{user.city && user.country ? ", " : ""}{user.country}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
        {context === 'search' && (
          <Button 
            onClick={() => onAdd?.(user.id)} 
            disabled={isProcessing}
            className="bg-[#1D9E75] hover:bg-[#15805e] w-full sm:w-auto rounded-xl"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add
          </Button>
        )}
        
        {context === 'incoming_request' && friendshipId && (
          <>
            <Button 
              onClick={() => onDecline?.(friendshipId)} 
              disabled={isProcessing}
              variant="outline" 
              className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
            >
              <X className="w-4 h-4 mr-1" /> Decline
            </Button>
            <Button 
              onClick={() => onAccept?.(friendshipId)} 
              disabled={isProcessing}
              className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl"
            >
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
          </>
        )}

        {context === 'outgoing_request' && (
          <Button disabled variant="outline" className="text-slate-500 rounded-xl">
            <Clock className="w-4 h-4 mr-2" /> Pending
          </Button>
        )}

        {context === 'friends' && friendshipId && (
          <Button 
            onClick={() => onRemove?.(friendshipId)} 
            disabled={isProcessing}
            variant="ghost" 
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 w-full sm:w-auto rounded-xl"
          >
            <UserMinus className="w-4 h-4 mr-2" /> Remove
          </Button>
        )}
      </div>
    </div>
  )
})
