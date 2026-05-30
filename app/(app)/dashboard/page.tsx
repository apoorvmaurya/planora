"use client"

import React, { useEffect, useState } from "react"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { 
  Plus, 
  Users, 
  UserPlus, 
  CalendarDays,
  MapPin,
  Clock,
  ChevronRight,
  Map,
  Compass
} from "lucide-react"
import { ScenicImage } from "@/components/shared/ScenicImage"

export default function DashboardPage() {
  const { profile } = useUserStore()
  const supabase = createClient()

  const [stats, setStats] = useState({ activePlans: 0, upcomingTrips: 0, friends: 0, groups: 0 })
  const [recentPlans, setRecentPlans] = useState<any[]>([])
  const [upcomingEvent, setUpcomingEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }))
  }

  const handleAvatarError = (userId: string) => {
    setAvatarErrors(prev => ({ ...prev, [userId]: true }))
  }

  useEffect(() => {
    async function loadData() {
      if (!profile?.id) return;

      try {
        // 1. Fetch Friends Count
        const { count: friendsCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)
          .eq('status', 'accepted');

        // 2. Fetch Groups Count
        const { count: groupsCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        // 3. Fetch User's Group IDs
        const { data: memberGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', profile.id);
          
        const groupIds = memberGroups?.map(g => g.group_id) || [];

        let plans: any[] = [];

        // Fetch group plans
        if (groupIds.length > 0) {
          const { data } = await supabase
            .from('plans')
            .select(`
              id, destination_name, start_date, end_date, status, created_at,
              group:groups(cover_image_url, group_members(user:profiles(avatar_url, full_name)))
            `)
            .in('group_id', groupIds)
            .order('created_at', { ascending: false });
            
          plans = data || [];
        }

        // Fetch solo plans (group_id is null, created by this user)
        const { data: soloPlans } = await supabase
          .from('plans')
          .select(`
            id, destination_name, start_date, end_date, status, created_at
          `)
          .is('group_id', null)
          .eq('created_by', profile.id)
          .order('created_at', { ascending: false });

        if (soloPlans && soloPlans.length > 0) {
          plans = [...plans, ...soloPlans];
          plans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        const activePlans = plans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
        
        const today = new Date();
        const upcomingTripsList = plans.filter(p => p.start_date && new Date(p.start_date) > today && p.status !== 'cancelled');
        
        upcomingTripsList.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        const closestEvent = upcomingTripsList.length > 0 ? upcomingTripsList[0] : null;

        setStats({
          activePlans: activePlans.length,
          upcomingTrips: upcomingTripsList.length,
          friends: friendsCount || 0,
          groups: groupsCount || 0
        });

        setRecentPlans(plans.slice(0, 3));
        setUpcomingEvent(closestEvent);

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const summaryCards = [
    { 
      title: "Active Plans", 
      value: stats.activePlans.toString(), 
      color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30", 
      hoverRing: "hover:border-blue-400/40 hover:shadow-blue-950/10",
      icon: Map 
    },
    { 
      title: "Upcoming Trips", 
      value: stats.upcomingTrips.toString(), 
      color: "bg-teal-50 dark:bg-teal-950/20 text-[#1D9E75] dark:text-teal-400 border-teal-100 dark:border-teal-900/30", 
      hoverRing: "hover:border-teal-400/40 hover:shadow-teal-950/10",
      icon: Compass 
    },
    { 
      title: "Friends", 
      value: stats.friends.toString(), 
      color: "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30", 
      hoverRing: "hover:border-purple-400/40 hover:shadow-purple-950/10",
      icon: UserPlus 
    },
    { 
      title: "Groups", 
      value: stats.groups.toString(), 
      color: "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30", 
      hoverRing: "hover:border-orange-400/40 hover:shadow-orange-950/10",
      icon: Users 
    },
  ]
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBD";
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Traveler"} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg transition-colors duration-500">Ready for your next adventure?</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/plans/new">
            <button className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#15805e] text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer duration-300">
              <Plus className="w-5 h-5" />
              New plan
            </button>
          </Link>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => {
          const IconComponent = card.icon
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25,
                delay: idx * 0.05 
              }}
              className={`bg-white dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md ${card.hoverRing} transition-all duration-300 cursor-pointer flex flex-col justify-between h-36`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color} border transition-all duration-300`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-700 border-t-[#1D9E75] rounded-full animate-spin" />
                ) : (
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {card.value}
                  </span>
                )}
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide uppercase text-xs">
                  {card.title}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Planora collaborative metrics
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white transition-colors duration-500">Recent plans</h2>
            <Link href="/plans" className="text-[#1D9E75] dark:text-teal-400 font-bold text-sm flex items-center hover:underline transition-colors duration-500">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading plans...</div>
            ) : recentPlans.length === 0 ? (
              <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 border-dashed rounded-3xl p-10 text-center flex flex-col items-center transition-colors duration-500">
                <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/30 rounded-full flex items-center justify-center mb-4 transition-colors duration-500">
                  <Compass className="w-8 h-8 text-[#1D9E75] dark:text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-500">No plans yet!</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 transition-colors duration-500">Create a group and start planning your very first trip.</p>
                <Link href="/plans/new">
                  <button className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer transition-colors duration-500">
                    Start a Trip
                  </button>
                </Link>
              </div>
            ) : (
              recentPlans.map((plan, idx) => (
                <Link key={plan.id} href={`/plans/${plan.id}`}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.015, x: 4 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      delay: 0.1 + (idx * 0.05) 
                    }}
                    className="bg-white dark:bg-slate-900/40 backdrop-blur-md p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center group hover:border-[#1D9E75]/40 dark:hover:border-teal-500/40 hover:shadow-md dark:hover:shadow-teal-950/10 transition-all duration-300 cursor-pointer mb-4"
                  >
                    <div className="w-full sm:w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/85 shrink-0 transition-colors duration-500 relative">
                      <ScenicImage 
                        destination={plan.destination_name}
                        alt={plan.destination_name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        fill
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white group-hover:text-[#1D9E75] dark:group-hover:text-teal-400 transition-colors duration-300">{plan.destination_name || "Mystery Destination"}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border transition-all duration-300 ${
                          plan.status === 'confirmed' ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                          plan.status === 'completed' ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                          plan.status === 'cancelled' ? 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20 text-red-600 dark:text-red-400' :
                          'bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/20 text-slate-500 dark:text-slate-400'
                        }`}>
                          {plan.status || 'draft'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 transition-colors duration-550">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <span className="font-medium">{mounted ? `${formatDate(plan.start_date)} - ${formatDate(plan.end_date)}` : ""}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <span className="font-medium">{plan.group?.group_members?.length || 1} members</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white transition-colors duration-500">Upcoming events</h2>
          
          {isLoading ? (
             <div className="h-48 bg-slate-100 dark:bg-slate-900/50 border dark:border-slate-800 rounded-3xl animate-pulse" />
          ) : upcomingEvent ? (
            <Link href={`/plans/${upcomingEvent.id}`}>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="bg-slate-900 dark:bg-gradient-to-br dark:from-[#0b1b17] dark:via-slate-900 dark:to-slate-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group border border-transparent dark:border-slate-800/80 cursor-pointer transition-all duration-550"
              >
                {/* Glowing Premium Aurora Layers */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-[#1D9E75] rounded-full blur-[90px] opacity-20 -mr-12 -mt-12 group-hover:opacity-35 group-hover:scale-110 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500 rounded-full blur-[80px] opacity-10 -ml-12 -mb-12 group-hover:opacity-20 transition-all duration-700"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-teal-400 dark:text-teal-350 font-bold text-sm mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 dark:bg-teal-400/10 border border-teal-500/20 text-xs uppercase tracking-wider font-extrabold">
                      <Clock className="w-3.5 h-3.5" />
                      {mounted ? `In ${getDaysUntil(upcomingEvent.start_date)} days` : "Upcoming"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black mb-2 text-white group-hover:text-teal-300 transition-colors duration-300 tracking-tight">{upcomingEvent.destination_name || "Upcoming Trip"}</h3>
                  <p className="text-slate-300 dark:text-slate-400 text-sm flex items-center gap-2 mb-6 font-medium">
                    <MapPin className="w-4 h-4 text-teal-400" />
                    {mounted ? formatDate(upcomingEvent.start_date) : ""}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-white/10 dark:border-slate-800/60 pt-4 mt-2">
                    <div className="flex -space-x-2">
                      {upcomingEvent.group?.group_members?.slice(0, 3).map((member: any, i: number) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden shadow-sm">
                          {member.user?.avatar_url && !avatarErrors[member.user.id] ? (
                            <img 
                              src={member.user.avatar_url} 
                              alt="Profile" 
                              className="w-full h-full object-cover" 
                              onError={() => handleAvatarError(member.user.id)}
                            />
                          ) : (
                            member.user?.full_name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                      ))}
                      {(upcomingEvent.group?.group_members?.length || 0) > 3 && (
                        <div className="w-8 h-8 rounded-full bg-[#1D9E75] border-2 border-slate-900 flex items-center justify-center text-xs font-black text-white shadow-sm">
                          +{(upcomingEvent.group?.group_members?.length || 0) - 3}
                        </div>
                      )}
                    </div>
                    
                    <span className="text-xs text-teal-400 font-extrabold flex items-center gap-1 group-hover:translate-x-1 transition-transform duration-300">
                      View itinerary <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-8 text-center transition-colors duration-500">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm transition-colors duration-500">No upcoming events scheduled.</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 transition-all duration-550">
            <h3 className="font-extrabold text-slate-900 dark:text-white tracking-tight border-b border-slate-100 dark:border-slate-800/60 pb-3 transition-colors duration-500">Quick Actions</h3>
            <Link href="/groups" className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/30 border border-transparent hover:border-slate-100 dark:hover:border-slate-800/80 transition-all text-left group">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/25 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-108 group-hover:rotate-3 transition-all duration-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white transition-colors duration-500">Create group</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-500">Plan with multiple people</p>
              </div>
            </Link>
            <Link href="/friends" className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/30 border border-transparent hover:border-slate-100 dark:hover:border-slate-800/80 transition-all text-left group">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/25 border border-purple-100 dark:border-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-108 group-hover:rotate-3 transition-all duration-300">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white transition-colors duration-500">Add friend</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-500">Connect to plan together</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
