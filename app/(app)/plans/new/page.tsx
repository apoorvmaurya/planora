"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { autocomplete } from "@/lib/locationiq/geocode"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronRight, Loader2, MapPin, Sparkles, AlertCircle } from "lucide-react"
import { itineraryResponseSchema } from "@/lib/ai/prompts"

export default function NewPlanPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [groups, setGroups] = useState<any[]>([])
  
  const [destinationQuery, setDestinationQuery] = useState("")
  const [destinationResults, setDestinationResults] = useState<any[]>([])
  const [destination, setDestination] = useState<any>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [currency, setCurrency] = useState("USD")
  
  const [groupId, setGroupId] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const urlGroupId = params.get("groupId")
      if (urlGroupId) {
        setGroupId(urlGroupId)
      }
    }
  }, [])

  const todayStr = new Date().toISOString().split('T')[0]

  const handleStep1Next = () => {
    if (startDate < todayStr) {
      toast.error("Start date cannot be in the past.")
      return
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after the start date.")
      return
    }
    setStep(2)
  }
  
  const [tripType, setTripType] = useState("leisure")
  const [pace, setPace] = useState("moderate")
  const [dietaryNotes, setDietaryNotes] = useState("")
  const [mustHaves, setMustHaves] = useState("")
  const [avoid, setAvoid] = useState("")

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'initializing' | 'streaming' | 'saving' | 'ready'>('idle')
  const planIdRef = React.useRef<string | null>(null)

  const { object, submit, isLoading, error } = useObject({
    api: '/api/plans/generate',
    schema: itineraryResponseSchema,
    onFinish: () => {
      setGenerationStatus('saving')
      toast.info("Saving itinerary to your workspace...")
      if (planIdRef.current) {
        const pollInterval = setInterval(async () => {
          try {
            const { data } = await supabase
              .from('itinerary_items')
              .select('id')
              .eq('plan_id', planIdRef.current)
              .limit(1)
            
            if (data && data.length > 0) {
              clearInterval(pollInterval)
              setGenerationStatus('ready')
              toast.success("Itinerary generated and saved successfully!")
              setTimeout(() => {
                router.push(`/plans/${planIdRef.current}`)
              }, 2000)
            }
          } catch (err) {
            console.error("Polling database for items failed:", err)
          }
        }, 800)

        // Safety fallback (maximum 15 seconds)
        setTimeout(() => {
          clearInterval(pollInterval)
          router.push(`/plans/${planIdRef.current}`)
        }, 15000)
      }
    }
  })

  useEffect(() => {
    async function fetchGroups() {
      const res = await fetch('/api/groups')
      if (res.ok) setGroups(await res.json())
    }
    fetchGroups()
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destinationQuery.length > 2 && !destination) {
        const results = await autocomplete(destinationQuery)
        setDestinationResults(results)
      } else {
        setDestinationResults([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [destinationQuery, destination])

  const handleGenerate = async () => {
    if (!destination || !startDate || !endDate || !budget || !groupId) {
      toast.error("Please fill in all required fields")
      return
    }

    if (startDate < todayStr) {
      toast.error("Start date cannot be in the past.")
      return
    }

    if (endDate < startDate) {
      toast.error("End date must be on or after the start date.")
      return
    }

    setIsGenerating(true)
    setGenerationStatus('initializing')

    try {
      // Step 1: Create the plan and get a guaranteed plan ID
      const createRes = await fetch('/api/plans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          budget: parseFloat(budget),
          currency,
          groupId,
          preferences: { tripType, pace, dietaryNotes, mustHaves, avoid }
        })
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || "Failed to create plan")
      }

      const { planId } = await createRes.json()
      planIdRef.current = planId

      setGenerationStatus('streaming')
      // Step 2: Stream the AI itinerary generation
      submit({
        planId,
        destination,
        startDate,
        endDate,
        budget: parseFloat(budget),
        currency,
        groupId,
        preferences: { tripType, pace, dietaryNotes, mustHaves, avoid }
      })
    } catch (err: any) {
      toast.error(err.message || "Generation failed")
      setIsGenerating(false)
      setGenerationStatus('idle')
    }
  }

  const getStatusDetails = () => {
    switch (generationStatus) {
      case 'initializing':
        return {
          title: "Analyzing Destination & Setting Up...",
          description: "Evaluating regional constraints, travel pacing, and preparing your custom workspace...",
          icon: <Loader2 className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4 animate-spin" />,
          progressWidth: "15%",
          progressDuration: 1.5
        }
      case 'streaming':
        return {
          title: "Planora AI is crafting your trip...",
          description: "Streaming your itinerary from AI, optimizing distances, budgets, and sequencing daily activities...",
          icon: <Sparkles className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4 animate-pulse" />,
          progressWidth: "65%",
          progressDuration: 8
        }
      case 'saving':
        return {
          title: "Saving Itinerary to Workspace...",
          description: "Structuring the itinerary days, caching locations, and preparing your dashboard views...",
          icon: <Loader2 className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4 animate-spin" />,
          progressWidth: "90%",
          progressDuration: 3
        }
      case 'ready':
        return {
          title: "Itinerary is Ready!",
          description: "Successfully saved. Redirecting you to your beautiful new trip workspace...",
          icon: (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-[#16795A] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-900/35"
            >
              <Check className="w-8 h-8 text-white stroke-[3.5px]" />
            </motion.div>
          ),
          progressWidth: "100%",
          progressDuration: 0.5
        }
      default:
        return {
          title: "Preparing Generation...",
          description: "Starting AI generation process...",
          icon: <Sparkles className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4" />,
          progressWidth: "5%",
          progressDuration: 1
        }
    }
  }

  const statusDetails = getStatusDetails()

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-0">
      {!isGenerating ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-8 transition-colors duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-8 border-b border-slate-100 dark:border-slate-800 gap-4 transition-colors duration-500">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-550">Craft your plan</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-500">Let Planora's AI build the perfect itinerary for your group.</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`w-3 h-3 rounded-full transition-all duration-300 ${step >= s ? 'bg-[#16795A] scale-110' : 'bg-slate-200 dark:bg-slate-800'}`} />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Step 1: The Basics</h2>
                
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Where are you going?</label>
                    <Input 
                      placeholder="Search city..." 
                      className="h-12 rounded-xl text-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      value={destinationQuery}
                      onChange={(e) => {
                        setDestinationQuery(e.target.value)
                        setDestination(null)
                      }}
                    />
                    {destinationResults.length > 0 && !destination && (
                      <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden z-50 transition-colors duration-500">
                        {destinationResults.map((res: any, i) => (
                          <div 
                            key={i} 
                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer border-b border-slate-50 dark:border-slate-900 last:border-0 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 transition-colors duration-200"
                            onClick={() => {
                              setDestination({ name: res.display_name, lat: parseFloat(res.lat), lng: parseFloat(res.lon) })
                              setDestinationQuery(res.display_name.split(',')[0])
                              setDestinationResults([])
                            }}
                          >
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{res.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Start Date</label>
                      <Input type="date" min={todayStr} className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">End Date</label>
                      <Input type="date" min={startDate || todayStr} className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Total Budget</label>
                      <Input type="number" placeholder="e.g. 5000" className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={budget} onChange={e => setBudget(e.target.value)} />
                    </div>
                    <div className="w-32">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Currency</label>
                      <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                        <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button onClick={handleStep1Next} disabled={!destination || !startDate || !endDate || !budget} className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 px-8 shadow-sm">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Step 2: Who is going?</h2>
                <p className="text-slate-500 dark:text-slate-400 transition-colors duration-500">Select the group this plan belongs to. We'll use everyone's preferences to build the itinerary.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setGroupId('solo')}
                    className={`p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                      groupId === 'solo' 
                        ? 'border-[#16795A] bg-teal-50/50 dark:bg-teal-950/20 shadow-md shadow-teal-500/5' 
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-extrabold text-slate-900 dark:text-white transition-colors duration-500">Just me (Solo Trip)</h3>
                      <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">Personal</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">Plan a trip just for yourself.</p>
                  </div>
                  {groups.map(group => (
                    <div 
                      key={group.id} 
                      onClick={() => setGroupId(group.id)}
                      className={`p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                        groupId === group.id 
                          ? 'border-[#16795A] bg-teal-50/50 dark:bg-teal-950/20 shadow-md shadow-teal-500/5' 
                          : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                      }`}
                    >
                      <h3 className="font-extrabold text-slate-900 dark:text-white transition-colors duration-500">{group.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{group.description || 'No description'}</p>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p className="col-span-1 md:col-span-2 text-center py-6 text-slate-500 dark:text-slate-400">You can also create a group from the dashboard to plan with friends!</p>
                  )}
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl h-12 px-8 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors duration-300">Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!groupId} className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 px-8 shadow-sm">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Step 3: Trip Preferences</h2>
                
                <div className="grid grid-cols-2 gap-6">
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
                        <SelectItem value="relaxed">Relaxed (1-2 things a day)</SelectItem>
                        <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                        <SelectItem value="packed">Packed (See everything!)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Must-haves & Ideas</label>
                  <Textarea placeholder="e.g. Must visit the Eiffel Tower, want to try authentic local pasta..." className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none h-24 text-slate-900 dark:text-white" value={mustHaves} onChange={e => setMustHaves(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Things to Avoid</label>
                  <Textarea placeholder="e.g. No early mornings, avoid super touristy traps..." className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none h-20 text-slate-900 dark:text-white" value={avoid} onChange={e => setAvoid(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">Dietary Notes</label>
                  <Input placeholder="e.g. 2 vegetarians, 1 gluten-free..." className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)} />
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl h-12 px-8 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors duration-300">Back</Button>
                  <Button onClick={() => setStep(4)} className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 px-8 shadow-sm">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Step 4: Review & Generate</h2>
                
                <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-500">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500 dark:text-slate-400">Destination:</span> <strong className="block text-slate-900 dark:text-white transition-colors duration-500">{destination?.name}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">Dates:</span> <strong className="block text-slate-900 dark:text-white transition-colors duration-500">{startDate} to {endDate}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">Budget:</span> <strong className="block text-slate-900 dark:text-white transition-colors duration-500">{budget} {currency}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">Group:</span> <strong className="block text-slate-900 dark:text-white transition-colors duration-500">{groupId === 'solo' ? 'Solo Trip' : groups.find(g => g.id === groupId)?.name}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">Type & Pace:</span> <strong className="block text-slate-900 dark:text-white capitalize transition-colors duration-500">{tripType} • {pace}</strong></div>
                  </div>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 p-4 rounded-xl flex items-start gap-3 text-sm transition-colors duration-500">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Planora AI will analyze all group members' locations and preferences alongside your inputs to craft a customized itinerary.</p>
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={() => setStep(3)} className="rounded-xl h-12 px-8 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors duration-300">Back</Button>
                  <Button onClick={handleGenerate} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl h-12 px-8 shadow-md font-extrabold text-base flex items-center justify-center gap-2 transition-colors duration-500">
                    <Sparkles className="w-5 h-5 shrink-0" /> Generate Itinerary
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-slate-900 dark:bg-gradient-to-br dark:from-[#0b1b17] dark:via-slate-900 dark:to-slate-950 text-white rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl border border-transparent dark:border-slate-800/80 transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#16795A]/10 to-transparent pointer-events-none" />
            {statusDetails.icon}
            <h2 className="text-2xl font-bold mb-2">{statusDetails.title}</h2>
            <p className="text-slate-400 dark:text-slate-400 max-w-md mx-auto">{statusDetails.description}</p>
            
            <div className="w-full bg-slate-800 dark:bg-slate-950/80 h-2 rounded-full mt-8 overflow-hidden transition-colors duration-500">
              <motion.div 
                className="h-full bg-[#16795A]"
                initial={{ width: "0%" }}
                animate={{ width: statusDetails.progressWidth }}
                transition={{ duration: statusDetails.progressDuration, ease: "easeInOut" }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 border border-red-500/10 transition-colors duration-500">
              <AlertCircle className="w-5 h-5" />
              <p>Generation failed: {error.message}. Please try again.</p>
              <Button variant="outline" onClick={() => setIsGenerating(false)} className="ml-auto bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">Go Back</Button>
            </div>
          )}

          {object?.days && (
            <div className="space-y-6">
              {object.days.map((day: any, i: number) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-500"
                >
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 transition-colors duration-500">Day {day.day_number}</h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                    {day.itinerary_items?.map((item: any, j: number) => (
                      <div key={j} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors duration-500">
                          <Check className="w-4 h-4 text-[#16795A]" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 transition-colors duration-500">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white transition-colors duration-500">{item.title}</h4>
                            <span className="text-xs font-bold text-[#16795A] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 px-2 py-1 rounded-md shrink-0 transition-colors duration-500">{item.time_of_day}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 transition-colors duration-500">{item.description}</p>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-500">
                            <span className="flex items-center truncate mr-2"><MapPin className="w-3 h-3 mr-1 text-slate-400 dark:text-slate-500 shrink-0" />{item.location_name}</span>
                            <span className="shrink-0">{item.duration_minutes} min • {item.estimated_cost} {currency}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
