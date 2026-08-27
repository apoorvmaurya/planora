"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronRight, Loader2, MapPin, X } from "lucide-react"

interface PlanNewStepBasicsProps {
  destination: any
  setDestination: (dest: any) => void
  destinationQuery: string
  setDestinationQuery: (q: string) => void
  startDate: string
  setStartDate: (d: string) => void
  endDate: string
  setEndDate: (d: string) => void
  budget: string
  setBudget: (b: string) => void
  currency: string
  setCurrency: (c: string) => void
  onNext: () => void
}

export function PlanNewStepBasics({
  destination,
  setDestination,
  destinationQuery,
  setDestinationQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  budget,
  setBudget,
  currency,
  setCurrency,
  onNext,
}: PlanNewStepBasicsProps) {
  const [destinationResults, setDestinationResults] = useState<any[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const todayStr = new Date().toISOString().split("T")[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(false)
        setActiveSuggestionIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (destinationQuery.length > 2 && !destination) {
        setIsSearchingLocation(true)
        try {
          const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(destinationQuery)}`)
          if (res.ok) {
            const data = await res.json()
            setDestinationResults(data || [])
          } else {
            setDestinationResults([])
          }
        } catch {
          setDestinationResults([])
        } finally {
          setIsSearchingLocation(false)
        }
      } else {
        setDestinationResults([])
      }
    }, 450)

    return () => clearTimeout(delayDebounceFn)
  }, [destinationQuery, destination])

  const handleSelectSuggestion = (loc: any) => {
    setDestination({
      name: loc.display_name,
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lon),
    })
    setDestinationQuery(loc.display_name)
    setOpenDropdown(false)
    setActiveSuggestionIndex(-1)
  }

  const handleSelectCustom = () => {
    if (!destinationQuery) return
    setDestination({
      name: destinationQuery,
      lat: 0,
      lng: 0,
    })
    setOpenDropdown(false)
    setActiveSuggestionIndex(-1)
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, "gi"))
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="font-bold text-[#16795A] dark:text-teal-400 underline">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openDropdown) return
    const totalItems = destinationResults.length + 1
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev + 1) % totalItems)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev - 1 + totalItems) % totalItems)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < destinationResults.length) {
        handleSelectSuggestion(destinationResults[activeSuggestionIndex])
      } else {
        handleSelectCustom()
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpenDropdown(false)
      setActiveSuggestionIndex(-1)
    }
  }

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">
        Step 1: The Basics
      </h2>

      <div className="space-y-4">
        <div className="relative" ref={dropdownRef}>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
            Where are you going?
          </label>
          <div className="relative">
            <Input
              placeholder="Search city..."
              className="h-12 rounded-xl text-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-20 focus-visible:ring-[#16795A]"
              value={destinationQuery}
              onChange={(e) => {
                setDestinationQuery(e.target.value)
                setDestination(null)
                setOpenDropdown(true)
              }}
              onFocus={() => {
                if (destinationQuery.length > 0) setOpenDropdown(true)
              }}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
              {isSearchingLocation && (
                <Loader2 className="w-4 h-4 text-slate-400 dark:text-slate-550 animate-spin shrink-0" />
              )}
              {destination && !isSearchingLocation && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {destinationQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinationQuery("")
                    setDestination(null)
                    setDestinationResults([])
                    setOpenDropdown(false)
                    setActiveSuggestionIndex(-1)
                  }}
                  className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  aria-label="Clear location input"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </div>
          </div>

          {openDropdown && (destinationResults.length > 0 || destinationQuery.length > 2) && (
            <div className="absolute top-full mt-2 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-150 dark:border-slate-800 shadow-2xl overflow-hidden z-50 transition-all duration-300">
              <div className="max-h-72 overflow-y-auto">
                {destinationResults.map((res: any, i) => {
                  const isActive = i === activeSuggestionIndex
                  return (
                    <div
                      key={i}
                      className={`px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-900/60 last:border-0 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-350 transition-colors duration-250 ${
                        isActive
                          ? "bg-slate-100/80 dark:bg-slate-900/80 text-slate-950 dark:text-white"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      }`}
                      onClick={() => handleSelectSuggestion(res)}
                    >
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate">{highlightMatch(res.display_name, destinationQuery)}</span>
                    </div>
                  )
                })}

                {destinationResults.length === 0 && !isSearchingLocation && destinationQuery.length > 2 && (
                  <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-550 italic border-b border-slate-100 dark:border-slate-900">
                    No exact matches found. You can still use the custom option below.
                  </div>
                )}

                <div
                  className={`px-4 py-3 cursor-pointer flex items-center gap-3 text-sm font-semibold transition-colors duration-250 ${
                    activeSuggestionIndex === destinationResults.length
                      ? "bg-teal-50/80 dark:bg-teal-950/40 text-[#16795A] dark:text-teal-400"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  }`}
                  onClick={handleSelectCustom}
                >
                  <MapPin className="w-4 h-4 text-[#16795A] dark:text-teal-400 shrink-0" />
                  <span className="truncate flex items-center gap-1.5">
                    Use custom location:{" "}
                    <strong className="text-slate-900 dark:text-slate-100 italic font-bold font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                      &ldquo;{destinationQuery}&rdquo;
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
              Start Date
            </label>
            <Input
              type="date"
              min={todayStr}
              className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
              End Date
            </label>
            <Input
              type="date"
              min={startDate || todayStr}
              className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
              Total Budget
            </label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
              Currency
            </label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectValue />
              </SelectTrigger>
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
        <Button
          onClick={onNext}
          disabled={!destination || !startDate || !endDate || !budget}
          className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 px-8 shadow-sm"
        >
          Next <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
