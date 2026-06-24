"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogClose } from "@/components/ui/alert-dialog"
import { Map, Calendar, Users, DollarSign, Train, Plane, Bus, MessageSquare, Loader2, Wallet, Camera, Bell, PenSquare, Trash2, XCircle, CheckCircle2, Share2, UserMinus, Sparkles, Plus, Shield, Send, User, Bot, History, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { ItineraryItemCard } from "@/components/shared/ItineraryItemCard"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { ErrorState } from "@/components/shared/ErrorState"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import confetti from "canvas-confetti"
import { ScenicImage } from "@/components/shared/ScenicImage"
import dynamic from "next/dynamic"
import { syncOfflineOps, queueOfflineOp, offlineDB } from "@/lib/supabase/offlineSync"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

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

  // AI Chat & Manual Add States
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDayForAdd, setSelectedDayForAdd] = useState(1)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [revertingLogIds, setRevertingLogIds] = useState<string[]>([])
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    category: "activity",
    time_of_day: "Morning",
    location_name: "",
    duration_minutes: 60,
    estimated_cost: 0,
    lat: 0,
    lng: 0
  })

  // Location Geocoding Autocomplete States
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [locationQuery, setLocationQuery] = useState("")

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (locationQuery.length > 2) {
        setIsSearchingLocation(true)
        try {
          const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(locationQuery)}`)
          if (res.ok) {
            const results = await res.json()
            setLocationResults(results || [])
          } else {
            setLocationResults([])
          }
        } catch (error) {
          console.error("Location search failed", error)
          setLocationResults([])
        } finally {
          setIsSearchingLocation(false)
        }
      } else {
        setLocationResults([])
      }
    }, 450)

    return () => clearTimeout(delayDebounceFn)
  }, [locationQuery])

  useEffect(() => {
    if (!isAddDialogOpen) {
      setLocationQuery("")
      setLocationResults([])
    } else {
      setLocationQuery(newActivity.location_name)
    }
  }, [isAddDialogOpen])

  const handleSelectLocation = (loc: any) => {
    const name = loc.display_name.split(',')[0] || loc.display_name
    setNewActivity(prev => ({
      ...prev,
      location_name: name,
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lon)
    }))
    setLocationQuery(name)
    setLocationResults([])
  }

  const [chatTransport] = useState(() => new DefaultChatTransport({ api: `/api/plans/${planId}/chat` }))
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: chatTransport,
    onError: (err) => {
      console.error("Chat error:", err)
      toast.error(err.message || "An error occurred with Planora AI")
    }
  })

  const handleManualAddActivity = async () => {
    if (!newActivity.title || !newActivity.location_name) {
      toast.error("Title and Location are required")
      return
    }

    const payload = {
      ...newActivity,
      day_number: selectedDayForAdd
    }

    if (!navigator.onLine) {
      try {
        const tempItem = {
          id: 'temp-item-' + Date.now(),
          plan_id: planId,
          user_id: null,
          day_number: selectedDayForAdd,
          time_of_day: newActivity.time_of_day,
          title: newActivity.title,
          description: newActivity.description,
          location_name: newActivity.location_name,
          category: newActivity.category,
          duration_minutes: newActivity.duration_minutes,
          estimated_cost: newActivity.estimated_cost,
          sort_order: 99,
          lat: 0,
          lng: 0
        }

        setItems(prev => {
          const next = [...prev, tempItem].sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order)
          offlineDB.items.put({ id: planId, planId, data: next })
          return next
        })

        await queueOfflineOp(planId, 'MANUAL_ADD_ITEM', payload)
        toast.info("Offline: Activity queued for synchronization")
        setIsAddDialogOpen(false)
        setNewActivity({
          title: "",
          description: "",
          category: "activity",
          time_of_day: "Morning",
          location_name: "",
          duration_minutes: 60,
          estimated_cost: 0,
          lat: 0,
          lng: 0
        })
      } catch (err) {
        console.error("Offline manual add failed:", err)
        toast.error("Failed to add activity offline")
      }
      return
    }

    try {
      const res = await fetch(`/api/plans/${planId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok && data.item) {
        setItems(prev => {
          const next = [...prev, data.item].sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order)
          offlineDB.items.put({ id: planId, planId, data: next })
          return next
        })
        toast.success("Activity added successfully!")
        setIsAddDialogOpen(false)
        setNewActivity({
          title: "",
          description: "",
          category: "activity",
          time_of_day: "Morning",
          location_name: "",
          duration_minutes: 60,
          estimated_cost: 0,
          lat: 0,
          lng: 0
        })
      } else {
        throw new Error(data.error || "Failed to create activity")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create activity")
    }
  }

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

        const { data: logData } = await supabase.from('plan_activity_logs').select('*').eq('plan_id', planId).order('created_at', { ascending: false })
        setActivityLogs(logData || [])
 
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

    const logsChannel = supabase.channel(`logs_${planId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_activity_logs', filter: `plan_id=eq.${planId}` }, async () => {
        const { data } = await supabase.from('plan_activity_logs').select('*').eq('plan_id', planId).order('created_at', { ascending: false })
        if (data) {
          setActivityLogs(data)
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
      supabase.removeChannel(logsChannel)
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
    const newVotes = [...votes]

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

  const handleRevertChange = async (logId: string) => {
    const confirmRevert = window.confirm("Are you sure you want to revert this change?")
    if (!confirmRevert) return

    setRevertingLogIds(prev => [...prev, logId])

    try {
      const res = await fetch(`/api/plans/${planId}/history/${logId}/revert`, {
        method: "POST"
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Reverted successfully!")
        await refreshItinerary()
        const { data: logData } = await supabase
          .from('plan_activity_logs')
          .select('*')
          .eq('plan_id', planId)
          .order('created_at', { ascending: false })
        if (logData) setActivityLogs(logData)
      } else {
        toast.error(data.error || "Failed to revert change")
      }
    } catch {
      toast.error("Failed to revert change due to a network error")
    } finally {
      setRevertingLogIds(prev => prev.filter(id => id !== logId))
    }
  }

  const visibleItems = React.useMemo(() => {
    return items.filter(i => i.user_id === null || i.user_id === profile?.id)
  }, [items, profile?.id])
  
  // Universal Chronological & Logical Self-Aware Sorting (Memoized for 60fps performance)
  const sortedItems = React.useMemo(() => {
    return [...visibleItems].sort((a, b) => {
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
  }, [visibleItems, plan?.destination_name])

  if (isLoading) return <div className="text-center py-20 text-slate-500">Loading plan...</div>
  if (!plan) return <ErrorState variant="not_found" title="Plan not found" description="This plan may have been deleted or you don't have access." backHref="/plans" backLabel="Back to plans" />

  const days = Array.from(new Set(sortedItems.map(i => i.day_number))).sort()
  const currentMember = members.find(m => m.user.id === profile?.id)
  const isAdmin = currentMember?.role === 'admin' || plan.created_by === profile?.id

  const formatLogTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const renderPayloadDiff = (log: any) => {
    if (!log.payload) return null
    const { old_item, new_item, deleted_item } = log.payload
    
    if (deleted_item) {
      return (
        <div className="mt-2 text-xs bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 p-2.5 rounded-lg space-y-1">
          <p className="font-bold">Deleted Item Details:</p>
          <p><span className="font-semibold text-slate-500">Location:</span> {deleted_item.location_name}</p>
          <p><span className="font-semibold text-slate-500">Cost:</span> {deleted_item.estimated_cost} {plan?.currency}</p>
        </div>
      )
    }
    
    if (old_item && new_item) {
      const changes: string[] = []
      if (old_item.title !== new_item.title) changes.push(`Title: "${old_item.title}" ➔ "${new_item.title}"`)
      if (old_item.description !== new_item.description) changes.push(`Description updated`)
      if (old_item.time_of_day !== new_item.time_of_day) changes.push(`Time: "${old_item.time_of_day}" ➔ "${new_item.time_of_day}"`)
      if (old_item.day_number !== new_item.day_number) changes.push(`Day: Day ${old_item.day_number} ➔ Day ${new_item.day_number}`)
      if (old_item.location_name !== new_item.location_name) changes.push(`Location: "${old_item.location_name}" ➔ "${new_item.location_name}"`)
      if (old_item.estimated_cost !== new_item.estimated_cost) changes.push(`Cost: ${old_item.estimated_cost} ➔ ${new_item.estimated_cost} {plan?.currency}`)
      if (old_item.duration_minutes !== new_item.duration_minutes) changes.push(`Duration: ${old_item.duration_minutes}m ➔ ${new_item.duration_minutes}m`)
      
      if (changes.length === 0) return null
      
      return (
        <div className="mt-2 text-[11px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 p-2.5 rounded-lg space-y-1">
          {changes.map((c, i) => (
            <p key={i} className="flex items-center gap-1.5 font-medium">🔹 {c}</p>
          ))}
        </div>
      )
    }
    
    if (new_item) {
      return (
        <div className="mt-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-lg space-y-1">
          <p className="font-bold">Added Item Details:</p>
          {new_item.description && <p className="italic text-slate-500 truncate">&quot;{new_item.description}&quot;</p>}
          <p><span className="font-semibold text-slate-500">Location:</span> {new_item.location_name}</p>
          <p><span className="font-semibold text-slate-500">Duration:</span> {new_item.duration_minutes} mins</p>
          <p><span className="font-semibold text-slate-500">Cost:</span> {new_item.estimated_cost} {plan?.currency}</p>
        </div>
      )
    }
    
    return null
  }

  const gradients = [
    "from-teal-400 to-emerald-600",
    "from-blue-400 to-indigo-600",
    "from-orange-400 to-rose-600",
    "from-purple-400 to-fuchsia-600"
  ]
  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl relative overflow-hidden shadow-lg h-56 sm:h-64 md:h-80 flex flex-col justify-end p-6 sm:p-8">
        <ScenicImage 
          destination={plan.destination_name}
          alt={plan.destination_name}
          width={1600}
          height={800}
          fill
          priority
          className="object-cover object-center opacity-60 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{plan.status}</span>
              <div className="flex -space-x-2">
                {plan.group_id ? (
                  members.slice(0, 5).map(m => (
                    <UserAvatar
                      key={m.user.id}
                      avatarUrl={m.user.avatar_url}
                      name={m.user.full_name}
                      userId={m.user.id}
                      size="w-8 h-8"
                      textSize="text-[10px]"
                      className="border-2 border-slate-900"
                    />
                  ))
                ) : (
                  profile && (
                    <UserAvatar
                      avatarUrl={profile.avatar_url}
                      name={profile.full_name ?? undefined}
                      userId={profile.id}
                      size="w-8 h-8"
                      textSize="text-[10px]"
                      className="border-2 border-slate-900"
                    />
                  )
                )}
              </div>
            </div>
            <h1 className="text-5xl font-extrabold mb-2">{plan.title}</h1>
            <p className="text-white/80 max-w-xl text-lg flex items-center gap-2"><Map className="w-5 h-5" /> {plan.destination_name}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={() => { setIsHistoryOpen(true); setIsChatOpen(false); }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6 cursor-pointer"
            >
              <History className="w-5 h-5 mr-2" /> Activity Log
            </Button>
            <Button 
              onClick={() => { setIsChatOpen(true); setIsHistoryOpen(false); }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6 cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 mr-2" /> Ask Planora AI
            </Button>
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
      {plan.group_id && onlineUsers.length > 0 && (
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
            
            {days.map((dayNum: any) => {
              const dayItems = sortedItems.filter(i => i.day_number === dayNum)
              const approvedDayItems = dayItems.filter(i => i.suggestion_status === 'approved' || !i.suggestion_status)
              const daySuggestions = dayItems.filter(i => i.suggestion_status === 'suggestion')
              const timesOfDay = ["Pre-trip", "Morning", "Afternoon", "Evening", "Night"]

              return (
                <TabsContent key={dayNum} value={dayNum.toString()} className="outline-none mt-0">
                  <h2 className="sr-only">Day {dayNum} Itinerary</h2>
                  <div className="pt-2 space-y-6">
                    {dayItems.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 transition-colors duration-500">
                        <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No activities planned for this day yet.</p>
                        <div className="flex justify-center gap-3 mt-4">
                          <Button
                            onClick={() => {
                              setSelectedDayForAdd(dayNum)
                              setIsAddDialogOpen(true)
                            }}
                            className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-10 px-5 font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Plus className="w-4 h-4" /> {isAdmin ? "Add Activity" : "Propose Activity"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {timesOfDay.map((slot) => {
                          const approvedSlotItems = approvedDayItems.filter(i => i.time_of_day === slot)
                          const slotSuggestions = daySuggestions.filter(i => i.time_of_day === slot)

                          if (approvedSlotItems.length === 0 && slotSuggestions.length === 0) return null

                          return (
                            <div key={slot} className="space-y-4">
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-2">
                                {slot}
                              </p>

                              {/* Approved Official Items */}
                              {approvedSlotItems.map((item) => {
                                const alternatives = slotSuggestions.filter(s => s.parent_item_id === item.id)

                                return (
                                  <div key={item.id} className="space-y-3">
                                    <ItineraryItemCard 
                                      item={item} 
                                      votes={votes.filter(v => v.item_id === item.id)} 
                                      currentUserId={profile?.id} 
                                      isAdmin={isAdmin} 
                                      onVote={handleVote} 
                                      onUpdate={refreshItinerary}
                                      members={members}
                                      isSolo={!plan.group_id}
                                    />

                                    {/* Proposed alternatives */}
                                    {alternatives.length > 0 && (
                                      <div className="ml-6 sm:ml-8 pl-4 border-l-2 border-dashed border-teal-200 dark:border-teal-900/50 space-y-3 mb-4">
                                        <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                          💡 Proposed Alternatives ({alternatives.length})
                                        </p>
                                        {alternatives.map((altItem) => (
                                          <ItineraryItemCard 
                                            key={altItem.id}
                                            item={altItem} 
                                            votes={votes.filter(v => v.item_id === altItem.id)} 
                                            currentUserId={profile?.id} 
                                            isAdmin={isAdmin} 
                                            onVote={handleVote} 
                                            onUpdate={refreshItinerary}
                                            members={members}
                                            isSolo={!plan.group_id}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}

                              {/* New Proposed Items for this slot (with no parent relation) */}
                              {(() => {
                                const newProposals = slotSuggestions.filter(s => !s.parent_item_id)
                                if (newProposals.length === 0) return null

                                return (
                                  <div className="ml-6 sm:ml-8 pl-4 border-l-2 border-dashed border-teal-200 dark:border-teal-900/50 space-y-3">
                                    <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                      ➕ Proposed Additions ({newProposals.length})
                                    </p>
                                    {newProposals.map((newSug) => (
                                      <ItineraryItemCard 
                                        key={newSug.id}
                                        item={newSug} 
                                        votes={votes.filter(v => v.item_id === newSug.id)} 
                                        currentUserId={profile?.id} 
                                        isAdmin={isAdmin} 
                                        onVote={handleVote} 
                                        onUpdate={refreshItinerary}
                                        members={members}
                                        isSolo={!plan.group_id}
                                      />
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>
                          )
                        })}

                        {/* Quick Actions */}
                        <div className="flex justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                          <Button
                            onClick={() => {
                              setSelectedDayForAdd(dayNum)
                              setIsAddDialogOpen(true)
                            }}
                            className="bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/10 rounded-xl h-11 px-5 font-extrabold text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <Plus className="w-4.5 h-4.5" /> {isAdmin ? "Add Activity" : "Propose Activity"}
                          </Button>
                          <Button
                            onClick={() => {
                              setIsChatOpen(true)
                              sendMessage({ text: `Help me replan Day ${dayNum} to make it more exciting!` })
                            }}
                            className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/10 rounded-xl h-11 px-5 font-extrabold text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" /> AI Replan Day {dayNum}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              )
            })}
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
              <p className="text-sm text-slate-500 dark:text-slate-400">Coordinate and manage your travel plans independently without cluttering the group schedule.</p>
            </div>

            <div className={plan.group_id ? "grid md:grid-cols-2 gap-6 items-start" : "max-w-3xl mx-auto space-y-6"}>
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
                            className="text-xs font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer h-8"
                          >
                            Edit City
                          </Button>
                        </div>
                      )}

                      <Button 
                        disabled={transitLoading[profile.id]}
                        onClick={() => handleGenerateTransit(profile.id, profile.city || "")}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-bold rounded-xl h-11 cursor-pointer flex items-center justify-center gap-2"
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
                                <span className="inline-block text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md mt-1 border border-indigo-100/30 dark:border-indigo-900/10 shadow-sm">
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
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
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
              {plan.group_id && (
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 transition-colors duration-500 flex flex-col w-full min-w-0 overflow-hidden">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-[#16795A] font-bold">
                        👥
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">Group Departures</h4>
                        <p className="text-xs text-slate-400">Group members&apos; origins</p>
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
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{m.user.full_name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {m.user.city ? `Departing: ${m.user.city}` : "Home city not set"}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              m.user.city ? 'bg-teal-50 dark:bg-teal-950/20 text-[#16795A]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {m.user.city ? 'Ready' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
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
                    className="w-full justify-start rounded-xl border-[#16795A]/30 dark:border-teal-900/50 text-[#16795A] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 hover:text-[#115E46]"
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
                    className="w-full justify-start rounded-xl h-12 border-[#16795A]/30 dark:border-teal-900/50 text-[#16795A] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20"
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
                            <p className="text-sm font-semibold text-slate-800 dark:border-slate-200">{m.user.full_name}</p>
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

      {/* Manual Add Activity Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-extrabold text-2xl">Add Activity to Day {selectedDayForAdd}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
              Fill out the details to manually add a new activity to your itinerary. Location coordinates will be geocoded automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity Title</Label>
              <Input 
                placeholder="e.g. Scenic Beach Picnic" 
                value={newActivity.title} 
                onChange={e => setNewActivity({...newActivity, title: e.target.value})} 
                className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea 
                placeholder="Describe what you will do..." 
                value={newActivity.description} 
                onChange={e => setNewActivity({...newActivity, description: e.target.value})} 
                className="resize-none h-20 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Time of Day</Label>
                <Select value={newActivity.time_of_day} onValueChange={v => v && setNewActivity({...newActivity, time_of_day: v})}>
                  <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</Label>
                <Select value={newActivity.category} onValueChange={v => v && setNewActivity({...newActivity, category: v})}>
                  <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Activity 🎟️</SelectItem>
                    <SelectItem value="food">Food 🍽️</SelectItem>
                    <SelectItem value="transport">Transport 🚗</SelectItem>
                    <SelectItem value="accommodation">Accommodation 🏨</SelectItem>
                    <SelectItem value="leisure">Leisure 🏖️</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location</Label>
                <div className="relative">
                  <Input 
                    placeholder="e.g. Bondi Beach" 
                    value={locationQuery} 
                    onChange={e => {
                      setLocationQuery(e.target.value)
                      setNewActivity(prev => ({ ...prev, location_name: e.target.value }))
                    }} 
                    className="rounded-xl bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 pr-9"
                  />
                  {isSearchingLocation && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 animate-spin" />
                  )}
                </div>
                {locationResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
                    {locationResults.map((loc, i) => (
                      <div 
                        key={i} 
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800/40 last:border-0 text-xs text-slate-700 dark:text-slate-300 truncate"
                        onClick={() => handleSelectLocation(loc)}
                      >
                        {loc.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mins</Label>
                  <Input 
                    type="number" 
                    value={newActivity.duration_minutes} 
                    onChange={e => setNewActivity({...newActivity, duration_minutes: parseInt(e.target.value) || 0})} 
                    className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cost</Label>
                  <Input 
                    type="number" 
                    value={newActivity.estimated_cost} 
                    onChange={e => setNewActivity({...newActivity, estimated_cost: parseFloat(e.target.value) || 0})} 
                    className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleManualAddActivity} 
              className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-11 font-bold w-full"
            >
              <Plus className="w-4 h-4 mr-2" /> Add to Itinerary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating AI Chat Bubble Button */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(true)}
            aria-label="Open AI Chat"
            className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-[#16795A] to-teal-500 hover:from-[#115E46] hover:to-teal-600 text-white rounded-full p-4 shadow-xl shadow-teal-500/20 flex items-center justify-center cursor-pointer border border-teal-400/20 group"
          >
            <Sparkles className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Collapsible Slide-Over AI Chat Panel */}
      <AnimatePresence>
        {isChatOpen && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200/50 dark:border-slate-800/50 shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/35">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 text-[#16795A] flex items-center justify-center shadow-inner">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-base">
                      Planora AI <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Travel Copilot</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsChatOpen(false)}
                  aria-label="Close Chat Drawer"
                  className="rounded-full w-8 h-8 p-0 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              {/* Drawer Chat Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-slate-50/30 to-white dark:from-slate-900/10 dark:to-slate-950">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-5 py-8 text-center px-4">
                    <div className="w-14 h-14 rounded-full bg-teal-50/60 dark:bg-teal-950/20 text-[#16795A] flex items-center justify-center shadow-sm">
                      <Bot className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">How can I help you, {profile?.full_name?.split(' ')[0]}?</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[280px]">
                        Ask me to customize your activities, replan days, suggest restaurants, or check travel details.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 w-full max-w-[320px]">
                      {["Add a coffee stop on Day 1", "Make Day 2 more relaxed", "Suggest local food options", "What should I pack for this trip?"].map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage({ text: s })}
                          className="text-left text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#16795A]/45 hover:bg-teal-50/50 dark:hover:bg-teal-950/10 transition-all text-slate-600 dark:text-slate-355 shadow-sm cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm text-xs ${
                      m.role === "user"
                        ? "bg-slate-900 dark:bg-slate-800 text-white"
                        : "bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 text-[#16795A]"
                    }`}>
                      {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    {/* Bubble */}
                    <div className={`rounded-2xl max-w-[85%] text-sm overflow-hidden ${
                      m.role === "user"
                        ? "bg-slate-900 dark:bg-slate-800 text-white rounded-tr-sm px-4 py-2.5"
                        : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-100 rounded-tl-sm"
                    }`}>
                      {m.parts.map((part, pi) => {
                        if (part.type === "text") {
                          return (
                            <div key={pi} className={`whitespace-pre-wrap leading-relaxed ${m.role === "assistant" ? "px-4 py-2.5" : ""}`}>
                              {part.text}
                            </div>
                          )
                        }

                        if (part.type === "tool-invocation") {
                          const toolInvocation = (part as any).toolInvocation
                          if (!toolInvocation) return null

                          const { state, toolName, args, result } = toolInvocation
                          const isRunning = state === "partial-call" || state === "call"
                          const isDone = state === "result"
                          const isError = isDone && result && (result.error || result.success === false)

                          const toolMeta: Record<string, { label: string; icon: string }> = {
                            add_item: { label: "Adding Activity", icon: "➕" },
                            edit_item: { label: "Updating Activity", icon: "✏️" },
                            delete_item: { label: "Deleting Activity", icon: "🗑️" },
                            swap_items: { label: "Swapping order", icon: "🔄" },
                            bulk_update_itinerary: { label: "AI Bulk Update", icon: "✨" }
                          }
                          const meta = toolMeta[toolName] || { label: toolName, icon: "⚙️" }

                          let detailsText = ""
                          if (isRunning) {
                            detailsText = "Updating workspace..."
                          } else if (isDone) {
                            if (isError) {
                              detailsText = result?.error || "Could not apply edits."
                            } else {
                              if (toolName === "bulk_update_itinerary") {
                                detailsText = `Itinerary synced: modified ${result.upserted_count || 0} and removed ${result.deleted_count || 0} items.`
                              } else {
                                detailsText = "Itinerary synchronized successfully!"
                              }
                            }
                          }

                          return (
                            <div key={pi} className="mx-2 my-1.5">
                              <div className={`rounded-xl border p-2.5 flex items-center gap-3 text-xs transition-colors ${
                                isDone && !isError
                                  ? "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                                  : isError
                                  ? "bg-red-50/50 dark:bg-red-950/15 border-red-200/50 dark:border-red-900/30 text-red-700 dark:text-red-300"
                                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-300"
                              }`}>
                                <span className="text-base shrink-0">{meta.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold">{meta.label}</p>
                                  <p className="text-[10px] opacity-80 mt-0.5 truncate">{detailsText}</p>
                                </div>
                                {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />}
                              </div>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                ))}

                {status === "streaming" && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 text-[#16795A] flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-3.5 h-3.5 animate-bounce" />
                    </div>
                    <div className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#16795A] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#16795A] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#16795A] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Message Input */}
              <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/35 backdrop-blur-md">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const text = chatInput.trim()
                    if (!text || status === "streaming") return
                    setChatInput("")
                    await sendMessage({ text })
                  }}
                  className="relative flex items-center"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={status === "streaming" ? "AI is typing..." : "Ask AI to edit this plan..."}
                    disabled={status === "streaming"}
                    className="w-full h-11 pl-4 pr-12 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#16795A]/30 focus:border-[#16795A]/45 transition-all disabled:opacity-60"
                  />
                  <Button
                    type="submit"
                    disabled={status === "streaming" || !chatInput.trim()}
                    size="icon"
                    className="absolute right-1.5 w-8 h-8 rounded-lg bg-[#16795A] hover:bg-[#115E46] text-white flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </Button>
                </form>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Slide-Over Plan Activity Log Panel */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200/50 dark:border-slate-800/50 shadow-2xl z-50 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/35">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-base">
                    Plan Activity Log
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Audit Trail</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsHistoryOpen(false)}
                className="rounded-full w-8 h-8 p-0 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-slate-50/30 to-white dark:from-slate-900/10 dark:to-slate-950">
              {activityLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-8 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No activity logged yet</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px] mt-1">
                      Changes made to the itinerary (adds, updates, deletes) will appear here in real-time.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6">
                  {activityLogs.map((log) => {
                    const member = members.find((m: any) => m.user.id === log.user_id)
                    const avatarUrl = member?.user.avatar_url
                    const authorName = member?.user.full_name || (log.user_id ? "Group Member" : "Planora AI")
                    const isSystem = !log.user_id
                    
                    let iconBg = "bg-blue-100 dark:bg-blue-950/40 text-blue-650 dark:text-blue-400"
                    let actionIcon = "✏️"
                    if (log.activity_type === "ADD_ITEM") {
                      iconBg = "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                      actionIcon = "➕"
                    } else if (log.activity_type === "DELETE_ITEM") {
                      iconBg = "bg-rose-100 dark:bg-rose-950/40 text-rose-650 dark:text-rose-405"
                      actionIcon = "🗑️"
                    } else if (log.activity_type === "PROMOTE_ITEM") {
                      iconBg = "bg-teal-100 dark:bg-teal-950/40 text-teal-650 dark:text-teal-400"
                      actionIcon = "💡"
                    } else if (log.activity_type === "PROPOSE_ITEM") {
                      iconBg = "bg-purple-100 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400"
                      actionIcon = "❓"
                    } else if (log.activity_type === "REVERT_ACTION") {
                      iconBg = "bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                      actionIcon = "↩️"
                    }
                    
                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Bullet */}
                        <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 ${iconBg}`}>
                          {actionIcon}
                        </div>
                        
                        {/* Log Item Content */}
                        <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-900/60 transition-all shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            {isSystem ? (
                              <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-[#16795A] flex items-center justify-center text-[10px] shrink-0 border border-teal-100 dark:border-teal-900/40">
                                🤖
                              </div>
                            ) : (
                              <UserAvatar
                                avatarUrl={avatarUrl}
                                name={authorName}
                                userId={log.user_id}
                                size="w-5 h-5"
                                textSize="text-[8px]"
                                className="shrink-0"
                              />
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{authorName}</span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                              {formatLogTime(log.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                            {log.description}
                          </p>
                          
                          {/* Diff Payload */}
                          {renderPayloadDiff(log)}

                          {/* Revert Action */}
                          {isAdmin && ["ADD_ITEM", "DELETE_ITEM", "UPDATE_ITEM", "PROMOTE_ITEM"].includes(log.activity_type) && (() => {
                            const isReverted = activityLogs.some(
                              (l) => l.activity_type === "REVERT_ACTION" && l.payload?.reverted_log_id === log.id
                            )
                            const isReverting = revertingLogIds.includes(log.id)

                            if (isReverted) {
                              return (
                                <div className="mt-3 pt-3 border-t border-slate-100/50 dark:border-slate-800/50 flex justify-end">
                                  <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    ↩️ Reverted
                                  </span>
                                </div>
                              )
                            }

                            return (
                              <div className="mt-3 pt-3 border-t border-slate-100/50 dark:border-slate-800/50 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isReverting}
                                  onClick={() => handleRevertChange(log.id)}
                                  className="h-7 text-[10px] font-extrabold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  <RotateCcw className={`w-3 h-3 ${isReverting ? "animate-spin" : ""}`} />
                                  {isReverting ? "Reverting..." : "Revert Change"}
                                </Button>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
