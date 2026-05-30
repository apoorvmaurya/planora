"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogClose } from "@/components/ui/alert-dialog"
import { ErrorState } from "@/components/shared/ErrorState"
import { Check, ChevronRight, Loader2, Sparkles, AlertCircle, Trash2 } from "lucide-react"
import { itineraryResponseSchema } from "@/lib/ai/prompts"

export default function EditPlanPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
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

  const { object, submit, isLoading: isAiLoading } = useObject({
    api: '/api/plans/generate',
    schema: itineraryResponseSchema,
    onFinish: () => {
      setIsGenerating(false)
      toast.success("New AI itinerary generated! Review differences below.")
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
      
      setIsLoadingPlan(false)
    }
    fetchPlanAndItems()
  }, [planId, supabase])

  const handleRegenerate = async () => {
    setIsGenerating(true)
    submit({
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
      
      // Get union of days in current and generated plans
      const daysSet = new Set<number>()
      currentItems.forEach(i => daysSet.add(i.day_number))
      if (object?.days) {
        object.days.forEach(d => {
          if (d?.day_number) daysSet.add(d.day_number)
        })
      }
      const daysList = Array.from(daysSet).sort((a, b) => a - b)

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

      if (!res.ok) throw new Error("Failed to save merged itinerary")

      toast.success("Itinerary merged and saved successfully!")
      router.push(`/plans/${planId}`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to merge itinerary")
    } finally {
      setIsSavingMerge(false)
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const res = await fetch(`/api/plans/${planId}/confirm`, { method: 'POST' })
      if (!res.ok) throw new Error("Failed to confirm")
      
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

  if (isLoadingPlan) return <div className="text-center py-20 text-slate-500 dark:text-slate-455 transition-colors duration-500">Loading draft...</div>
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

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6 px-4 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-550">Review Draft</h1>
          <p className="text-slate-500 dark:text-slate-455 mt-1 transition-colors duration-500">Adjust preferences, regenerate the itinerary, or confirm it.</p>
        </div>
        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting} className="rounded-xl flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Delete
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-8 space-y-8 transition-colors duration-500">
        <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-500">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500 dark:text-slate-400">Destination:</span> <strong className="block text-slate-900 dark:text-white transition-colors duration-500">{plan.destination_name}</strong></div>
            <div><span className="text-slate-500 dark:text-slate-400">Group:</span> <strong className="block text-slate-900 dark:text-white transition-colors duration-500">{plan.group?.name || 'Solo Trip'}</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Start Date</label>
            <Input type="date" className="h-12 rounded-xl bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">End Date</label>
            <Input type="date" className="h-12 rounded-xl bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Total Budget</label>
            <Input type="number" className="h-12 rounded-xl bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800" value={budget} onChange={e => setBudget(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Currency</label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 transition-colors duration-500">
          <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white transition-colors duration-500">Regenerate AI Itinerary</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 transition-colors duration-500">Want a different vibe? Update preferences and let AI try again.</p>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Vibe / Type</label>
              <Select value={tripType} onValueChange={(v) => v && setTripType(v)}>
                <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leisure">Leisure & Relaxing</SelectItem>
                  <SelectItem value="adventure">Action & Adventure</SelectItem>
                  <SelectItem value="cultural">Cultural & Historical</SelectItem>
                  <SelectItem value="food">Food & Nightlife</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Pace</label>
              <Select value={pace} onValueChange={(v) => v && setPace(v)}>
                <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleRegenerate}
            disabled={isGenerating || isAiLoading}
            className="w-full h-12 rounded-xl font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isGenerating || isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#1D9E75]" />}
            {isAiLoading ? "AI is generating..." : "Regenerate with AI"}
          </Button>
        </div>

        {/* Comparative Review & Merge Panel */}
        {(isAiLoading || object?.days) && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-8 space-y-6 transition-colors duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#1D9E75]" /> Review AI Suggestions
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Compare the new suggested itinerary side-by-side and cherry-pick what to keep.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allNew: Record<number, 'current' | 'new'> = {}
                    daysList.forEach(d => { allNew[d] = 'new' })
                    setDayChoice(allNew)
                  }}
                  className="text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Accept All New
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
                  className="text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Keep Original
                </Button>
              </div>
            </div>

            {/* AI Proposed Title Indicator */}
            {object?.title && (
              <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 p-4 rounded-2xl flex items-center justify-between transition-colors duration-500">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1D9E75]">Suggested Title</span>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{object.title}</p>
                </div>
                <span className="text-xs font-semibold text-slate-400 italic">will overwrite current title</span>
              </div>
            )}

            <div className="space-y-8">
              {daysList.map(dayNum => {
                const choice = dayChoice[dayNum] || 'new'
                const dayCurrentItems = currentItems.filter(i => i.day_number === dayNum)
                const dayNewObj = object?.days?.find(d => d?.day_number === dayNum)
                const dayNewItems = dayNewObj?.itinerary_items || []

                return (
                  <div key={dayNum} className="space-y-4 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 transition-colors duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">Day {dayNum} Itinerary</h4>
                      
                      {/* Day Selection Toggle */}
                      <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl w-64">
                        <button
                          type="button"
                          onClick={() => setDayChoice(prev => ({ ...prev, [dayNum]: 'current' }))}
                          className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            choice === 'current'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-550 dark:text-slate-400 hover:text-slate-800'
                          }`}
                        >
                          Keep Current
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayChoice(prev => ({ ...prev, [dayNum]: 'new' }))}
                          className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            choice === 'new'
                              ? 'bg-[#1D9E75] text-white shadow-sm'
                              : 'text-slate-550 dark:text-slate-400 hover:text-slate-800'
                          }`}
                        >
                          Use AI New
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Current Itinerary Panel */}
                      <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                        choice === 'current' 
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
                          : 'bg-slate-100/50 dark:bg-slate-950/25 border-slate-100 dark:border-slate-900/50 opacity-60'
                      }`}>
                        <div className="text-xs font-bold text-slate-450 uppercase mb-2">Original Day {dayNum}</div>
                        {dayCurrentItems.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4 text-center">Empty</p>
                        ) : (
                          dayCurrentItems.map((item, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between font-bold text-slate-805 dark:text-slate-200">
                                <span>{item.title}</span>
                                <span className="bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-[10px]">{item.time_of_day}</span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 line-clamp-1">{item.location_name}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* New Suggested Itinerary Panel */}
                      <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                        choice === 'new' 
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-200 dark:border-emerald-900/40' 
                          : 'bg-slate-100/50 dark:bg-slate-950/25 border-slate-100 dark:border-slate-900/50 opacity-60'
                      }`}>
                        <div className="text-xs font-bold text-emerald-600/80 dark:text-emerald-450/80 uppercase mb-2 flex items-center justify-between">
                          <span>AI Proposed Day {dayNum}</span>
                          {isAiLoading && !dayNewObj && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        </div>
                        {dayNewItems.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4 text-center">
                            {isAiLoading ? "Generating..." : "No suggestions"}
                          </p>
                        ) : (
                          dayNewItems.map((item: any, idx) => (
                            <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between font-bold text-slate-805 dark:text-slate-200">
                                <span>{item?.title}</span>
                                <span className="bg-emerald-100/50 dark:bg-emerald-950/50 text-[#1D9E75] px-1.5 py-0.5 rounded text-[10px]">{item?.time_of_day}</span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 line-clamp-1">{item?.location_name}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Merge Action CTA */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => router.push(`/plans/${planId}`)}
                className="rounded-xl h-12 px-6 border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancel Review
              </Button>
              <Button
                onClick={handleSaveMerge}
                disabled={isSavingMerge || isAiLoading}
                className="rounded-xl bg-[#1D9E75] hover:bg-[#15805e] text-white font-bold h-12 px-8 shadow-md cursor-pointer"
              >
                {isSavingMerge ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Save & Merge Itinerary
              </Button>
            </div>
          </div>
        )}

        {/* Regular Lock in / Confirm CTA */}
        {!isAiLoading && !object?.days && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-8 bg-teal-50/40 dark:bg-teal-950/15 -mx-8 -mb-8 p-8 rounded-b-3xl text-center transition-colors duration-500">
            <h3 className="font-bold text-xl mb-2 text-slate-900 dark:text-white transition-colors duration-500">Ready to lock it in?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto transition-colors duration-500">Confirming this plan will notify your group members and schedule the automated trip reminders.</p>
            
            <Button 
              onClick={handleConfirm}
              disabled={isConfirming || isGenerating}
              className="bg-[#1D9E75] hover:bg-[#15805e] text-white h-14 px-10 rounded-2xl text-lg font-bold shadow-xl shadow-teal-550/20 cursor-pointer"
            >
              {isConfirming ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Plan'}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Draft AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              This will permanently delete the draft plan and all generated itinerary items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800" />}>Keep draft</AlertDialogClose>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer"
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
