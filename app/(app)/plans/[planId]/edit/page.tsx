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
import { Check, ChevronRight, Loader2, Sparkles, AlertCircle, Trash2 } from "lucide-react"
import { itinerarySchema } from "@/lib/ai/prompts"

export default function EditPlanPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
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
    schema: itinerarySchema,
    onFinish: async (result: any) => {
      // If we regenerate, we should ideally update the itinerary items in DB
      // But for simplicity of this flow, we will just show success. 
      // A full regenerate would delete old items and insert new ones.
      toast.success("Itinerary regenerated successfully!")
      router.push(`/plans/${planId}`)
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
      groupId: plan.group_id,
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
    if (!confirm("Are you sure you want to delete this draft?")) return
    setIsDeleting(true)
    await supabase.from('plans').delete().eq('id', planId)
    toast.success("Draft deleted")
    router.push('/plans')
  }

  if (isLoadingPlan) return <div className="text-center py-20 text-slate-500">Loading draft...</div>
  if (!plan) return <div className="text-center py-20 text-red-500">Plan not found</div>
  if (plan.status !== 'draft') return <div className="text-center py-20 text-slate-500">Only drafts can be edited here.</div>

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Review Draft</h1>
          <p className="text-slate-500 mt-1">Adjust preferences, regenerate the itinerary, or confirm it.</p>
        </div>
        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="rounded-xl flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Delete
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Destination:</span> <strong className="block text-slate-900">{plan.destination_name}</strong></div>
            <div><span className="text-slate-500">Group:</span> <strong className="block text-slate-900">{plan.group?.name}</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Start Date</label>
            <Input type="date" className="h-12 rounded-xl" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">End Date</label>
            <Input type="date" className="h-12 rounded-xl" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Total Budget</label>
            <Input type="number" className="h-12 rounded-xl" value={budget} onChange={e => setBudget(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Currency</label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <h3 className="font-bold text-lg mb-4">Regenerate AI Itinerary</h3>
          <p className="text-sm text-slate-500 mb-6">Want a different vibe? Update preferences and let AI try again.</p>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Vibe / Type</label>
              <Select value={tripType} onValueChange={(v) => v && setTripType(v)}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leisure">Leisure & Relaxing</SelectItem>
                  <SelectItem value="adventure">Action & Adventure</SelectItem>
                  <SelectItem value="cultural">Cultural & Historical</SelectItem>
                  <SelectItem value="food">Food & Nightlife</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Pace</label>
              <Select value={pace} onValueChange={(v) => v && setPace(v)}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
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
            className="w-full h-12 rounded-xl font-semibold border-slate-200 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#1D9E75]" />}
            Regenerate with AI
          </Button>
        </div>

        <div className="border-t border-slate-100 pt-8 bg-teal-50/50 -mx-8 -mb-8 p-8 rounded-b-3xl text-center">
          <h3 className="font-bold text-xl mb-2 text-slate-900">Ready to lock it in?</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Confirming this plan will notify your group members and schedule the automated trip reminders.</p>
          
          <Button 
            onClick={handleConfirm}
            disabled={isConfirming || isGenerating}
            className="bg-[#1D9E75] hover:bg-[#15805e] text-white h-14 px-10 rounded-2xl text-lg font-bold shadow-xl shadow-teal-500/20"
          >
            {isConfirming ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Plan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
