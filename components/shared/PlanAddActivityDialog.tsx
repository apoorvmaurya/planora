"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"

interface PlanAddActivityDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  dayNumber: number
  onAddActivity: (activityData: {
    title: string
    description: string
    category: string
    time_of_day: string
    location_name: string
    duration_minutes: number
    estimated_cost: number
    lat: number
    lng: number
  }) => Promise<void>
}

export function PlanAddActivityDialog({
  isOpen,
  onOpenChange,
  dayNumber,
  onAddActivity
}: PlanAddActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [locationQuery, setLocationQuery] = useState("")
  const [locationResults, setLocationResults] = useState<any[]>([])

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
        } catch {
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
    if (!isOpen) {
      setLocationQuery("")
      setLocationResults([])
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
    }
  }, [isOpen])

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

  const handleSubmit = async () => {
    if (!newActivity.title.trim() || !newActivity.location_name.trim()) return
    setIsSubmitting(true)
    try {
      await onAddActivity(newActivity)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white font-extrabold text-2xl">
            Add Activity to Day {dayNumber}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
            Fill out the details to manually add a new activity to your itinerary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity Title</Label>
            <Input 
              placeholder="e.g. Scenic Beach Picnic" 
              value={newActivity.title} 
              onChange={e => setNewActivity({ ...newActivity, title: e.target.value })} 
              className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
            <Textarea 
              placeholder="Brief details about what to expect..." 
              value={newActivity.description} 
              onChange={e => setNewActivity({ ...newActivity, description: e.target.value })} 
              className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Time of Day</Label>
              <Select 
                value={newActivity.time_of_day} 
                onValueChange={v => v && setNewActivity({ ...newActivity, time_of_day: v })}
              >
                <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
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
              <Select 
                value={newActivity.category} 
                onValueChange={v => v && setNewActivity({ ...newActivity, category: v })}
              >
                <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="food">Food & Drink</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="leisure">Leisure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location / Venue</Label>
            <div className="relative">
              <Input 
                placeholder="Search venue or neighborhood..." 
                value={locationQuery} 
                onChange={e => {
                  setLocationQuery(e.target.value)
                  setNewActivity({ ...newActivity, location_name: e.target.value })
                }} 
                className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-9"
              />
              {isSearchingLocation && (
                <Loader2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duration (mins)</Label>
              <Input 
                type="number" 
                value={newActivity.duration_minutes} 
                onChange={e => setNewActivity({ ...newActivity, duration_minutes: parseInt(e.target.value) || 0 })} 
                className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Est. Cost</Label>
              <Input 
                type="number" 
                value={newActivity.estimated_cost} 
                onChange={e => setNewActivity({ ...newActivity, estimated_cost: parseFloat(e.target.value) || 0 })} 
                className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!newActivity.title.trim() || !newActivity.location_name.trim() || isSubmitting}
            className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Add Activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
