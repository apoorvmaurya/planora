"use client"

import React, { useState, useEffect } from "react"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { MapPin, Users, Palmtree, Map, Edit2, Camera, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EditProfileSheet } from "@/components/shared/EditProfileSheet"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function ProfilePage() {
  const { profile } = useUserStore()
  const supabase = createClient()
  
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [stats, setStats] = useState({ friends: 0, groups: 0, tripsCompleted: 0 })
  const [tripMemories, setTripMemories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProfileData() {
      if (!profile?.id) return;

      try {
        // Fetch Friends Count
        const { count: friendsCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)
          .eq('status', 'accepted');

        // Fetch Groups Count
        const { count: groupsCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        // Fetch User's Group IDs to get plans
        const { data: memberGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', profile.id);
          
        const groupIds = memberGroups?.map(g => g.group_id) || [];
        let tripsCompleted = 0;

        if (groupIds.length > 0) {
          const { count: plansCount } = await supabase
            .from('plans')
            .select('*', { count: 'exact', head: true })
            .in('group_id', groupIds)
            .eq('status', 'completed');
            
          tripsCompleted = plansCount || 0;
        }

        // Fetch Trip Memories
        // RLS ensures the user only sees memories from groups they belong to!
        const { data: memories } = await supabase
          .from('trip_memories')
          .select('id, photo_url, created_at, plan:plans(destination_name)')
          .order('created_at', { ascending: false })
          .limit(12);

        setStats({
          friends: friendsCount || 0,
          groups: groupsCount || 0,
          tripsCompleted: tripsCompleted
        });
        
        setTripMemories(memories || []);

      } catch (err) {
        console.error("Failed to load profile data", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfileData();
  }, [profile?.id, supabase]);

  const statItems = [
    { label: "Friends", value: stats.friends, icon: Users },
    { label: "Groups", value: stats.groups, icon: Palmtree },
    { label: "Trips Completed", value: stats.tripsCompleted, icon: Map },
  ]
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

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
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400 bg-slate-200 uppercase">
                  {profile?.full_name?.charAt(0) || "U"}
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {profile?.full_name || "New Traveler"}
                </h1>
                <p className="text-slate-500 font-medium">@{profile?.username || "traveler"}</p>
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
        {statItems.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col items-center justify-center text-center">
              <Icon className="w-6 h-6 text-slate-400 mb-2" />
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin text-slate-400 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              )}
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Trip Memories */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Recent Trip Memories</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : tripMemories.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-100 border-dashed text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-[#1D9E75]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No memories yet</h3>
            <p className="text-slate-500 max-w-sm mb-6">Capture moments from your trips and they will appear here as a beautiful gallery.</p>
            <Link href="/plans">
              <Button className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl text-white font-semibold">
                Go to Plans
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tripMemories.map((memory, i) => (
              <motion.div 
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-2xl overflow-hidden aspect-[4/5] cursor-pointer"
              >
                <img src={memory.photo_url} alt={memory.plan?.destination_name || "Memory"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 p-4 w-full">
                  <p className="text-white font-bold text-lg leading-tight line-clamp-2">
                    {memory.plan?.destination_name || "Memory"}
                  </p>
                  <p className="text-white/80 text-xs font-medium mt-1">
                    {formatDate(memory.created_at)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} />
    </div>
  )
}
