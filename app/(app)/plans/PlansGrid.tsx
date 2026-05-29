"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Map, Calendar, Compass, ListTodo } from "lucide-react"
import { PlanCard } from "@/components/shared/PlanCard"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type PlansGridProps = {
  plans: any[]
}

export function PlansGrid({ plans }: PlansGridProps) {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")

  const filters = ["All", "Upcoming", "In Progress", "Completed", "Drafts"]

  const filteredPlans = plans.filter(plan => {
    // 1. Search filter
    const matchesSearch = 
      plan.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      plan.destination_name.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    // 2. Tab filter
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(plan.start_date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(plan.end_date)
    end.setHours(0, 0, 0, 0)

    if (activeFilter === "Drafts") return plan.status === "draft"
    if (activeFilter === "Completed") return plan.status === "completed" || today > end
    if (activeFilter === "In Progress") return today >= start && today <= end
    if (activeFilter === "Upcoming") return plan.status === "confirmed" && today < start
    
    return true
  })

  const handleShare = (id: string) => {
    const plan = plans.find(p => p.id === id)
    if (plan?.share_token) {
      const url = `${window.location.origin}/share/${plan.share_token}`
      navigator.clipboard.writeText(url)
      toast.success("Public link copied to clipboard!")
    } else {
      toast.error("This plan doesn&apos;t have a share link yet.")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex overflow-x-auto pb-2 sm:pb-0 hide-scrollbar gap-2">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                activeFilter === filter 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md' 
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input 
            placeholder="Search plans..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500"
          />
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredPlans.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-500"
          >
            <div className="w-20 h-20 mx-auto bg-teal-50 dark:bg-teal-950/20 text-[#1D9E75] dark:text-teal-400 rounded-full flex items-center justify-center mb-6 transition-colors duration-500">
              {activeFilter === 'Drafts' ? <ListTodo className="w-10 h-10" /> : 
               activeFilter === 'Completed' ? <Map className="w-10 h-10" /> :
               <Compass className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-550">No {activeFilter.toLowerCase()} plans found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 transition-colors duration-500">
              {searchQuery ? "Try adjusting your search terms." : "Ready for your next adventure? Start planning a new trip with your group."}
            </p>
            <Link href="/plans/new" className="inline-flex shrink-0 items-center justify-center bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl px-8 h-12 text-sm font-medium transition-all shadow-md shadow-teal-500/10">
              Create New Plan
            </Link>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} onShare={handleShare} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
