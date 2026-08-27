"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plane, Train, Bus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { queueOfflineOp, offlineDB } from "@/lib/supabase/offlineSync"
import { handleApiError } from "@/lib/errors"

interface TransitPanelProps {
  planId: string
  groupId?: string | null
  profile: any
  members?: any[]
  onTransitAdded?: () => void
  destinationName?: string
}

export function TransitPanel({
  planId,
  groupId,
  profile,
  onTransitAdded,
  destinationName = "Destination"
}: TransitPanelProps) {
  const [homeCityInput, setHomeCityInput] = useState("")
  const [isEditingCity, setIsEditingCity] = useState(false)
  const [isSavingCity, setIsSavingCity] = useState(false)
  const [transitLoading, setTransitLoading] = useState<Record<string, boolean>>({})
  const [transitOptions, setTransitOptions] = useState<Record<string, any[]>>({})
  const [transitAdding, setTransitAdding] = useState<Record<string, boolean>>({})

  const handleSaveCity = async () => {
    if (!homeCityInput.trim()) return
    setIsSavingCity(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: homeCityInput.trim() })
      })
      if (!res.ok) throw new Error("Failed to update home city")
      if (profile) profile.city = homeCityInput.trim()
      setIsEditingCity(false)
      toast.success("Home city updated!")
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Failed to update city"))
    } finally {
      setIsSavingCity(false)
    }
  }

  const handleGenerateTransit = async (userId: string, originCity: string) => {
    if (!originCity) {
      toast.error("Please specify a departure city first.")
      return
    }
    setTransitLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const res = await fetch(`/api/plans/${planId}/transit?city=${encodeURIComponent(originCity)}`)
      if (!res.ok) throw new Error("Failed to fetch transit options")
      const data = await res.json()
      setTransitOptions(prev => ({ ...prev, [userId]: data.options || [] }))
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Could not suggest transit"))
    } finally {
      setTransitLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleAddTransitItem = async (opt: any, idx: number) => {
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
        const cached = await offlineDB.items.get(planId)
        const next = [...(cached?.data || []), tempItem]
        await offlineDB.items.put({ id: planId, planId, data: next })
        await queueOfflineOp(planId, 'CREATE_ITEM', payload)
        toast.info("Offline: Transit added and queued for sync")
        onTransitAdded?.()
      } catch (err: unknown) {
        toast.error(handleApiError(err, "Failed to add transit offline"))
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
      if (!res.ok) throw new Error("Failed to add transit")
      toast.success("Transit item added to Day 1!")
      onTransitAdded?.()
    } catch (err: unknown) {
      toast.error(handleApiError(err, "Error adding transit item"))
    } finally {
      setTransitAdding(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900/55 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 transition-colors duration-500 space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Getting There</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Coordinate and manage travel options to {destinationName} independently without cluttering the group schedule.
        </p>
      </div>

      <div className={groupId ? "grid md:grid-cols-2 gap-6 items-start" : "max-w-3xl mx-auto space-y-6"}>
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-col w-full min-w-0 overflow-hidden">
          <div className="w-full min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
                ✈️
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Your Travel Planner</h4>
                <p className="text-xs text-slate-400">Personal routes and connections</p>
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
                        onChange={(e) => setHomeCityInput(e.target.value)} 
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

                {transitOptions[profile.id] && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 grid gap-3 w-full min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Transit Suggestions</p>
                    {transitOptions[profile.id].map((opt: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/60 w-full min-w-0 overflow-hidden">
                        {opt.type === 'flight' ? <Plane className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" /> : 
                         opt.type === 'train' ? <Train className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" /> : 
                         <Bus className="w-5 h-5 text-[#16795A] mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 wrap-break-word leading-snug">{opt.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 wrap-break-word leading-relaxed">{opt.details}</p>
                          <span className="inline-block text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md mt-1 border border-indigo-100/30 dark:border-indigo-900/10 shadow-sm">
                            Est: {opt.cost}
                          </span>
                        </div>
                        <button
                          disabled={transitAdding[`${profile.id}_${idx}`]}
                          onClick={() => handleAddTransitItem(opt, idx)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold shrink-0 cursor-pointer"
                        >
                          {transitAdding[`${profile.id}_${idx}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "+ Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Set your home departure city to explore transit options.</p>
                <div className="flex gap-2">
                  <Input
                    value={homeCityInput}
                    onChange={(e) => setHomeCityInput(e.target.value)}
                    placeholder="Enter home city..."
                    className="rounded-xl h-10 bg-white dark:bg-slate-900"
                  />
                  <Button
                    onClick={handleSaveCity}
                    disabled={isSavingCity}
                    className="bg-[#16795A] hover:bg-[#115E46] text-white h-10 px-4 rounded-xl"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
