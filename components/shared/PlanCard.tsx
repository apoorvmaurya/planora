"use client"

import React, { memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { CalendarDays, MapPin, Share2, PenSquare, ArrowRight, Wallet, Users } from "lucide-react"

export type PlanCardProps = {
  plan: {
    id: string
    title: string
    destination_name: string
    start_date: string
    end_date: string
    status: string
    budget_total: number
    currency: string
    group: {
      name: string
      group_members: Array<{
        user: { full_name: string; avatar_url: string }
      }>
    }
  }
  onShare?: (id: string) => void
}

export const PlanCard = memo(function PlanCard({ plan, onShare }: PlanCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600'
      case 'confirmed': return 'bg-teal-100 text-[#1D9E75]'
      case 'completed': return 'bg-purple-100 text-purple-700'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getCountdown = (startDate: string, endDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    
    if (today > end) return "Completed"
    if (today >= start && today <= end) return "In Progress"
    
    const diffTime = start.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return `${diffDays} days to go`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const coverUrl = `https://image.pollinations.ai/prompt/beautiful%20scenic%20travel%20destination%20${encodeURIComponent(plan.destination_name.split(',')[0])}?width=800&height=600&nologo=true`
  
  // Safety checks for nested group arrays
  const members = plan.group?.group_members || []

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden flex flex-col transition-all hover:shadow-md"
    >
      <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Image 
          src={coverUrl} 
          alt={plan.destination_name}
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getStatusColor(plan.status)} backdrop-blur-md`}>
            {plan.status}
          </span>
        </div>
 
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-bold text-xl line-clamp-1">{plan.title}</h3>
          <div className="flex items-center gap-1 text-sm text-white/85 mt-1">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span className="line-clamp-1">{plan.destination_name}</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
            <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
            {getCountdown(plan.start_date, plan.end_date)}
          </span>
        </div>

        <div className="space-y-3 mb-6 flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> {plan.group?.name || 'Solo Trip'}</span>
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m: any, i: number) => (
                <Image 
                  key={i} 
                  src={m.user?.avatar_url || `https://ui-avatars.com/api/?name=${m.user?.full_name}`} 
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 object-cover bg-slate-100 dark:bg-slate-800" 
                  alt={m.user?.full_name || "Avatar"} 
                  width={24}
                  height={24}
                />
              ))}
              {members.length > 4 && (
                <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  +{members.length - 4}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400" /> Budget</span>
            <span className="font-semibold text-slate-900 dark:text-slate-150">{plan.budget_total} {plan.currency}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
          {plan.status === 'draft' ? (
            <Link 
              href={`/plans/${plan.id}/edit`} 
              className="flex-1 w-full py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <PenSquare className="w-4 h-4" /> Edit Draft
            </Link>
          ) : (
            <Link 
              href={`/plans/${plan.id}`} 
              className="flex-1 w-full py-2 bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 text-[#1D9E75] text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              View Plan <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {onShare && (
            <button 
              onClick={(e) => { e.preventDefault(); onShare(plan.id); }}
              className="p-2 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl transition-all duration-200 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
})
