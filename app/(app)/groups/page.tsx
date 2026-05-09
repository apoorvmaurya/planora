"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateGroupModal } from "@/components/shared/CreateGroupModal"

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch('/api/groups')
        if (res.ok) {
          setGroups(await res.json())
        }
      } catch (error) {
        console.error("Failed to fetch groups", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchGroups()
  }, [])

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Groups</h1>
          <p className="text-slate-500 mt-1 text-lg">Plan trips together with your favorite people.</p>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl h-11 px-6 shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create group
        </Button>
      </header>

      {isLoading ? (
        <p className="text-center text-slate-500 py-20">Loading groups...</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-[#1D9E75]" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No groups yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">
            Start a group to begin collaborating on itineraries, voting on dates, and tracking expenses together.
          </p>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl"
          >
            Create your first group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group, i) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#1D9E75]/30 transition-all overflow-hidden group cursor-pointer h-full flex flex-col"
              >
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                  {group.cover_image_url ? (
                    <img src={group.cover_image_url} alt={group.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-teal-400 to-emerald-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-xl text-slate-900 line-clamp-1">{group.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 flex-1">
                    {group.description || "No description provided."}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {group.group_members?.slice(0, 3).map((member: any) => (
                        <div key={member.user_id} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                          {member.user?.avatar_url ? (
                            <img src={member.user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            member.user?.full_name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                      ))}
                      {(group.group_members?.length || 0) > 3 && (
                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                          +{(group.group_members?.length || 0) - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#1D9E75] bg-teal-50 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      <CreateGroupModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  )
}
