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

  const { object, submit, isLoading: isAiLoading, error } = useObject({
    api: '/api/plans/generate',
    schema: itineraryResponseSchema,
    onFinish: () => {
      toast.info("Saving new itinerary to your workspace...")
      const pollInterval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from('itinerary_items')
            .select('id')
            .eq('plan_id', planId)
            .limit(1)
          
          if (data && data.length > 0) {
            clearInterval(pollInterval)
            toast.success("Itinerary regenerated successfully!")
            router.push(`/plans/${planId}`)
          }
        } catch (err) {
          console.error("Polling database for items failed:", err)
        }
      }, 800)

      // Safety fallback (maximum 15 seconds)
      setTimeout(() => {
        clearInterval(pollInterval)
        router.push(`/plans/${planId}`)
      }, 15000)
    }
  })

  useEffect(() => {
    async function fetchPlan() {
      const { data, error } = await supabase.from('plans').select('*, group:groups(name)').eq('id', planId).single()
      if (data) {
        setPlan(data)
        setStartDate(data.start_date || "")
        setEndDate(data.end_date || "")
        setBudget(data.budget_total?.toString() || "")
        setCurrency(data.currency || "USD")
        // Preferences would ideally come from a column if stored, but we'll default them
      }
      if (error) toast.error("Failed to load plan")
      setIsLoadingPlan(false)
    }
    fetchPlan()
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
      preferences: { tripType, pace, dietaryNotes, mustHaves, avoid }
    })
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

  if (isLoadingPlan) return <div className="text-center py-20 text-slate-500 dark:text-slate-450 transition-colors duration-500">Loading draft...</div>
  if (!plan) return <ErrorState variant="not_found" title="Plan not found" description="This draft may have been deleted or you don't have access." backHref="/plans" backLabel="Back to plans" />
  if (plan.status !== 'draft') return <ErrorState variant="no_access" title="Not editable" description="Only drafts can be edited here. Confirmed and completed plans are read-only." backHref={`/plans/${planId}`} backLabel="View plan" />

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-6 px-4 sm:px-0">
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
            <Input type="date" className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">End Date</label>
            <Input type="date" className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Total Budget</label>
            <Input type="number" className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={budget} onChange={e => setBudget(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Currency</label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
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
            disabled={isGenerating}
            className="w-full h-12 rounded-xl font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#1D9E75]" />}
            Regenerate with AI
          </Button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 bg-teal-50/40 dark:bg-teal-950/15 -mx-8 -mb-8 p-8 rounded-b-3xl text-center transition-colors duration-500">
          <h3 className="font-bold text-xl mb-2 text-slate-900 dark:text-white transition-colors duration-500">Ready to lock it in?</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto transition-colors duration-500">Confirming this plan will notify your group members and schedule the automated trip reminders.</p>
          
          <Button 
            onClick={handleConfirm}
            disabled={isConfirming || isGenerating}
            className="bg-[#1D9E75] hover:bg-[#15805e] text-white h-14 px-10 rounded-2xl text-lg font-bold shadow-xl shadow-teal-550/20"
          >
            {isConfirming ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Plan'}
          </Button>
        </div>
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
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" />}>Keep draft</AlertDialogClose>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
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
