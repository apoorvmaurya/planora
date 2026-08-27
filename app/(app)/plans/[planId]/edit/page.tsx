"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"

import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogClose } from "@/components/ui/alert-dialog"
import { ErrorState } from "@/components/shared/ErrorState"
import { EditPlanSkeleton } from "@/components/shared/PageSkeleton"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { ShieldCheck, Users, Clock, MapPin, DollarSign, Trash2, Loader2 } from "lucide-react"
import { itineraryResponseSchema } from "@/lib/ai/prompts"
import { EditPlanConfigForm } from "@/components/shared/EditPlanConfigForm"
import { EditPlanComparisonPanel } from "@/components/shared/EditPlanComparisonPanel"

export default function EditPlanPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string
  const supabase = createClient()
  const { profile } = useUserStore()
  
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'creator'>('member')
  
  const [plan, setPlan] = useState<any>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [tripType, setTripType] = useState("leisure")
  const [pace, setPace] = useState("moderate")

  const [isGenerating, setIsGenerating] = useState(false)
  const [currentItems, setCurrentItems] = useState<any[]>([])
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
      const { data, error } = await supabase.from('plans').select('*, group:groups(name)').eq('id', planId).single()
      if (data) {
        setPlan(data)
        setStartDate(data.start_date || "")
        setEndDate(data.end_date || "")
        setBudget(data.budget_total?.toString() || "")
        setCurrency(data.currency || "USD")
      }

      if (data && profile?.id) {
        if (data.created_by === profile.id) {
          setIsAdmin(true)
          setUserRole('creator')
        } else if (data.group_id) {
          const { data: memberData } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', data.group_id)
            .eq('user_id', profile.id)
            .single()
          if (memberData?.role === 'admin') {
            setIsAdmin(true)
            setUserRole('admin')
          } else {
            setIsAdmin(false)
            setUserRole('member')
          }
        }
      }

      const { data: itemsData } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('plan_id', planId)
        .order('day_number')
        .order('sort_order')
      if (itemsData) setCurrentItems(itemsData)

      setIsLoadingPlan(false)
    }

    if (planId && profile?.id) {
      fetchPlanAndItems()
    }
  }, [planId, profile?.id])

  const handleRegenerate = () => {
    if (!startDate || !endDate) {
      toast.error("Please provide both start and end dates.")
      return
    }
    const daysCount = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    if (daysCount <= 0) {
      toast.error("End date must be after start date.")
      return
    }

    setIsGenerating(true)
    submit({
      destination: plan?.destination_name || "Unknown",
      duration_days: daysCount,
      budget_total: parseFloat(budget) || 0,
      currency: currency || "USD",
      group_size: 1,
      preferences: {
        trip_type: tripType,
        pace: pace,
        dietary: "",
        must_haves: "",
        avoid: ""
      }
    })
  }

  const handleSaveMerge = async () => {
    if (!object?.days) return
    setIsSavingMerge(true)

    try {
      const itemsToKeep = currentItems.filter(item => dayChoice[item.day_number] === 'current')
      const newItemsToAdd: any[] = []

      object.days.forEach((day: any) => {
        const choice = dayChoice[day.day_number] || 'new'
        if (choice === 'new' && day.itinerary_items) {
          day.itinerary_items.forEach((item: any) => {
            newItemsToAdd.push({
              ...item,
              day_number: day.day_number,
              plan_id: planId,
              suggestion_status: isAdmin ? 'approved' : 'suggestion',
              created_by: profile?.id
            })
          })
        }
      })

      const res = await fetch(`/api/plans/${planId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: isAdmin ? object.title : undefined,
          start_date: startDate,
          end_date: endDate,
          budget_total: parseFloat(budget) || plan.budget_total,
          currency,
          keep_items: itemsToKeep.map(i => i.id),
          new_items: newItemsToAdd,
          is_admin: isAdmin
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to merge itinerary")

      toast.success(isAdmin ? "Itinerary updated successfully!" : "Proposals submitted to group!")
      router.push(`/plans/${planId}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to merge itinerary")
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

  const daysSet = new Set<number>()
  currentItems.forEach(i => daysSet.add(i.day_number))
  if (object?.days) {
    object.days.forEach((d: any) => {
      if (d?.day_number) daysSet.add(d.day_number)
    })
  }
  const daysList = Array.from(daysSet).sort((a, b) => a - b)

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
                : "Suggest itinerary changes for the group to vote on."}
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

      {/* Preferences & Regeneration */}
      <EditPlanConfigForm
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        budget={budget}
        setBudget={setBudget}
        currency={currency}
        setCurrency={setCurrency}
        tripType={tripType}
        setTripType={setTripType}
        pace={pace}
        setPace={setPace}
        isGenerating={isGenerating}
        isAiLoading={isAiLoading}
        onRegenerate={handleRegenerate}
        object={object}
        daysCount={daysList.length}
        aiError={aiError}
      />

      {/* Comparative Review & Merge Panel */}
      <EditPlanComparisonPanel
        isAiLoading={isAiLoading}
        object={object}
        isAdmin={isAdmin}
        daysList={daysList}
        dayChoice={dayChoice}
        setDayChoice={setDayChoice}
        currentItems={currentItems}
        currency={currency}
        isSavingMerge={isSavingMerge}
        onCancelReview={() => router.push(`/plans/${planId}`)}
        onSaveMerge={handleSaveMerge}
      />

      {/* Confirm Plan Section (Admin Only) */}
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
              Confirming this plan will notify your group members and schedule automated trip reminders.
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
