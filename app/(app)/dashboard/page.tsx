"use client"

import React from "react"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { 
  Plus, 
  Users, 
  UserPlus, 
  CalendarDays,
  MapPin,
  Clock,
  ChevronRight
} from "lucide-react"

export default function DashboardPage() {
  const { profile } = useUserStore()

  const summaryCards = [
    { title: "Active Plans", value: "3", color: "bg-blue-50 text-blue-600" },
    { title: "Upcoming Trips", value: "1", color: "bg-teal-50 text-[#1D9E75]" },
    { title: "Friends", value: "12", color: "bg-purple-50 text-purple-600" },
    { title: "Groups", value: "4", color: "bg-orange-50 text-orange-600" },
  ]

  const recentPlans = [
    { id: 1, destination: "Goa, India", dates: "Dec 15 - Dec 20", status: "Voting", members: 4, cover: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=300&auto=format&fit=crop" },
    { id: 2, destination: "Bali, Indonesia", dates: "Jan 10 - Jan 24", status: "Confirmed", members: 2, cover: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=300&auto=format&fit=crop" },
    { id: 3, destination: "Kyoto, Japan", dates: "Mar 05 - Mar 15", status: "Draft", members: 1, cover: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=300&auto=format&fit=crop" },
  ]

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
          <button className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#15805e] text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            New plan
          </button>
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
              <span className="text-xl font-bold">{card.value}</span>
            </div>
            <p className="text-slate-500 font-medium text-sm">{card.title}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent plans</h2>
            <button className="text-[#1D9E75] font-medium text-sm flex items-center hover:underline">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="space-y-4">
            {recentPlans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (idx * 0.1) }}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col sm:flex-row gap-4 items-center group hover:border-[#1D9E75]/30 hover:shadow-md transition-all cursor-pointer"
              >
                <img src={plan.cover} alt={plan.destination} className="w-full sm:w-24 h-32 sm:h-24 rounded-2xl object-cover" />
                <div className="flex-1 w-full">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-slate-900">{plan.destination}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      plan.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                      plan.status === 'Voting' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {plan.dates}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      {plan.members} members
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Upcoming events</h2>
          
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1D9E75] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm mb-4">
                <Clock className="w-4 h-4" />
                In 14 days
              </div>
              <h3 className="text-2xl font-bold mb-2">Bali Retreat</h3>
              <p className="text-slate-400 text-sm flex items-center gap-2 mb-6">
                <MapPin className="w-4 h-4" />
                Denpasar, Indonesia
              </p>
              
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-bold">
                    U{i}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm shadow-slate-200/50 space-y-4">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Create group</p>
                <p className="text-xs text-slate-500">Plan with multiple people</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Add friend</p>
                <p className="text-xs text-slate-500">Connect to plan together</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
