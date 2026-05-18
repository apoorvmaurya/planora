"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogClose } from "@/components/ui/alert-dialog"
import { Map, Calendar, Users, DollarSign, Train, Plane, Bus, MessageSquare, Loader2, Wallet, Camera, Bell, PenSquare, Trash2, XCircle, CheckCircle2, Share2, UserMinus, Sparkles, Plus } from "lucide-react"
import { toast } from "sonner"
import { ItineraryItemCard } from "@/components/shared/ItineraryItemCard"
import { ErrorState } from "@/components/shared/ErrorState"
import Link from "next/link"
import confetti from "canvas-confetti"

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

  // AlertDialog state
  const [kickTarget, setKickTarget] = useState<any>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) return;
      
      const { data: pData } = await supabase.from('plans').select('*, groups(*)').eq('id', planId).single()
      if (!pData) {
        setIsLoading(false)
        return
      }
      setPlan(pData)
      setGroup(pData.groups)
      
      const { data: iData } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
      setItems(iData || [])
      
      const { data: vData } = await supabase.from('member_votes').select('*').eq('plan_id', planId)
      setVotes(vData || [])

      if (pData.group_id) {
        const { data: mData } = await supabase.from('group_members').select('role, user:profiles(*)').eq('group_id', pData.group_id)
        setMembers(mData || [])
      } else {
        setMembers([])
      }
      
      setIsLoading(false)
    }
    fetchData()
  }, [planId, supabase, profile?.id])

  useEffect(() => {
    if (!profile?.id) return

    const itemsChannel = supabase.channel(`items_${planId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_items', filter: `plan_id=eq.${planId}` }, async () => {
        const { data } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')
        setItems(data || [])
      }).subscribe()

    const votesChannel = supabase.channel(`votes_${planId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_votes', filter: `plan_id=eq.${planId}` }, async () => {
        const { data } = await supabase.from('member_votes').select('*').eq('plan_id', planId)
        setVotes(data || [])
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

    return () => {
      supabase.removeChannel(itemsChannel)
      supabase.removeChannel(votesChannel)
      supabase.removeChannel(roomOne)
    }
  }, [planId, supabase, profile])

  const handleVote = async (itemId: string, vote: string) => {
    const res = await fetch(`/api/plans/${planId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, vote })
    })
    if (!res.ok) toast.error("Failed to vote")
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

  if (isLoading) return <div className="text-center py-20 text-slate-500">Loading plan...</div>
  if (!plan) return <ErrorState variant="not_found" title="Plan not found" description="This plan may have been deleted or you don't have access." backHref="/plans" backLabel="Back to plans" />

  const days = Array.from(new Set(items.map(i => i.day_number))).sort()
  const currentMember = members.find(m => m.user.id === profile?.id)
  const isAdmin = currentMember?.role === 'admin' || plan.created_by === profile?.id

  const gradients = [
    "from-teal-400 to-emerald-600",
    "from-blue-400 to-indigo-600",
    "from-orange-400 to-rose-600",
    "from-purple-400 to-fuchsia-600"
  ]
  const gradient = gradients[plan.destination_name.length % gradients.length]

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl relative overflow-hidden shadow-lg h-80 flex flex-col justify-end p-8">
        <div className={`absolute inset-0 bg-gradient-to-tr ${gradient} opacity-80`} />
        <div className="absolute inset-0 bg-black/30" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{plan.status}</span>
              <div className="flex -space-x-2">
                {members.slice(0, 5).map(m => (
                  <img key={m.user.id} src={m.user.avatar_url || `https://ui-avatars.com/api/?name=${m.user.full_name}`} className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" alt="avatar" />
                ))}
              </div>
            </div>
            <h1 className="text-5xl font-extrabold mb-2">{plan.title}</h1>
            <p className="text-white/80 max-w-xl text-lg flex items-center gap-2"><Map className="w-5 h-5" /> {plan.destination_name}</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/plans/${planId}/chat`}>
              <Button className="bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl h-12 px-6">
                <MessageSquare className="w-5 h-5 mr-2" /> Ask Planora AI
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <div className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse" />
          <span>Live viewing:</span>
          {onlineUsers.map(u => (
            <span key={u.id} className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-md">{u.name}</span>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue={days[0]?.toString() || "1"} className="w-full">
            <TabsList className="flex flex-wrap h-auto bg-transparent mb-6 gap-2">
              {days.map((dayNum: any) => (
                <TabsTrigger key={dayNum} value={dayNum.toString()} className="data-[state=active]:bg-[#1D9E75] data-[state=active]:text-white bg-slate-100 text-slate-600 rounded-full px-6 py-2">
                  Day {dayNum}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {days.map((dayNum: any) => (
              <TabsContent key={dayNum} value={dayNum.toString()} className="outline-none mt-0">
                <div className="pt-2">
                  {items.filter(i => i.day_number === dayNum).map(item => (
                    <ItineraryItemCard 
                      key={item.id} 
                      item={item} 
                      votes={votes.filter(v => v.item_id === item.id)} 
                      currentUserId={profile?.id} 
                      isAdmin={isAdmin} 
                      onVote={handleVote} 
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Transit Section */}
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Getting There</h3>
            <div className="space-y-4">
              {members.map(m => (
                <div key={m.user.id} className="bg-white p-5 rounded-2xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <img src={m.user.avatar_url || `https://ui-avatars.com/api/?name=${m.user.full_name}`} className="w-10 h-10 rounded-full" alt="avatar" />
                      <div>
                        <p className="font-bold text-slate-900">{m.user.full_name}</p>
                        <p className="text-sm text-slate-500">
                          {m.user.city ? `${m.user.city} ➔ ${plan.destination_name}` : "Home city not set"}
                        </p>
                      </div>
                    </div>
                    {m.user.city && (
                      <Button 
                        variant="outline" 
                        disabled={transitLoading[m.user.id]}
                        onClick={() => handleGenerateTransit(m.user.id, m.user.city)}
                        className="rounded-xl shrink-0"
                      >
                        {transitLoading[m.user.id] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Suggest Transit"}
                      </Button>
                    )}
                  </div>
                  
                  {transitOptions[m.user.id] && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid gap-3">
                      {transitOptions[m.user.id].map((opt: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl"
                        >
                          {opt.type === 'flight' ? <Plane className="w-5 h-5 text-blue-500 mt-0.5" /> : 
                           opt.type === 'train' ? <Train className="w-5 h-5 text-orange-500 mt-0.5" /> : 
                           <Bus className="w-5 h-5 text-[#1D9E75] mt-0.5" />}
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-900">{opt.title}</p>
                            <p className="text-xs text-slate-500">{opt.details} • Est: {opt.cost}</p>
                          </div>
                          <button
                            disabled={transitAdding[`${m.user.id}_${idx}`]}
                            onClick={async () => {
                              const key = `${m.user.id}_${idx}`
                              setTransitAdding(prev => ({ ...prev, [key]: true }))
                              try {
                                const res = await fetch(`/api/plans/${planId}/transit/add`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ...opt, day_number: 1 })
                                })
                                if (res.ok) toast.success(`"${opt.title}" added to Day 1`)
                                else toast.error('Failed to add')
                              } catch { toast.error('Failed to add') }
                              finally { setTransitAdding(prev => ({ ...prev, [key]: false })) }
                            }}
                            className="shrink-0 text-[#1D9E75] hover:bg-teal-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                            title="Add to Day 1"
                          >
                            {transitAdding[`${m.user.id}_${idx}`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trip Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm sticky top-8 space-y-6">
            <h3 className="font-bold text-lg text-slate-900">Trip Summary</h3>
            
            <div className="space-y-5">
              <div>
                <p className="text-sm text-slate-500 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4" /> Dates</p>
                <p className="font-bold text-slate-900">{new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Total Budget</p>
                <p className="font-bold text-slate-900 text-2xl">{plan.budget_total} {plan.currency}</p>
                {members.length > 0 && <p className="text-xs text-slate-400 mt-1">~{(plan.budget_total / members.length).toFixed(0)} per person</p>}
              </div>

              {/* Members */}
              <div>
                <p className="text-sm text-slate-500 mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> {members.length > 0 ? 'The Group' : 'Solo Trip'}</p>
                <div className="space-y-2">
                  {members.length === 0 && (
                    <p className="text-xs text-slate-400">Just you on this adventure!</p>
                  )}
                  {members.map(m => (
                    <div key={m.user.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <img src={m.user.avatar_url || `https://ui-avatars.com/api/?name=${m.user.full_name}`} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
                        <span className="text-sm font-semibold text-slate-700">{m.user.full_name}</span>
                      </div>
                      {isAdmin && m.user.id !== profile?.id && plan.group_id && (
                        <button
                          onClick={() => setKickTarget(m.user)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded-lg hover:bg-red-50"
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
            <div className="border-t border-slate-100 pt-5 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Features</p>
              <Link href={`/plans/${planId}/expenses`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                <Wallet className="w-4 h-4 text-slate-400" /> Expenses & Budget
              </Link>
              <Link href={`/plans/${planId}/memories`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                <Camera className="w-4 h-4 text-slate-400" /> Trip Memories
              </Link>
              <Link href={`/plans/${planId}/notifications`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                <Bell className="w-4 h-4 text-slate-400" /> Momentum Engine
              </Link>
              {plan.status === 'draft' && (
                <Link href={`/plans/${planId}/edit`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                  <PenSquare className="w-4 h-4 text-slate-400" /> Edit Draft
                </Link>
              )}
              {plan.share_token && (
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${plan.share_token}`); toast.success('Share link copied!') }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 w-full text-left"
                >
                  <Share2 className="w-4 h-4 text-slate-400" /> Copy Share Link
                </button>
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && plan.status !== 'cancelled' && (
              <div className="border-t border-slate-100 pt-5 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Admin</p>
                {plan.status === 'draft' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-teal-200 text-[#1D9E75] hover:bg-teal-50 hover:text-[#15805e]"
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
                    className="w-full justify-start rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50"
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
                  className="w-full justify-start rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Plan
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-red-200 text-red-600 hover:bg-red-50"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{kickTarget?.full_name}</strong> from the group? They will lose access to all plans in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>Cancel</AlertDialogClose>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              The plan will be marked as cancelled. Your itinerary and data will be preserved and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>Keep plan</AlertDialogClose>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{plan.title}</strong> and all associated data including itinerary items, expenses, memories, and votes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>Keep plan</AlertDialogClose>
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
    </div>
  )
}
