"use client"

import React from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight } from "lucide-react"

interface PlanNewStepPreferencesProps {
  step: number
  setStep: (s: number) => void
  groupId: string
  setGroupId: (g: string) => void
  groups: any[]
  tripType: string
  setTripType: (t: string) => void
  pace: string
  setPace: (p: string) => void
  mustHaves: string
  setMustHaves: (m: string) => void
  avoid: string
  setAvoid: (a: string) => void
  dietaryNotes: string
  setDietaryNotes: (d: string) => void
}

export function PlanNewStepPreferences({
  step,
  setStep,
  groupId,
  setGroupId,
  groups,
  tripType,
  setTripType,
  pace,
  setPace,
  mustHaves,
  setMustHaves,
  avoid,
  setAvoid,
  dietaryNotes,
  setDietaryNotes,
}: PlanNewStepPreferencesProps) {
  if (step === 2) {
    return (
      <motion.div
        key="step2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">
          Step 2: Who is going?
        </h2>
        <p className="text-slate-500 dark:text-slate-400 transition-colors duration-500">
          Select the group this plan belongs to. We&apos;ll use everyone&apos;s preferences to build the itinerary.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setGroupId("solo")}
            className={`p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
              groupId === "solo"
                ? "border-[#16795A] bg-teal-50/50 dark:bg-teal-950/20 shadow-md shadow-teal-500/5"
                : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-950"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-extrabold text-slate-900 dark:text-white transition-colors duration-500">
                Just me (Solo Trip)
              </h3>
              <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                Personal
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">Plan a trip just for yourself.</p>
          </div>
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => setGroupId(group.id)}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                groupId === group.id
                  ? "border-[#16795A] bg-teal-50/50 dark:bg-teal-950/20 shadow-md shadow-teal-500/5"
                  : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-950"
              }`}
            >
              <h3 className="font-extrabold text-slate-900 dark:text-white transition-colors duration-500">
                {group.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {group.description || "No description"}
              </p>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="col-span-1 md:col-span-2 text-center py-6 text-slate-500 dark:text-slate-400">
              You can also create a group from the dashboard to plan with friends!
            </p>
          )}
        </div>

        <div className="flex justify-between pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep(1)}
            className="rounded-xl h-12 px-8 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors duration-300"
          >
            Back
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={!groupId}
            className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 px-8 shadow-sm"
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">
        Step 3: Trip Preferences
      </h2>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
            Vibe / Type
          </label>
          <Select value={tripType} onValueChange={(v) => v && setTripType(v)}>
            <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leisure">Leisure & Relaxing</SelectItem>
              <SelectItem value="adventure">Action & Adventure</SelectItem>
              <SelectItem value="cultural">Cultural & Historical</SelectItem>
              <SelectItem value="food">Food & Nightlife</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
            Pace
          </label>
          <Select value={pace} onValueChange={(v) => v && setPace(v)}>
            <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relaxed">Relaxed (1-2 things a day)</SelectItem>
              <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
              <SelectItem value="packed">Packed (See everything!)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
          Must-haves & Ideas
        </label>
        <Textarea
          placeholder="e.g. Must visit the Eiffel Tower, want to try authentic local pasta..."
          className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none h-24 text-slate-900 dark:text-white"
          value={mustHaves}
          onChange={(e) => setMustHaves(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
          Things to Avoid
        </label>
        <Textarea
          placeholder="e.g. No early mornings, avoid super touristy traps..."
          className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none h-20 text-slate-900 dark:text-white"
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 transition-colors duration-500">
          Dietary Notes
        </label>
        <Input
          placeholder="e.g. 2 vegetarians, 1 gluten-free..."
          className="h-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          value={dietaryNotes}
          onChange={(e) => setDietaryNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-between pt-6">
        <Button
          variant="ghost"
          onClick={() => setStep(2)}
          className="rounded-xl h-12 px-8 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors duration-300"
        >
          Back
        </Button>
        <Button
          onClick={() => setStep(4)}
          className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 px-8 shadow-sm"
        >
          Next <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
