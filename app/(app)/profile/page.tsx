"use client"

import React, { useState } from "react"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { MapPin, Users, Palmtree, Map, Edit2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EditProfileSheet } from "@/components/shared/EditProfileSheet"

export default function ProfilePage() {
  const { profile } = useUserStore()
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Mocked stats
  const stats = [
    { label: "Friends", value: 12, icon: Users },
    { label: "Groups", value: 4, icon: Palmtree },
    { label: "Trips Completed", value: 7, icon: Map },
  ]

  // Mocked trip memories
  const tripMemories = [
    { id: 1, destination: "Bali", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=400&auto=format&fit=crop", date: "Jan 2026" },
    { id: 2, destination: "Swiss Alps", image: "https://images.unsplash.com/photo-1531366936337-77ba9a6f8485?q=80&w=400&auto=format&fit=crop", date: "Dec 2025" },
    { id: 3, destination: "Tokyo", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=400&auto=format&fit=crop", date: "Oct 2025" },
    { id: 4, destination: "Santorini", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop", date: "Jul 2025" },
  ]

  return (
    <div className="pb-12 max-w-4xl mx-auto space-y-8">
      {/* Cover & Header */}
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm shadow-slate-200/50">
        <div className="h-48 bg-gradient-to-r from-teal-400 via-[#1D9E75] to-emerald-600 relative group cursor-pointer">
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium flex items-center gap-2">
              <Camera className="w-5 h-5" /> Edit Cover
            </span>
          </div>
        </div>
        
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-16 sm:-mt-20 mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-100 shadow-md relative overflow-hidden flex-shrink-0 z-10">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400 bg-slate-200">
                  {profile?.full_name?.charAt(0) || "U"}
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {profile?.full_name || "New User"}
                </h1>
                <p className="text-slate-500 font-medium">@{profile?.username || "username"}</p>
              </div>
              <Button 
                onClick={() => setIsEditSheetOpen(true)}
                variant="outline" 
                className="rounded-xl border-slate-200 hover:bg-slate-50 font-semibold"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {profile?.bio && (
              <p className="text-slate-700 max-w-2xl">{profile.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
              {(profile?.city || profile?.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1D9E75]" />
                  {profile.city}{profile.city && profile.country ? ", " : ""}{profile.country}
                </div>
              )}
            </div>

            {profile?.travel_preferences && (
              <div className="flex flex-wrap gap-2">
                {[...(profile.travel_preferences.budget || []), ...(profile.travel_preferences.style || []), ...(profile.travel_preferences.company || [])].map((pref, i) => (
                  <Badge key={i} variant="secondary" className="bg-teal-50 text-[#1D9E75] hover:bg-teal-100 border-none rounded-lg px-3 py-1">
                    {pref}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col items-center justify-center text-center">
              <Icon className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Trip Memories (Mocked) */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Recent Trip Memories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tripMemories.map((memory, i) => (
            <motion.div 
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] cursor-pointer"
            >
              <img src={memory.image} alt={memory.destination} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
              <div className="absolute bottom-0 left-0 p-4 w-full">
                <p className="text-white font-bold text-lg">{memory.destination}</p>
                <p className="text-white/80 text-xs font-medium">{memory.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} />
    </div>
  )
}
