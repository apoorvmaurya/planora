"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogClose } from "@/components/ui/alert-dialog"
import { ErrorState } from "@/components/shared/ErrorState"
import { EditPlanSkeleton } from "@/components/shared/PageSkeleton"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { Check, ChevronRight, Loader2, Sparkles, AlertCircle, Trash2, ShieldCheck, Users, Clock, MapPin, DollarSign, ArrowRight, RefreshCw, CheckCircle2, XCircle, Lock, Lightbulb } from "lucide-react"
import { itineraryResponseSchema } from "@/lib/ai/prompts"

const categoryColors: Record<string, string> = {
  activity: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
  food: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
  transport: "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30",
  accommodation: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
  leisure: "bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/30",
}

const categoryEmoji: Record<string, string> = {
  activity: "🏛️",
  food: "🍽️",
  transport: "🚌",
  accommodation: "🏨",
  leisure: "🌿",
}

export default function EditPlanPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string
  const supabase = createClient()
  const { profile } = useUserStore()
  
  const [step, setStep] = useState(1)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Role-based state
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'creator'>('member')
  
  // Form State
  const [plan, setPlan] = useState<any>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [tripType, setTripType] = useState("leisure")
  const [pace, setPace] = useState("moderate")
  const [dietaryNotes, setDietaryNotes] = useState("")
  const [mustHaves, setMustHaves] = useState("")
  const [avoid, setAvoid] = useState("")

  const [isGenerating, setIsGenerating] = useState(false)
  
  // Current database itinerary state
  const [currentItems, setCurrentItems] = useState<any[]>([])
  
  // User merge choice per day: 'current' | 'new'
  const [dayChoice, setDayChoice] = useState<Record<number, 'current' | 'new'>>({})
  const [isSavingMerge, setIsSavingMerge] = useState(false)

  const { object, submit, isLoading: isAiLoading, error: aiError } = useObject({
    api: '/api/plans/generate',
    schema: itineraryResponseSchema,
    onFinish: () => {
      setIsGenerating(false)
      toast.success("AI itinerary ready! Review the comparison below.")
    },
    onError: (err) => {
      setIsGenerating(false)
      toast.error(err.message || "AI generation failed. Please try again.")
    }
  })

  useEffect(() => {
    async function fetchPlanAndItems() {
      // Fetch Plan details
      const { data, error } = await supabase.from('plans').select('*, group:groups(name)').eq('id', planId).single()
      if (data) {
        setPlan(data)
        setStartDate(data.start_date || "")
        setEndDate(data.end_date || "")
        setBudget(data.budget_total?.toString() || "")
        setCurrency(data.currency || "USD")
      }
      if (error) toast.error("Failed to load plan")
      
      // Fetch existing itinerary items
      const { data: items } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('plan_id', planId)
        .order('day_number')
        .order('sort_order')
      if (items) {
        setCurrentItems(items)
      }

      // Determine user role
      if (data && profile?.id) {
        if (data.created_by === profile.id) {
          setIsAdmin(true)
          setUserRole('creator')
        } else if (data.group_id) {
          const { data: member } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', data.group_id)
            .eq('user_id', profile.id)
            .single()
          if (member?.role === 'admin') {
            setIsAdmin(true)
            setUserRole('admin')
          } else {
            setIsAdmin(false)
            setUserRole('member')
          }
        } else {
          // Solo plan, creator check already handled above
          setIsAdmin(false)
        }
      }
      
      setIsLoadingPlan(false)
    }
    fetchPlanAndItems()
  }, [planId, supabase, profile?.id])

  const handleRegenerate = async () => {
    setIsGenerating(true)
    submit({
      planId: plan.id,
      destination: { name: plan.destination_name, lat: plan.destination_lat, lng: plan.destination_lng },
      startDate,
      endDate,
      budget: parseFloat(budget),
      currency,
      groupId: plan.group_id || 'solo',
      saveToDb: false, // Do not automatically save to DB
      preferences: { tripType, pace, dietaryNotes, mustHaves, avoid }
    })
  }

  const handleSaveMerge = async () => {
    setIsSavingMerge(true)
    try {
      const finalItems: any[] = []
      
      daysList.forEach(dayNum => {
        const choice = dayChoice[dayNum] || 'new'
        if (choice === 'current') {
          currentItems.filter(i => i.day_number === dayNum).forEach(item => {
            finalItems.push(item)
          })
        } else {
          const dayObj = object?.days?.find(d => d?.day_number === dayNum)
          if (dayObj?.itinerary_items) {
            dayObj.itinerary_items.forEach(item => {
              if (item) {
                finalItems.push({
                  day_number: dayNum,
                  time_of_day: item.time_of_day,
                  title: item.title,
                  description: item.description,
                  location_name: item.location_name,
                  category: item.category,
                  duration_minutes: item.duration_minutes,
                  estimated_cost: item.estimated_cost,
                  lat: item.lat,
                  lng: item.lng
                })
              }
            })
          }
        }
      })

      const res = await fetch(`/api/plans/${planId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: object?.title || plan.title,
          items: finalItems
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save itinerary")

      if (data.proposed) {
        toast.success("Your suggestions have been submitted for the group to vote on!")
      } else {
        toast.success("Itinerary merged and saved successfully!")
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } })
      }
      
      setTimeout(() => router.push(`/plans/${planId}`), 1500)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to save itinerary")
    } finally {
      setIsSavingMerge(false)
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const res = await fetch(`/api/plans/${planId}/confirm`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to confirm")
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
      toast.success("Plan confirmed! Notifications sent to group.")
      
      setTimeout(() => {
        router.push(`/plans/${planId}`)
      }, 2000)
    } catch (err: any) {
      toast.error(err.message)
      setIsConfirming(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await supabase.from('plans').delete().eq('id', planId)
    toast.success("Draft deleted")
    router.push('/plans')
  }

  if (isLoadingPlan) return <EditPlanSkeleton />
  if (!plan) return <ErrorState variant="not_found" title="Plan not found" description="This draft may have been deleted or you don't have access." backHref="/plans" backLabel="Back to plans" />
  if (plan.status !== 'draft') return <ErrorState variant="no_access" title="Not editable" description="Only drafts can be edited here. Confirmed and completed plans are read-only." backHref={`/plans/${planId}`} backLabel="View plan" />

  // Unique list of days
  const daysSet = new Set<number>()
  currentItems.forEach(i => daysSet.add(i.day_number))
  if (object?.days) {
    object.days.forEach(d => {
      if (d?.day_number) daysSet.add(d.day_number)
    })
  }
  const daysList = Array.from(daysSet).sort((a, b) => a - b)

  // Stats for the review summary
  const totalNewItems = object?.days?.reduce((acc, d) => acc + (d?.itinerary_items?.length || 0), 0) || 0
  const totalCurrentItems = currentItems.length
  const selectedNewCount = daysList.filter(d => (dayChoice[d] || 'new') === 'new').length
  const selectedKeepCount = daysList.filter(d => dayChoice[d] === 'current').length

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-8 px-4 sm:px-0">
      <Breadcrumb
        items={[
          { label: "Plans", href: "/plans" },
          { label: plan?.title || "Trip Itinerary", href: `/plans/${planId}` },
          { label: "Review Draft" }
        ]}
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-[#0b1b17] dark:via-slate-900 dark:to-slate-950 rounded-3xl p-8 sm:p-10 shadow-2xl border border-transparent dark:border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#16795A]/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#16795A]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-amber-500/20 backdrop-blur text-amber-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">Draft</span>
              {/* Role Badge */}
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur border ${
                isAdmin 
                  ? 'bg-[#16795A]/20 text-teal-300 border-teal-500/20' 
                  : 'bg-slate-500/20 text-slate-300 border-slate-500/20'
              }`}>
                {isAdmin ? (
                  <><ShieldCheck className="w-3 h-3 inline mr-1 -mt-px" />{userRole === 'creator' ? 'Creator' : 'Admin'}</>
                ) : (
                  <><Users className="w-3 h-3 inline mr-1 -mt-px" />Member</>
                )}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Review Draft</h1>
            <p className="text-slate-400 max-w-lg">
              {isAdmin 
                ? "Tweak preferences, regenerate the itinerary, or confirm it for the group." 
                : "Suggest itinerary changes for the group to vote on."
              }
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {isAdmin && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)} 
                disabled={isDeleting} 
                className="rounded-xl flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 backdrop-blur cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Draft
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Trip Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <MapPin className="w-4 h-4" />, label: "Destination", value: plan.destination_name?.split(',')[0] },
          { icon: <Users className="w-4 h-4" />, label: "Group", value: plan.group?.name || 'Solo Trip' },
          { icon: <DollarSign className="w-4 h-4" />, label: "Budget", value: `${budget} ${currency}` },
          { icon: <Clock className="w-4 h-4" />, label: "Duration", value: `${startDate && endDate ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : '—'} days` },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-800/80 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-slate-400 mb-1.5">
              {stat.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Preferences & Regeneration Section */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-xl shadow-slate-200/10 dark:shadow-none overflow-hidden">
        {/* Date & Budget Edit */}
        <div className="p-6 sm:p-8 space-y-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#16795A]/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-[#16795A]" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Trip Configuration</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Adjust dates, budget, and preferences before regenerating.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Start Date</label>
              <Input type="date" className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">End Date</label>
              <Input type="date" className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Budget</label>
              <Input type="number" className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Currency</label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Vibe / Type</label>
              <Select value={tripType} onValueChange={(v) => v && setTripType(v)}>
                <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leisure">Leisure & Relaxing</SelectItem>
                  <SelectItem value="adventure">Action & Adventure</SelectItem>
                  <SelectItem value="cultural">Cultural & Historical</SelectItem>
                  <SelectItem value="food">Food & Nightlife</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Pace</label>
              <Select value={pace} onValueChange={(v) => v && setPace(v)}>
                <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">Relaxed (1-2 things/day)</SelectItem>
                  <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                  <SelectItem value="packed">Packed (See everything!)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Regenerate CTA */}
        <div className="p-6 sm:p-8">
          <Button 
            onClick={handleRegenerate}
            disabled={isGenerating || isAiLoading}
            className="w-full h-14 rounded-2xl font-extrabold text-base bg-gradient-to-r from-[#16795A] to-emerald-600 hover:from-[#115E46] hover:to-emerald-700 text-white shadow-lg shadow-[#16795A]/20 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer border-0"
          >
            {isGenerating || isAiLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI is crafting your itinerary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Regenerate with AI</span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </>
            )}
          </Button>

          {/* Streaming progress indicator */}
          {(isGenerating || isAiLoading) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 space-y-3"
            >
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#16795A] to-emerald-400 rounded-full"
                  initial={{ width: "5%" }}
                  animate={{ width: object?.days ? `${Math.min(95, (object.days.length / Math.max(1, daysList.length || 3)) * 100)}%` : "30%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-medium">
                {object?.days 
                  ? `Streaming day ${object.days.length} of ${daysList.length || '...'}...` 
                  : "Initializing AI generation..."
                }
              </p>
            </motion.div>
          )}

          {aiError && (
            <div className="mt-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Generation failed: {aiError.message}. Please try again.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Comparative Review & Merge Panel ===== */}
      <AnimatePresence>
        {(isAiLoading || object?.days) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* Comparison Header */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 p-6 sm:p-8 shadow-xl shadow-slate-200/10 dark:shadow-none">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#16795A] to-emerald-600 flex items-center justify-center shadow-lg shadow-[#16795A]/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xl text-slate-900 dark:text-white">Review AI Suggestions</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAdmin 
                        ? "Compare and cherry-pick what to keep. Your selection will replace the current itinerary."
                        : "Compare and propose changes. Your selection will be submitted as suggestions for the group."
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allNew: Record<number, 'current' | 'new'> = {}
                      daysList.forEach(d => { allNew[d] = 'new' })
                      setDayChoice(allNew)
                    }}
                    className="text-xs font-bold rounded-xl border-emerald-200 dark:border-emerald-900/40 text-[#16795A] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer h-9 px-4"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Accept All New
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allCurrent: Record<number, 'current' | 'new'> = {}
                      daysList.forEach(d => { allCurrent[d] = 'current' })
                      setDayChoice(allCurrent)
                    }}
                    className="text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer h-9 px-4"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Keep All Original
                  </Button>
                </div>
              </div>

              {/* AI Proposed Title */}
              {object?.title && (
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/15 dark:to-emerald-950/15 border border-teal-100 dark:border-teal-900/30 p-4 rounded-2xl flex items-center justify-between mb-6">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#16795A]/70">AI Suggested Title</span>
                    <p className="font-extrabold text-slate-900 dark:text-white text-lg">{object.title}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 italic bg-white/60 dark:bg-slate-950/40 px-3 py-1 rounded-full">
                    {isAdmin ? 'Will replace current title' : 'Title suggestion only'}
                  </span>
                </div>
              )}

              {/* Selection Stats Bar */}
              {daysList.length > 0 && !isAiLoading && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-950/30 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800/60">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{daysList.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Days</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-2xl font-black text-[#16795A]">{selectedNewCount}</p>
                    <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Using AI New</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/30 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800/60">
                    <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{selectedKeepCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keeping Original</p>
                  </div>
                </div>
              )}
            </div>

            {/* Day-by-Day Comparison Cards */}
            <div className="space-y-5">
              {daysList.map((dayNum, dayIdx) => {
                const choice = dayChoice[dayNum] || 'new'
                const dayCurrentItems = currentItems.filter(i => i.day_number === dayNum)
                const dayNewObj = object?.days?.find(d => d?.day_number === dayNum)
                const dayNewItems = dayNewObj?.itinerary_items || []

                return (
                  <motion.div 
                    key={dayNum}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dayIdx * 0.08 }}
                    className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-lg shadow-slate-200/10 dark:shadow-none overflow-hidden"
                  >
                    {/* Day Header with Toggle */}
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/30 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center">
                          <span className="text-sm font-black text-white dark:text-slate-900">{dayNum}</span>
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 dark:text-slate-200">Day {dayNum}</h3>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {dayCurrentItems.length} current • {dayNewItems.length} new activities
                          </p>
                        </div>
                      </div>
                      
                      {/* Premium Toggle */}
                      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-64 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setDayChoice(prev => ({ ...prev, [dayNum]: 'current' }))}
                          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                            choice === 'current'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          <Lock className="w-3 h-3" /> Keep Current
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayChoice(prev => ({ ...prev, [dayNum]: 'new' }))}
                          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                            choice === 'new'
                              ? 'bg-[#16795A] text-white shadow-sm shadow-[#16795A]/25'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" /> Use AI New
                        </button>
                      </div>
                    </div>

                    {/* Side-by-side Panels */}
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/60">
                      {/* Current Itinerary Panel */}
                      <div className={`p-5 space-y-2.5 transition-all duration-300 ${
                        choice === 'current' ? 'opacity-100' : 'opacity-40 grayscale-[30%]'
                      }`}>
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Original Itinerary
                        </div>
                        {dayCurrentItems.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            No activities planned
                          </div>
                        ) : (
                          dayCurrentItems.map((item, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-xs space-y-2 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm">{categoryEmoji[item.category] || '📍'}</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${categoryColors[item.category] || categoryColors.activity}`}>
                                  {item.time_of_day}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{item.location_name}</span>
                                <span className="shrink-0">{item.duration_minutes}m</span>
                                <span className="shrink-0">{item.estimated_cost} {currency}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* New AI-Suggested Panel */}
                      <div className={`p-5 space-y-2.5 transition-all duration-300 ${
                        choice === 'new' ? 'opacity-100' : 'opacity-40 grayscale-[30%]'
                      }`}>
                        <div className="text-[10px] font-extrabold text-emerald-500/80 uppercase tracking-widest mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#16795A]" />
                            AI Proposed
                          </span>
                          {isAiLoading && !dayNewObj && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16795A]" />}
                        </div>
                        {dayNewItems.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-8 text-center bg-emerald-50/30 dark:bg-emerald-950/10 rounded-2xl border border-dashed border-emerald-100 dark:border-emerald-900/30">
                            {isAiLoading ? "Generating..." : "No suggestions for this day"}
                          </div>
                        ) : (
                          dayNewItems.map((item: any, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl text-xs space-y-2 border border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors shadow-sm"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm">{categoryEmoji[item?.category] || '📍'}</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item?.title}</span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${categoryColors[item?.category] || categoryColors.activity}`}>
                                  {item?.time_of_day}
                                </span>
                              </div>
                              {item?.description && (
                                <p className="text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{item?.location_name}</span>
                                <span className="shrink-0">{item?.duration_minutes}m</span>
                                <span className="shrink-0">{item?.estimated_cost} {currency}</span>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Save & Merge CTA */}
            {!isAiLoading && object?.days && (
              <motion.div 
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 p-6 sm:p-8 shadow-xl shadow-slate-200/10 dark:shadow-none"
              >
                {/* Role-based info banner */}
                {!isAdmin && (
                  <div className="mb-6 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Member Suggestion Mode</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Your selections will be submitted as proposals for the group to vote on, not applied directly.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/plans/${planId}`)}
                    className="rounded-xl h-12 px-6 border-slate-200 dark:border-slate-800 cursor-pointer w-full sm:w-auto"
                  >
                    Cancel Review
                  </Button>
                  <Button
                    onClick={handleSaveMerge}
                    disabled={isSavingMerge}
                    className="rounded-2xl bg-gradient-to-r from-[#16795A] to-emerald-600 hover:from-[#115E46] hover:to-emerald-700 text-white font-extrabold h-14 px-10 shadow-lg shadow-[#16795A]/20 cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2.5 text-base border-0"
                  >
                    {isSavingMerge ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isAdmin ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Lightbulb className="w-5 h-5" />
                    )}
                    {isAdmin ? 'Save & Merge Itinerary' : 'Propose as Suggestions'}
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Confirm Plan Section (Admin Only) ===== */}
      {!isAiLoading && !object?.days && isAdmin && currentItems.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 dark:from-teal-950/15 dark:via-slate-900/60 dark:to-emerald-950/10 rounded-3xl border border-teal-100 dark:border-teal-900/30 p-8 sm:p-10 text-center shadow-xl shadow-teal-100/10 dark:shadow-none"
        >
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#16795A]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#16795A] to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-[#16795A]/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-extrabold text-2xl mb-2 text-slate-900 dark:text-white">Ready to lock it in?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
              Confirming this plan will notify your group members and schedule the automated trip reminders.
            </p>
            
            <Button 
              onClick={handleConfirm}
              disabled={isConfirming || isGenerating}
              className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 h-14 px-12 rounded-2xl text-lg font-extrabold shadow-xl shadow-slate-900/20 dark:shadow-white/10 cursor-pointer border-0 hover:shadow-2xl transition-shadow duration-300"
            >
              {isConfirming ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Plan'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Non-admin info when no comparison is open */}
      {!isAiLoading && !object?.days && !isAdmin && currentItems.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 text-center">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Viewing as Group Member</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            You can regenerate the itinerary above and propose changes for the group to vote on. Only admins can confirm or directly modify the plan.
          </p>
        </div>
      )}

      {/* Delete Draft AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white text-xl font-extrabold">Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              This will permanently delete the draft plan and all generated itinerary items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" />}>Keep draft</AlertDialogClose>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer font-bold border-0"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
