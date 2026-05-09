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

export default function DashboardPage() {
  const { profile } = useUserStore()
  const supabase = createClient()

  const [stats, setStats] = useState({ activePlans: 0, upcomingTrips: 0, friends: 0, groups: 0 })
  const [recentPlans, setRecentPlans] = useState<any[]>([])
  const [upcomingEvent, setUpcomingEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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
        if (groupIds.length > 0) {
          // 4. Fetch Plans for these groups
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
  }, [profile?.id, supabase]);

  const summaryCards = [
    { title: "Active Plans", value: stats.activePlans.toString(), color: "bg-blue-50 text-blue-600" },
    { title: "Upcoming Trips", value: stats.upcomingTrips.toString(), color: "bg-teal-50 text-[#1D9E75]" },
    { title: "Friends", value: stats.friends.toString(), color: "bg-purple-50 text-purple-600" },
    { title: "Groups", value: stats.groups.toString(), color: "bg-orange-50 text-orange-600" },
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Traveler"} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-lg">Ready for your next adventure?</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/plans/new">
            <button className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#15805e] text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm">
              <Plus className="w-5 h-5" />
              New plan
            </button>
          </Link>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${card.color}`}>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-xl font-bold">{card.value}</span>
              )}
            </div>
            <p className="text-slate-500 font-medium text-sm">{card.title}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent plans</h2>
            <Link href="/plans" className="text-[#1D9E75] font-medium text-sm flex items-center hover:underline">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading plans...</div>
            ) : recentPlans.length === 0 ? (
              <div className="bg-white border border-slate-100 border-dashed rounded-3xl p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                  <Compass className="w-8 h-8 text-[#1D9E75]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No plans yet!</h3>
                <p className="text-slate-500 max-w-sm mb-6">Create a group and start planning your very first trip.</p>
                <Link href="/plans/new">
                  <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-800">
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
                    transition={{ delay: 0.2 + (idx * 0.1) }}
                    className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col sm:flex-row gap-4 items-center group hover:border-[#1D9E75]/30 hover:shadow-md transition-all cursor-pointer mb-4"
                  >
                    <div className="w-full sm:w-24 h-32 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                      {plan.group?.cover_image_url ? (
                        <img src={plan.group.cover_image_url} alt={plan.destination_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-teal-400 to-emerald-600 opacity-80" />
                      )}
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg text-slate-900">{plan.destination_name || "Mystery Destination"}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                          plan.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          plan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-slate-400" />
                          {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-400" />
                          {plan.group?.group_members?.length || 0} members
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
          <h2 className="text-xl font-bold text-slate-900">Upcoming events</h2>
          
          {isLoading ? (
             <div className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
          ) : upcomingEvent ? (
            <Link href={`/plans/${upcomingEvent.id}`}>
              <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#1D9E75] rounded-full blur-3xl opacity-20 -mr-10 -mt-10 group-hover:opacity-40 transition-opacity"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm mb-4">
                    <Clock className="w-4 h-4" />
                    In {getDaysUntil(upcomingEvent.start_date)} days
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{upcomingEvent.destination_name || "Upcoming Trip"}</h3>
                  <p className="text-slate-400 text-sm flex items-center gap-2 mb-6">
                    <MapPin className="w-4 h-4" />
                    {formatDate(upcomingEvent.start_date)}
                  </p>
                  
                  <div className="flex -space-x-2">
                    {upcomingEvent.group?.group_members?.slice(0, 3).map((member: any, i: number) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden">
                        {member.user?.avatar_url ? (
                          <img src={member.user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          member.user?.full_name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                    ))}
                    {(upcomingEvent.group?.group_members?.length || 0) > 3 && (
                      <div className="w-8 h-8 rounded-full bg-[#1D9E75] border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white">
                        +{(upcomingEvent.group?.group_members?.length || 0) - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No upcoming events scheduled.</p>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm shadow-slate-200/50 space-y-4">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <Link href="/groups" className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Create group</p>
                <p className="text-xs text-slate-500">Plan with multiple people</p>
              </div>
            </Link>
            <Link href="/friends" className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Add friend</p>
                <p className="text-xs text-slate-500">Connect to plan together</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
