"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogClose } from "@/components/ui/alert-dialog"
import { Map, Calendar, Users, DollarSign, Train, Plane, Bus, MessageSquare, Loader2, Wallet, Camera, Bell, PenSquare, Trash2, XCircle, CheckCircle2, Share2, UserMinus, Sparkles, Plus, Shield } from "lucide-react"
import { toast } from "sonner"
import { ItineraryItemCard } from "@/components/shared/ItineraryItemCard"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { ErrorState } from "@/components/shared/ErrorState"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from "next/image"
import confetti from "canvas-confetti"
import { ScenicImage } from "@/components/shared/ScenicImage"
import dynamic from "next/dynamic"
import { syncOfflineOps, queueOfflineOp, offlineDB } from "@/lib/supabase/offlineSync"

const MapComponent = dynamic(
  () => import("@/components/shared/MapComponent").then((mod) => mod.MapComponent),
  { ssr: false }
)

export default function PlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.planId as string
  const supabase = createClient()
  const { profile } = useUserStore()
  
  const [plan, setPlan] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [votes, setVotes] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [transitLoading, setTransitLoading] = useState<Record<string, boolean>>({})
  const [transitOptions, setTransitOptions] = useState<Record<string, any>>({})
  const [transitAdding, setTransitAdding] = useState<Record<string, boolean>>({})
  
  // Home City Inline Update States
  const [homeCityInput, setHomeCityInput] = useState("")
  const [isEditingCity, setIsEditingCity] = useState(false)
  const [isSavingCity, setIsSavingCity] = useState(false)

  // AlertDialog state
  const [kickTarget, setKickTarget] = useState<any>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [adminSheetOpen, setAdminSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])



  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) return;
      
      try {
        const { data: pData, error: pErr } = await supabase.from('plans').select('*, groups(*)').eq('id', planId).single()
        if (pErr || !pData) throw new Error("Plan not found");
 
        setPlan(pData)
        setGroup(pData.groups)
        await offlineDB.plans.put({ id: planId, data: pData })
        
        const { data: iData } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
        const itemsList = iData || []
        setItems(itemsList)
        await offlineDB.items.put({ id: planId, planId, data: itemsList })
        
        const { data: vData } = await supabase.from('member_votes').select('*').eq('plan_id', planId)
        const votesList = vData || []
        setVotes(votesList)
        await offlineDB.votes.put({ id: planId, planId, data: votesList })
 
        if (pData.group_id) {
          const { data: mData } = await supabase.from('group_members').select('role, user:profiles(*)').eq('group_id', pData.group_id)
          setMembers(mData || [])
        } else {
          setMembers([])
        }
      } catch (err) {
        console.warn("Offline or network failed, loading from local cache:", err)
        const localPlan = await offlineDB.plans.get(planId)
        if (localPlan) {
          setPlan(localPlan.data)
          setGroup(localPlan.data.groups)
          
          if (localPlan.data.group_id) {
            const { data: mData } = await supabase.from('group_members').select('role, user:profiles(*)').eq('group_id', localPlan.data.group_id)
            if (mData) setMembers(mData)
          }
        }
        
        const localItems = await offlineDB.items.get(planId)
        if (localItems) setItems(localItems.data)
 
        const localVotes = await offlineDB.votes.get(planId)
        if (localVotes) setVotes(localVotes.data)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, profile?.id])
 
  useEffect(() => {
    if (!profile?.id) return
 
    const itemsChannel = supabase.channel(`items_${planId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_items', filter: `plan_id=eq.${planId}` }, async () => {
        const { data } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
        if (data) {
          setItems(data)
          await offlineDB.items.put({ id: planId, planId, data })
        }
      }).subscribe()
 
    const votesChannel = supabase.channel(`votes_${planId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_votes', filter: `plan_id=eq.${planId}` }, async () => {
        const { data } = await supabase.from('member_votes').select('*').eq('plan_id', planId)
        if (data) {
          setVotes(data)
          await offlineDB.votes.put({ id: planId, planId, data })
        }
      }).subscribe()
 
    const roomOne = supabase.channel(`presence_${planId}`, {
      config: { presence: { key: profile.id } },
    })
 
    roomOne
      .on('presence', { event: 'sync' }, () => {
        const state = roomOne.presenceState()
        const users = Object.keys(state).map(key => state[key][0] as any)
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomOne.track({ id: profile.id, name: profile.full_name, avatar_url: profile.avatar_url })
        }
      })
 
    const handleOnline = () => {
      syncOfflineOps(planId, async () => {
        const { data: iData } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
        if (iData) {
          setItems(iData)
          await offlineDB.items.put({ id: planId, planId, data: iData })
        }
        const { data: vData } = await supabase.from('member_votes').select('*').eq('plan_id', planId)
        if (vData) {
          setVotes(vData)
          await offlineDB.votes.put({ id: planId, planId, data: vData })
        }
      })
    }
 
    window.addEventListener('online', handleOnline)
    
    if (navigator.onLine) {
      handleOnline()
    }
 
    return () => {
      supabase.removeChannel(itemsChannel)
      supabase.removeChannel(votesChannel)
      supabase.removeChannel(roomOne)
      window.removeEventListener('online', handleOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, profile])

  const refreshItinerary = async () => {
    try {
      const { data } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
      if (data) {
        setItems(data)
        await offlineDB.items.put({ id: planId, planId, data })
      }
    } catch {
      const localItems = await offlineDB.items.get(planId)
      if (localItems) setItems(localItems.data)
    }
  }

  const handleVote = async (itemId: string, vote: string) => {
    if (!profile?.id) return

    // 1. Calculate optimistic votes state
    const existingIndex = votes.findIndex(v => v.item_id === itemId && v.user_id === profile.id)
    let newVotes = [...votes]

    if (existingIndex > -1) {
      const existing = votes[existingIndex]
      if (existing.vote === vote) {
        // Delete vote
        newVotes.splice(existingIndex, 1)
      } else {
        // Update vote
        newVotes[existingIndex] = { ...existing, vote }
      }
    } else {
      // Add vote
      newVotes.push({
        id: 'temp-id-' + Date.now(),
        plan_id: planId,
        item_id: itemId,
        user_id: profile.id,
        vote,
        created_at: new Date().toISOString()
      })
    }

    // 2. Set optimistic votes
    setVotes(newVotes)
    await offlineDB.votes.put({ id: planId, planId, data: newVotes })

    // 3. Make the API call or queue if offline
    if (!navigator.onLine) {
      await queueOfflineOp(planId, 'VOTE', { item_id: itemId, vote })
      toast.info("Offline: Vote queued for synchronization")
      return
    }

    try {
      const res = await fetch(`/api/plans/${planId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, vote })
      })

      if (res.ok) {
        // 4. Refetch official votes to keep in sync with DB and possible tie-breakers
        const { data: vData } = await supabase.from('member_votes').select('*').eq('plan_id', planId)
        if (vData) {
          setVotes(vData)
          await offlineDB.votes.put({ id: planId, planId, data: vData })
        }
        
        // Also fetch itinerary items in case a tie-breaker was triggered and the item changed!
        const { data: iData } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
        if (iData) {
          setItems(iData)
          await offlineDB.items.put({ id: planId, planId, data: iData })
        }
      } else {
        toast.error("Failed to vote")
        // Rollback on error by refetching
        const { data: vData } = await supabase.from('member_votes').select('*').eq('plan_id', planId)
        if (vData) setVotes(vData)
      }
    } catch (err) {
      // Offline fallback in case network drops during call
      await queueOfflineOp(planId, 'VOTE', { item_id: itemId, vote })
      toast.info("Network dropped. Vote queued for synchronization")
    }
  }

  const handleGenerateTransit = async (memberId: string, memberCity: string) => {
    if (!memberCity) {
      toast.error("User hasn't set their home city")
      return
    }
    setTransitLoading(prev => ({ ...prev, [memberId]: true }))
    try {
      const res = await fetch(`/api/plans/${planId}/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: memberCity, destination: plan.destination_name })
      })
      const data = await res.json()
      if (res.ok) {
        setTransitOptions(prev => ({ ...prev, [memberId]: data.options }))
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate transit")
    } finally {
      setTransitLoading(prev => ({ ...prev, [memberId]: false }))
    }
  }

  // Set initial home city from profile
  useEffect(() => {
    if (profile?.city && !homeCityInput) {
      setHomeCityInput(profile.city)
    }
  }, [profile?.city, homeCityInput])

  const handleSaveCity = async () => {
    if (!homeCityInput.trim() || !profile?.id) return
    setIsSavingCity(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ city: homeCityInput.trim() })
        .eq('id', profile.id)
        .select()
        .single()
      
      if (error) throw error
      if (data) {
        useUserStore.getState().setProfile(data)
        setMembers(prev => prev.map(m => m.user.id === profile.id ? { ...m, user: { ...m.user, city: data.city } } : m))
        setIsEditingCity(false)
        toast.success("Home city updated successfully!")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update home city")
    } finally {
      setIsSavingCity(false)
    }
  }

  const handleDeleteTransit = async (itemId: string) => {
    // Optimistically update client state immediately
    setItems(prev => {
      const next = prev.filter(i => i.id !== itemId)
      offlineDB.items.put({ id: planId, planId, data: next })
      return next
    })

    if (!navigator.onLine) {
      await queueOfflineOp(planId, 'DELETE_ITEM', { item_id: itemId })
      toast.info("Offline: Deletion queued for sync")
      return
    }

    try {
      const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId)
      if (error) throw error
      toast.success("Transit item removed from itinerary!")
    } catch (err: any) {
      toast.error(err.message || "Failed to remove transit")
      // Self-heal: roll back to official database state
      const { data } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
      if (data) {
        setItems(data)
        await offlineDB.items.put({ id: planId, planId, data })
      }
    }
  }

  if (isLoading) return <div className="text-center py-20 text-slate-500">Loading plan...</div>
  if (!plan) return <ErrorState variant="not_found" title="Plan not found" description="This plan may have been deleted or you don't have access." backHref="/plans" backLabel="Back to plans" />

  const visibleItems = items.filter(i => i.user_id === null || i.user_id === profile?.id)
  
  // Universal Chronological & Logical Self-Aware Sorting
  const sortedItems = [...visibleItems].sort((a, b) => {
    // 1. Sort by day number
    if (a.day_number !== b.day_number) {
      return a.day_number - b.day_number
    }

    // 2. Sort by time of day
    const timeOrder: Record<string, number> = {
      "Pre-trip": 0,
      "Morning": 1,
      "Afternoon": 2,
      "Evening": 3,
      "Night": 4
    }
    const weightA = timeOrder[a.time_of_day] ?? 1
    const weightB = timeOrder[b.time_of_day] ?? 1
    if (weightA !== weightB) {
      return weightA - weightB
    }

    // 3. Category logical sequencing
    const getSubRank = (item: any) => {
      const category = (item.category || "").toLowerCase()
      const title = (item.title || "").toLowerCase()
      
      if (category === 'transit' || category === 'transport') {
        const destCity = (plan?.destination_name || "").split(',')[0].toLowerCase().trim()
        const isDeparture = title.startsWith(destCity) || title.includes(`${destCity} to`)
        return isDeparture ? 100 : -100 // Arrivals on top, departures at bottom
      }
      
      if (category === 'accommodation') {
        return -50 // Hotels check-in right after arrivals
      }
      
      if (category === 'food' || category === 'restaurant') {
        return 10 // Dining relaxed events slightly lower
      }
      
      return 0 // Standard activities
    }

    const subRankA = getSubRank(a)
    const subRankB = getSubRank(b)
    if (subRankA !== subRankB) {
      return subRankA - subRankB
    }

    return (a.sort_order || 0) - (b.sort_order || 0)
  })

  const days = Array.from(new Set(sortedItems.map(i => i.day_number))).sort()
  const currentMember = members.find(m => m.user.id === profile?.id)
  const isAdmin = currentMember?.role === 'admin' || plan.created_by === profile?.id

  const gradients = [
    "from-teal-400 to-emerald-600",
    "from-blue-400 to-indigo-600",
    "from-orange-400 to-rose-600",
    "from-purple-400 to-fuchsia-600"
  ]
  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl relative overflow-hidden shadow-lg h-80 flex flex-col justify-end p-8">
        <ScenicImage 
          destination={plan.destination_name}
          alt={plan.destination_name}
          width={1200}
          height={400}
          fill
          priority
          className="object-cover opacity-60 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{plan.status}</span>
              <div className="flex -space-x-2">
                {members.slice(0, 5).map(m => (
                  <UserAvatar
                    key={m.user.id}
                    avatarUrl={m.user.avatar_url}
                    name={m.user.full_name}
                    userId={m.user.id}
                    size="w-8 h-8"
                    textSize="text-[10px]"
                    className="border-2 border-slate-900"
                  />
                ))}
              </div>
            </div>
            <h1 className="text-5xl font-extrabold mb-2">{plan.title}</h1>
            <p className="text-white/80 max-w-xl text-lg flex items-center gap-2"><Map className="w-5 h-5" /> {plan.destination_name}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href={`/plans/${planId}/chat`}>
              <Button className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6">
                <MessageSquare className="w-5 h-5 mr-2" /> Ask Planora AI
              </Button>
            </Link>
            {isAdmin && (
              <Button 
                onClick={() => setAdminSheetOpen(true)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6 lg:hidden"
              >
                <Shield className="w-5 h-5 mr-2" /> Admin Panel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <div className="w-2 h-2 rounded-full bg-[#16795A] animate-pulse" />
          <span>Live viewing:</span>
          {onlineUsers.map(u => (
            <span key={u.id} className="text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{u.name}</span>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue={days[0]?.toString() || "1"} className="w-full">
            <TabsList className="flex flex-wrap h-auto bg-transparent mb-6 gap-2">
              {days.map((dayNum: any) => (
                <TabsTrigger key={dayNum} value={dayNum.toString()} className="data-[state=active]:bg-[#16795A] data-[state=active]:text-white bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-6 py-2 transition-all duration-300 cursor-pointer">
                  Day {dayNum}
                </TabsTrigger>
              ))}
              {days.length > 0 && (
                <TabsTrigger value="map" className="data-[state=active]:bg-[#16795A] data-[state=active]:text-white bg-teal-50/50 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 rounded-full px-6 py-2 font-bold flex items-center gap-1.5 border border-teal-100 dark:border-teal-900/30 transition-all duration-300 cursor-pointer">
                  🗺️ Map View
                </TabsTrigger>
              )}
            </TabsList>
            
            {days.map((dayNum: any) => (
              <TabsContent key={dayNum} value={dayNum.toString()} className="outline-none mt-0">
                <div className="pt-2">
                  {sortedItems.filter(i => i.day_number === dayNum).map(item => (
                    <ItineraryItemCard 
                      key={item.id} 
                      item={item} 
                      votes={votes.filter(v => v.item_id === item.id)} 
                      currentUserId={profile?.id} 
                      isAdmin={isAdmin} 
                      onVote={handleVote} 
                      onUpdate={refreshItinerary}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
            {days.length > 0 && (
              <TabsContent value="map" className="outline-none mt-0">
                <div className="pt-2">
                  <MapComponent items={sortedItems} planDestination={plan.destination_name} />
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Transit Section */}
          <div className="bg-slate-50 dark:bg-slate-900/55 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 transition-colors duration-500 space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 transition-colors duration-500">Getting There</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Coordinate and Weaver your travel plans independently without cluttering the group schedule.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
              {/* Your Personal Planner */}
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 transition-colors duration-500 flex flex-col w-full min-w-0 overflow-hidden">
                <div className="w-full min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
                      ✈️
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">Your Travel Planner</h4>
                      <p className="text-xs text-slate-400">Exclusive to you</p>
                    </div>
                  </div>

                  {profile?.city ? (
                    <div className="space-y-4 w-full min-w-0">
                      {isEditingCity ? (
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 w-full min-w-0">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Enter New Home City</label>
                          <div className="flex gap-2">
                            <Input 
                              value={homeCityInput} 
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHomeCityInput(e.target.value)} 
                              placeholder="City name (e.g. Paris)..." 
                              className="rounded-xl h-10 bg-white dark:bg-slate-900"
                            />
                            <Button 
                              onClick={handleSaveCity} 
                              disabled={isSavingCity} 
                              className="bg-[#16795A] hover:bg-[#115E46] h-10 rounded-xl shrink-0 font-bold px-4"
                            >
                              {isSavingCity ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => setIsEditingCity(false)} 
                              className="h-10 rounded-xl font-bold"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-55/60 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100/80 dark:border-slate-800/40 w-full min-w-0">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Departing From</span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{profile.city}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditingCity(true)} 
                            className="text-xs font-bold text-indigo-500 hover:text-indigo-650 cursor-pointer h-8"
                          >
                            Edit City
                          </Button>
                        </div>
                      )}

                      <Button 
                        disabled={transitLoading[profile.id]}
                        onClick={() => handleGenerateTransit(profile.id, profile.city || "")}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/30 text-indigo-650 dark:text-indigo-300 font-bold rounded-xl h-11 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {transitLoading[profile.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Suggesting Transits...
                          </>
                        ) : (
                          "Suggest Transit Options"
                        )}
                      </Button>

                      {/* AI suggestions */}
                      {transitOptions[profile.id] && (
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 grid gap-3 transition-colors duration-500 w-full min-w-0">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">AI Suggestions (Click + to Add)</p>
                          {transitOptions[profile.id].map((opt: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/60 w-full min-w-0 overflow-hidden">
                              {opt.type === 'flight' ? <Plane className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" /> : 
                               opt.type === 'train' ? <Train className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" /> : 
                               <Bus className="w-5 h-5 text-[#16795A] mt-0.5 shrink-0" />}
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 break-words leading-snug">{opt.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 break-words leading-relaxed">{opt.details}</p>
                                <span className="inline-block text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-300 px-2 py-0.5 rounded-md mt-1 border border-indigo-100/30 dark:border-indigo-900/10 shadow-sm">
                                  Est: {opt.cost}
                                </span>
                              </div>
                              <button
                                disabled={transitAdding[`${profile.id}_${idx}`]}
                                onClick={async () => {
                                  const key = `${profile.id}_${idx}`
                                  setTransitAdding(prev => ({ ...prev, [key]: true }))
                                  const payload = { title: opt.title, details: opt.details, cost: opt.cost, type: opt.type, day_number: 1 }
                                  
                                  if (!navigator.onLine) {
                                    try {
                                      const tempItem = {
                                        id: 'temp-item-' + Date.now(),
                                        plan_id: planId,
                                        user_id: profile?.id,
                                        day_number: 1,
                                        time_of_day: 'Morning',
                                        title: `🚀 ${opt.title}`,
                                        description: opt.details || "",
                                        location_name: opt.title,
                                        category: 'transit',
                                        duration_minutes: opt.type === 'flight' ? 180 : opt.type === 'train' ? 120 : 60,
                                        estimated_cost: parseFloat(opt.cost?.replace(/[^0-9.]/g, "")) || 0,
                                        sort_order: 99,
                                        lat: 0,
                                        lng: 0
                                      }
                                      
                                      setItems(prev => {
                                        const next = [...prev, tempItem].sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order)
                                        offlineDB.items.put({ id: planId, planId, data: next })
                                        return next
                                      })
                                      
                                      await queueOfflineOp(planId, 'CREATE_ITEM', payload)
                                      toast.info("Offline: Transit added optimistically and queued for sync")
                                    } catch (err) {
                                      console.error("Offline transit creation failed:", err)
                                      toast.error("Failed to add transit offline")
                                    } finally {
                                      setTransitAdding(prev => ({ ...prev, [key]: false }))
                                    }
                                    return
                                  }

                                  try {
                                    const res = await fetch(`/api/plans/${planId}/transit/add`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(payload)
                                    })
                                    const data = await res.json()
                                    if (res.ok && data.item) {
                                      setItems(prev => {
                                        const next = [...prev, data.item].sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order)
                                        offlineDB.items.put({ id: planId, planId, data: next })
                                        return next
                                      })
                                      toast.success(`"${opt.title}" added to Day 1`)
                                    } else {
                                      toast.error(data.error || 'Failed to add')
                                    }
                                  } catch { toast.error('Failed to add') }
                                  finally { setTransitAdding(prev => ({ ...prev, [key]: false })) }
                                }}
                                className="shrink-0 text-[#16795A] hover:bg-teal-50 dark:hover:bg-teal-950/20 p-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                title="Add to Day 1"
                              >
                                {transitAdding[`${profile.id}_${idx}`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850 text-center space-y-4">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Set your home city to get customized flight & train suggestions.</p>
                      <div className="flex gap-2">
                        <Input 
                          value={homeCityInput} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHomeCityInput(e.target.value)} 
                          placeholder="Your home city..." 
                          className="rounded-xl h-10 bg-white dark:bg-slate-900"
                        />
                        <Button 
                          onClick={handleSaveCity} 
                          disabled={isSavingCity} 
                          className="bg-[#16795A] hover:bg-[#115E46] h-10 rounded-xl font-bold px-4 cursor-pointer"
                        >
                          {isSavingCity ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Selected personal transits list */}
                  {items.filter(item => item.category === 'transit' && item.user_id === profile?.id).length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Added Transit Items</p>
                      {items.filter(item => item.category === 'transit' && item.user_id === profile?.id).map((tItem) => (
                        <div key={tItem.id} className="flex items-center justify-between bg-indigo-50/25 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg">🚀</span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{tItem.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{tItem.location_name}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteTransit(tItem.id)}
                            className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove Transit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Group Departures (Read-Only) */}
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 transition-colors duration-500 flex flex-col w-full min-w-0 overflow-hidden">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-[#16795A] font-bold">
                      👥
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">Group Departures</h4>
                      <p className="text-xs text-slate-400">Group members' origins</p>
                    </div>
                  </div>

                  {members.filter(m => m.user.id !== profile?.id).length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/60">
                      <p className="text-sm text-slate-400 dark:text-slate-500 italic">Solo trip! Invite friends to coordinate departures.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {members.filter(m => m.user.id !== profile?.id).map(m => (
                        <div key={m.user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              avatarUrl={m.user.avatar_url}
                              name={m.user.full_name}
                              userId={m.user.id}
                              size="w-9 h-9"
                              textSize="text-[11px]"
                              className="border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-850 dark:text-slate-250 truncate">{m.user.full_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {m.user.city ? `Departing: ${m.user.city}` : "Home city not set"}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            m.user.city ? 'bg-teal-50 dark:bg-teal-950/20 text-[#16795A]' : 'bg-slate-100 dark:bg-slate-800 text-slate-450'
                          }`}>
                            {m.user.city ? 'Ready' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trip Summary */}
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm sticky top-8 space-y-6 transition-colors duration-500">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 transition-colors duration-500">Trip Summary</h3>
            
            <div className="space-y-5">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4" /> Dates</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {mounted ? `${new Date(plan.start_date).toLocaleDateString()} - ${new Date(plan.end_date).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Total Budget</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-2xl">{plan.budget_total} {plan.currency}</p>
                {members.length > 0 && <p className="text-xs text-slate-400 mt-1">~{(plan.budget_total / members.length).toFixed(0)} per person</p>}
              </div>

              {/* Members */}
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> {members.length > 0 ? 'The Group' : 'Solo Trip'}</p>
                <div className="space-y-2">
                  {members.length === 0 && (
                    <p className="text-xs text-slate-400">Just you on this adventure!</p>
                  )}
                  {members.map(m => (
                    <div key={m.user.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={m.user.avatar_url}
                          name={m.user.full_name}
                          userId={m.user.id}
                          size="w-8 h-8"
                          textSize="text-[10px]"
                          className="border border-slate-200 dark:border-slate-700 object-cover"
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{m.user.full_name}</span>
                      </div>
                      {isAdmin && m.user.id !== profile?.id && plan.group_id && (
                        <button
                          onClick={() => setKickTarget(m.user)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-450 hover:text-red-600 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature Links */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Features</p>
              <Link href={`/plans/${planId}/expenses`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <Wallet className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Expenses & Budget
              </Link>
              <Link href={`/plans/${planId}/memories`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <Camera className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Trip Memories
              </Link>
              <Link href={`/plans/${planId}/notifications`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Momentum Engine
              </Link>
              {plan.status === 'draft' && (
                <Link href={`/plans/${planId}/edit`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                  <PenSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Edit Draft
                </Link>
              )}
              {plan.share_token && (
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${plan.share_token}`); toast.success('Share link copied!') }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 w-full text-left"
                >
                  <Share2 className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Copy Share Link
                </button>
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && plan.status !== 'cancelled' && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Admin</p>
                {plan.status === 'draft' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-teal-200 dark:border-teal-900/50 text-[#16795A] hover:bg-teal-50 dark:hover:bg-teal-950/20 hover:text-[#115E46]"
                    onClick={async () => {
                      const res = await fetch(`/api/plans/${planId}/confirm`, { method: 'POST' })
                      if (res.ok) { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); toast.success('Plan confirmed!'); setPlan((p: any) => ({ ...p, status: 'confirmed' })) }
                      else toast.error('Failed to confirm')
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Plan
                  </Button>
                )}
                {plan.status === 'confirmed' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-purple-200 dark:border-purple-900/50 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    onClick={async () => {
                      const res = await fetch(`/api/plans/${planId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) })
                      if (res.ok) { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); toast.success('Trip marked as completed! 🎉'); setPlan((p: any) => ({ ...p, status: 'completed' })) }
                      else toast.error('Failed to update')
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Mark as Completed
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Plan
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kick Member AlertDialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={(open: boolean) => { if (!open) setKickTarget(null) }}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Remove member</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to remove <strong>{kickTarget?.full_name}</strong> from the group? They will lose access to all plans in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" />}>Cancel</AlertDialogClose>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                const res = await fetch(`/api/groups/${plan.group_id}/members?userId=${kickTarget?.id}`, { method: 'DELETE' })
                if (res.ok) { toast.success('Member removed'); setMembers(prev => prev.filter(p => p.user.id !== kickTarget?.id)) }
                else toast.error('Failed to remove member')
                setKickTarget(null)
              }}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
 
      {/* Cancel Plan AlertDialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Cancel this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              The plan will be marked as cancelled. Your itinerary and data will be preserved and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" />}>Keep plan</AlertDialogClose>
            <Button
              className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
              onClick={async () => {
                const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' })
                if (res.ok) { toast.success('Plan cancelled'); setPlan((p: any) => ({ ...p, status: 'cancelled' })) }
                else toast.error('Failed to cancel')
                setShowCancelDialog(false)
              }}
            >
              Cancel plan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
 
      {/* Delete Plan AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              This will permanently delete <strong>{plan.title}</strong> and all associated data including itinerary items, expenses, memories, and votes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" />}>Keep plan</AlertDialogClose>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                const res = await fetch(`/api/plans/${planId}?permanent=true`, { method: 'DELETE' })
                if (res.ok) { toast.success('Plan deleted'); router.push('/plans') }
                else toast.error('Failed to delete')
                setShowDeleteDialog(false)
              }}
            >
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Controls Responsive Sheet */}
      {isAdmin && (
        <Sheet open={adminSheetOpen} onOpenChange={setAdminSheetOpen}>
          <SheetContent className="sm:max-w-md md:max-w-xl w-full p-0 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800">
            <SheetHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center gap-3 space-y-0">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 flex items-center justify-center text-[#16795A]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Admin Controls</SheetTitle>
                <SheetDescription className="text-xs text-slate-400">Manage plan status and collaboration</SheetDescription>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Plan Status Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Current Status</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">{plan.status}</p>
                </div>
                <span className="bg-[#16795A]/10 text-[#16795A] text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">{plan.status}</span>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Actions</h4>
                
                {plan.status === 'draft' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl h-12 border-teal-200 dark:border-teal-900/50 text-[#16795A] hover:bg-teal-50 dark:hover:bg-teal-950/20"
                    onClick={async () => {
                      setAdminSheetOpen(false)
                      const res = await fetch(`/api/plans/${planId}/confirm`, { method: 'POST' })
                      if (res.ok) { 
                        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
                        toast.success('Plan confirmed!')
                        setPlan((p: any) => ({ ...p, status: 'confirmed' })) 
                      } else {
                        toast.error('Failed to confirm')
                      }
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Confirm Plan
                  </Button>
                )}

                {plan.status === 'confirmed' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl h-12 border-purple-200 dark:border-purple-900/50 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    onClick={async () => {
                      setAdminSheetOpen(false)
                      const res = await fetch(`/api/plans/${planId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) })
                      if (res.ok) { 
                        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
                        toast.success('Trip marked as completed! 🎉')
                        setPlan((p: any) => ({ ...p, status: 'completed' })) 
                      } else {
                        toast.error('Failed to update')
                      }
                    }}
                  >
                    <Sparkles className="w-5 h-5 mr-2" /> Mark as Completed
                  </Button>
                )}

                {plan.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl h-12 border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    onClick={() => {
                      setAdminSheetOpen(false)
                      setShowCancelDialog(true)
                    }}
                  >
                    <XCircle className="w-5 h-5 mr-2" /> Cancel Plan
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl h-12 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => {
                    setAdminSheetOpen(false)
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="w-5 h-5 mr-2" /> Delete Permanently
                </Button>
              </div>

              {/* Members Management */}
              {plan.group_id && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group Collaboration ({members.length})</h4>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                    {members.map(m => (
                      <div key={m.user.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatarUrl={m.user.avatar_url}
                            name={m.user.full_name}
                            userId={m.user.id}
                            size="w-8 h-8"
                            textSize="text-[10px]"
                            className="border border-slate-200 dark:border-slate-700 object-cover"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.user.full_name}</p>
                            <p className="text-xs text-slate-400">@{m.user.username}</p>
                          </div>
                        </div>
                        {m.user.id !== profile?.id && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setAdminSheetOpen(false)
                              setKickTarget(m.user)
                            }}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs px-2.5 h-8 rounded-lg"
                          >
                            <UserMinus className="w-4 h-4 mr-1" /> Kick
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/50">
              <Button 
                onClick={() => setAdminSheetOpen(false)}
                className="w-full bg-[#16795A] hover:bg-[#115E46]"
              >
                Close Panel
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
