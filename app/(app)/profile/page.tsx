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
import { toast } from "sonner"

export default function ProfilePage() {
  const { profile, setProfile } = useUserStore()
  const supabase = createClient()
  
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [stats, setStats] = useState({ friends: 0, groups: 0, tripsCompleted: 0 })
  const [tripMemories, setTripMemories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && profile?.id) {
      const file = e.target.files[0]
      setIsUploadingCover(true)
      const toastId = toast.loading("Uploading cover image...")
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${profile.id}-${Math.random()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('profile-covers')
          .upload(fileName, file)

        if (uploadError) throw new Error("Failed to upload cover: " + uploadError.message)

        const { data: publicUrlData } = supabase.storage.from('profile-covers').getPublicUrl(fileName)
        const publicUrl = publicUrlData.publicUrl

        const { error: dbError } = await supabase
          .from('profiles')
          .update({ cover_image_url: publicUrl })
          .eq('id', profile.id)

        if (dbError) throw dbError

        // Update local Zustand store
        setProfile({
          ...profile,
          cover_image_url: publicUrl
        })

        toast.success("Cover image updated successfully!", { id: toastId })
      } catch (err: any) {
        console.error("Failed to upload cover", err)
        toast.error(err.message || "Failed to upload cover image", { id: toastId })
      } finally {
        setIsUploadingCover(false)
      }
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

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
      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800/80 shadow-sm shadow-slate-200/50 dark:shadow-none transition-colors duration-500">
        <div className="h-36 sm:h-44 md:h-48 relative group cursor-pointer overflow-hidden">
          {profile?.cover_image_url ? (
            <img src={profile.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-teal-400 via-[#16795A] to-emerald-600" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm shadow-md">
              <Camera className="w-5 h-5" /> {isUploadingCover ? "Uploading..." : "Edit Cover"}
            </span>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleCoverUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploadingCover}
          />
        </div>
        
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-16 sm:-mt-20 mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 shadow-md relative overflow-hidden flex-shrink-0 z-10 transition-colors duration-500">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 uppercase">
                  {profile?.full_name?.charAt(0) || "U"}
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
                  {profile?.full_name || "New Traveler"}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">@{profile?.username || "traveler"}</p>
              </div>
              <Button 
                onClick={() => setIsEditSheetOpen(true)}
                variant="outline" 
                className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {profile?.bio && (
              <p className="text-slate-700 dark:text-slate-300 max-w-2xl transition-colors duration-500">{profile.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              {(profile?.city || profile?.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#16795A]" />
                  {profile.city}{profile.city && profile.country ? ", " : ""}{profile.country}
                </div>
              )}
            </div>

            {profile?.travel_preferences && (
              <div className="flex flex-wrap gap-2">
                {[...(profile.travel_preferences.budget || []), ...(profile.travel_preferences.style || []), ...(profile.travel_preferences.company || [])].map((pref, i) => (
                  <Badge key={i} variant="secondary" className="bg-teal-50 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-950/45 border-none rounded-lg px-3 py-1 transition-colors duration-500">
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
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col items-center justify-center text-center transition-colors duration-500">
              <Icon className="w-6 h-6 text-slate-400 mb-2" />
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin text-slate-400 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-500">{stat.value}</p>
              )}
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Trip Memories */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Recent Trip Memories</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-100 dark:bg-slate-800/80 animate-pulse" />
            ))}
          </div>
        ) : tripMemories.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-12 border border-slate-100 dark:border-slate-800 border-dashed text-center flex flex-col items-center transition-colors duration-500">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/20 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-[#16795A] dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-500">No memories yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 transition-colors duration-500">Capture moments from your trips and they will appear here as a beautiful gallery.</p>
            <Link href="/plans">
              <Button className="bg-[#16795A] hover:bg-[#115E46] rounded-xl text-white font-semibold shadow-md shadow-teal-500/20">
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
                    {mounted ? formatDate(memory.created_at) : ""}
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
