"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCompletion } from "@ai-sdk/react"
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
import { itinerarySchema } from "@/lib/ai/prompts"

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
  
  const [tripType, setTripType] = useState("leisure")
  const [pace, setPace] = useState("moderate")
  const [dietaryNotes, setDietaryNotes] = useState("")
  const [mustHaves, setMustHaves] = useState("")
  const [avoid, setAvoid] = useState("")

  const [isGenerating, setIsGenerating] = useState(false)
  const [planId, setPlanId] = useState<string | null>(null)

  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/plans/generate',
    onFinish: () => {
      toast.success("Itinerary generated successfully!")
    }
  })

  const object = React.useMemo(() => {
    if (!completion) return null;
    try {
      return JSON.parse(completion);
    } catch {
      const lastBracket = completion.lastIndexOf('}');
      const lastArrayBracket = completion.lastIndexOf(']');
      if (lastBracket > 0) {
        try {
          return JSON.parse(completion.substring(0, lastBracket + 1) + (lastArrayBracket < lastBracket ? ']}': '}'));
        } catch { return null; }
      }
      return null;
    }
  }, [completion]);

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

    setIsGenerating(true)
    
    complete("", {
      body: {
        destination,
        startDate,
        endDate,
        budget: parseFloat(budget),
        currency,
        groupId,
        preferences: { tripType, pace, dietaryNotes, mustHaves, avoid }
      }
    })
    
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let query = supabase.from('plans').select('id').eq('created_by', user.id).order('created_at', { ascending: false }).limit(1)
        if (groupId === 'solo') {
          query = query.is('group_id', null)
        } else {
          query = query.eq('group_id', groupId)
        }
        
        const { data } = await query.single()
        if (data) setPlanId(data.id)
      }
    }, 2000)
  }

  useEffect(() => {
    if (!isLoading && planId && completion) {
      setTimeout(() => {
        router.push(`/plans/${planId}`)
      }, 2000)
    }
  }, [isLoading, planId, completion, router])

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {!isGenerating ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Craft your plan</h1>
              <p className="text-slate-500 mt-1">Let Planora&apos;s AI build the perfect itinerary for your group.</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-[#1D9E75]' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Step 1: The Basics</h2>
                
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Where are you going?</label>
                    <Input 
                      placeholder="Search city..." 
                      className="h-12 rounded-xl text-lg"
                      value={destinationQuery}
                      onChange={(e) => {
                        setDestinationQuery(e.target.value)
                        setDestination(null)
                      }}
                    />
                    {destinationResults.length > 0 && !destination && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50">
                        {destinationResults.map((res: any, i) => (
                          <div 
                            key={i} 
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-3 text-sm text-slate-700"
                            onClick={() => {
                              setDestination({ name: res.display_name, lat: parseFloat(res.lat), lng: parseFloat(res.lon) })
                              setDestinationQuery(res.display_name.split(',')[0])
                              setDestinationResults([])
                            }}
                          >
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {res.display_name}
                          </div>
                        ))}
                      </div>
                    )}
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
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Total Budget</label>
                      <Input type="number" placeholder="e.g. 5000" className="h-12 rounded-xl" value={budget} onChange={e => setBudget(e.target.value)} />
                    </div>
                    <div className="w-32">
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Currency</label>
                      <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
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
                  <Button onClick={() => setStep(2)} disabled={!destination || !startDate || !endDate || !budget} className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl h-12 px-8">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Step 2: Who is going?</h2>
                <p className="text-slate-500">Select the group this plan belongs to. We&apos;ll use everyone's preferences to build the itinerary.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setGroupId('solo')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${groupId === 'solo' ? 'border-[#1D9E75] bg-teal-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">Just me (Solo Trip)</h3>
                      <span className="text-[10px] uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Personal</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">Plan a trip just for yourself.</p>
                  </div>
                  {groups.map(group => (
                    <div 
                      key={group.id} 
                      onClick={() => setGroupId(group.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${groupId === group.id ? 'border-[#1D9E75] bg-teal-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <h3 className="font-bold text-slate-900">{group.name}</h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{group.description || 'No description'}</p>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p className="col-span-1 md:col-span-2 text-center py-6 text-slate-500">You can also create a group from the dashboard to plan with friends!</p>
                  )}
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl h-12 px-8">Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!groupId} className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl h-12 px-8">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Step 3: Trip Preferences</h2>
                
                <div className="grid grid-cols-2 gap-6">
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
                        <SelectItem value="relaxed">Relaxed (1-2 things a day)</SelectItem>
                        <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                        <SelectItem value="packed">Packed (See everything!)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Must-haves & Ideas</label>
                  <Textarea placeholder="e.g. Must visit the Eiffel Tower, want to try authentic local pasta..." className="rounded-xl resize-none h-24" value={mustHaves} onChange={e => setMustHaves(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Things to Avoid</label>
                  <Textarea placeholder="e.g. No early mornings, avoid super touristy traps..." className="rounded-xl resize-none h-20" value={avoid} onChange={e => setAvoid(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Dietary Notes</label>
                  <Input placeholder="e.g. 2 vegetarians, 1 gluten-free..." className="h-12 rounded-xl" value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)} />
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl h-12 px-8">Back</Button>
                  <Button onClick={() => setStep(4)} className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl h-12 px-8">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Step 4: Review & Generate</h2>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">Destination:</span> <strong className="block text-slate-900">{destination?.name}</strong></div>
                    <div><span className="text-slate-500">Dates:</span> <strong className="block text-slate-900">{startDate} to {endDate}</strong></div>
                    <div><span className="text-slate-500">Budget:</span> <strong className="block text-slate-900">{budget} {currency}</strong></div>
                    <div><span className="text-slate-500">Group:</span> <strong className="block text-slate-900">{groupId === 'solo' ? 'Solo Trip' : groups.find(g => g.id === groupId)?.name}</strong></div>
                    <div><span className="text-slate-500">Type & Pace:</span> <strong className="block text-slate-900 capitalize">{tripType} • {pace}</strong></div>
                  </div>
                </div>

                <div className="bg-teal-50 text-[#1D9E75] p-4 rounded-xl flex items-start gap-3 text-sm">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Planora AI will analyze all group members&apos; locations and preferences alongside your inputs to craft a customized itinerary.</p>
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={() => setStep(3)} className="rounded-xl h-12 px-8">Back</Button>
                  <Button onClick={handleGenerate} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8 shadow-lg font-bold text-lg">
                    <Sparkles className="w-5 h-5 mr-2" /> Generate Itinerary
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-slate-900 text-white rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1D9E75]/20 to-transparent" />
            <Sparkles className="w-12 h-12 text-[#1D9E75] mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Planora AI is crafting your trip...</h2>
            <p className="text-slate-400 max-w-md mx-auto">Analyzing destinations, checking distances, optimizing budgets, and piecing together the perfect itinerary for your group.</p>
            
            <div className="w-full bg-slate-800 h-2 rounded-full mt-8 overflow-hidden">
              <motion.div 
                className="h-full bg-[#1D9E75]"
                initial={{ width: "0%" }}
                animate={{ width: isLoading ? "80%" : "100%" }}
                transition={{ duration: 10, ease: "linear" }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p>Generation failed: {error.message}. Please try again.</p>
              <Button variant="outline" onClick={() => setIsGenerating(false)} className="ml-auto bg-white">Go Back</Button>
            </div>
          )}

          {object?.days && (
            <div className="space-y-6">
              {object.days.map((day: any, i: number) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
                >
                  <h3 className="text-xl font-bold text-slate-900 mb-4 pb-4 border-b border-slate-100">Day {day.day_number}</h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {day.itinerary_items?.map((item: any, j: number) => (
                      <div key={j} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Check className="w-4 h-4 text-[#1D9E75]" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-900">{item.title}</h4>
                            <span className="text-xs font-bold text-[#1D9E75] bg-teal-50 px-2 py-1 rounded-md">{item.time_of_day}</span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{item.description}</p>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{item.location_name}</span>
                            <span>{item.duration_minutes} min • {item.estimated_cost} {currency}</span>
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
