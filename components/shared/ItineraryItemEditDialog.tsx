"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Edit2, Loader2, History, RotateCcw, Save, Trash2 } from "lucide-react"
import { PlanItem } from "@/lib/types/itinerary"

interface EditDialogProps {
  item: PlanItem
  isAdmin: boolean
  isPersonal: boolean
  onSave: (data: {
    title: string
    description: string
    time_of_day: string
    location_name: string
    duration_minutes: number
    estimated_cost: number
    lat: number
    lng: number
  }) => Promise<void>
  onDelete: () => Promise<void>
  onRevert?: (historyItem: any) => Promise<void>
}

export function ItineraryItemEditDialog({
  item,
  isAdmin,
  isPersonal,
  onSave,
  onDelete,
  onRevert
}: EditDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [locationQuery, setLocationQuery] = useState("")
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const [editData, setEditData] = useState({
    title: item.title,
    description: item.description || "",
    time_of_day: item.time_of_day || "Morning",
    location_name: item.location_name || "",
    duration_minutes: item.duration_minutes || 60,
    estimated_cost: item.estimated_cost || 0,
    lat: item.lat || 0,
    lng: item.lng || 0
  })

  const isApproved = item.suggestion_status !== "suggestion"
  const historyList = ((item as any).history as any[]) || []

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
    } else {
      setLocationQuery(item.location_name || "")
      setEditData({
        title: item.title,
        description: item.description || "",
        time_of_day: item.time_of_day || "Morning",
        location_name: item.location_name || "",
        duration_minutes: item.duration_minutes || 60,
        estimated_cost: item.estimated_cost || 0,
        lat: item.lat || 0,
        lng: item.lng || 0
      })
    }
  }, [isOpen, item])

  const handleSelectLocation = (loc: any) => {
    const name = loc.display_name.split(",")[0] || loc.display_name
    setEditData(prev => ({
      ...prev,
      location_name: name,
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lon)
    }))
    setLocationQuery(name)
    setLocationResults([])
  }

  const handleSaveClick = async () => {
    setIsSaving(true)
    try {
      await onSave(editData)
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = async () => {
    setIsDeleting(true)
    try {
      await onDelete()
      setIsOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isApproved && !isAdmin && !isPersonal ? "Propose Modification" : "Edit Activity"}
          </DialogTitle>
        </DialogHeader>

        {isAdmin && historyList.length > 0 && onRevert && (
          <div className="mb-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-teal-600" />
              Revision History
            </h4>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {historyList.map((hist: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-xs bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="truncate mr-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{hist.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(hist.saved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRestoring}
                    onClick={async () => {
                      setIsRestoring(true)
                      try {
                        await onRevert(hist)
                        setIsOpen(false)
                      } finally {
                        setIsRestoring(false)
                      }
                    }}
                    className="h-7 text-[11px] px-2 text-teal-600 hover:bg-teal-50 shrink-0"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Revert
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Activity Title</Label>
            <Input
              value={editData.title}
              onChange={e => setEditData({ ...editData, title: e.target.value })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={editData.description}
              onChange={e => setEditData({ ...editData, description: e.target.value })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none h-20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time of Day</Label>
              <Select value={editData.time_of_day} onValueChange={v => v && setEditData({ ...editData, time_of_day: v })}>
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
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
              <Label>Duration (mins)</Label>
              <Input
                type="number"
                value={editData.duration_minutes}
                onChange={e => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) || 0 })}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label>Location</Label>
              <div className="relative">
                <Input
                  value={locationQuery}
                  onChange={e => {
                    setLocationQuery(e.target.value)
                    setEditData(prev => ({ ...prev, location_name: e.target.value }))
                  }}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-9"
                />
                {isSearchingLocation && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
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
            <div className="space-y-2">
              <Label>Est. Cost</Label>
              <Input
                type="number"
                value={editData.estimated_cost}
                onChange={e => setEditData({ ...editData, estimated_cost: parseFloat(e.target.value) || 0 })}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between items-center sm:justify-between w-full mt-4">
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDeleteClick}
            className="bg-red-650 hover:bg-red-700 text-white rounded-xl h-10 px-4 flex items-center gap-1.5 cursor-pointer"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isApproved && !isAdmin && !isPersonal ? "Propose Delete" : "Delete Activity"}
          </Button>
          <Button
            disabled={isSaving}
            onClick={handleSaveClick}
            className="bg-[#16795A] hover:bg-[#115E46] rounded-xl h-10 px-5 flex items-center gap-1.5 text-white cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isApproved && !isAdmin && !isPersonal ? "Propose Alternative" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
