import React, { memo, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Check, X, UserMinus, UserPlus, Clock } from "lucide-react"
import { motion } from "framer-motion"

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
  const [avatarError, setAvatarError] = useState(false)
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ 
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
      className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col sm:flex-row gap-4 items-center justify-between transition-colors duration-500"
    >
      <div className="flex items-center gap-4 text-left w-full">
        <div className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden transition-colors duration-500">
          {user.avatar_url && !avatarError ? (
            <Image 
              src={user.avatar_url} 
              alt={user.full_name} 
              width={56}
              height={56}
              className="w-full h-full object-cover" 
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-xl font-black text-white uppercase select-none bg-gradient-to-br ${((name) => {
              if (!name) return "from-indigo-500 to-purple-600";
              let hash = 0;
              for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
              }
              const gradients = [
                "from-indigo-500 to-purple-600",
                "from-teal-400 to-emerald-600",
                "from-blue-500 to-cyan-600",
                "from-orange-400 to-rose-600",
                "from-pink-500 to-rose-600",
                "from-purple-500 to-fuchsia-600"
              ];
              return gradients[Math.abs(hash) % gradients.length];
            })(user.full_name)}`}>
              {((name) => {
                if (!name) return "?";
                const parts = name.trim().split(/\s+/);
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return parts[0].substring(0, 2).toUpperCase();
              })(user.full_name)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white truncate transition-colors duration-500">{user.full_name}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate transition-colors duration-500">@{user.username}</p>
          {(user.city || user.country) && (
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1 transition-colors duration-500">
              <MapPin className="w-3 h-3 text-rose-400" />
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
            className="bg-[#1D9E75] hover:bg-[#15805e] w-full sm:w-auto rounded-xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
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
              className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4 mr-1" /> Decline
            </Button>
            <Button 
              onClick={() => onAccept?.(friendshipId)} 
              disabled={isProcessing}
              className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl shadow-sm hover:shadow cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
          </>
        )}

        {context === 'outgoing_request' && (
          <Button disabled variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 rounded-xl">
            <Clock className="w-4 h-4 mr-2" /> Pending
          </Button>
        )}

        {context === 'friends' && friendshipId && (
          <Button 
            onClick={() => onRemove?.(friendshipId)} 
            disabled={isProcessing}
            variant="ghost" 
            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 w-full sm:w-auto rounded-xl cursor-pointer"
          >
            <UserMinus className="w-4 h-4 mr-2" /> Remove
          </Button>
        )}
      </div>
    </motion.div>
  )
})
