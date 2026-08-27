"use client"

import React from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Sparkles, ArrowRight, Loader2, AlertCircle } from "lucide-react"

interface EditPlanConfigFormProps {
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  budget: string
  setBudget: (v: string) => void
  currency: string
  setCurrency: (v: string) => void
  tripType: string
  setTripType: (v: string) => void
  pace: string
  setPace: (v: string) => void
  isGenerating: boolean
  isAiLoading: boolean
  onRegenerate: () => void
  object: any
  daysCount: number
  aiError: any
}

export function EditPlanConfigForm({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  budget,
  setBudget,
  currency,
  setCurrency,
  tripType,
  setTripType,
  pace,
  setPace,
  isGenerating,
  isAiLoading,
  onRegenerate,
  object,
  daysCount,
  aiError,
}: EditPlanConfigFormProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-xl shadow-slate-200/10 dark:shadow-none overflow-hidden">
      <div className="p-6 sm:p-8 space-y-6 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-[#16795A]/10 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-[#16795A]" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Trip Configuration</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust dates, budget, and preferences before regenerating.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Start Date
            </label>
            <Input
              type="date"
              className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              End Date
            </label>
            <Input
              type="date"
              className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Budget
            </label>
            <Input
              type="number"
              className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Currency
            </label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Vibe / Type
            </label>
            <Select value={tripType} onValueChange={(v) => v && setTripType(v)}>
              <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm">
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
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Pace
            </label>
            <Select value={pace} onValueChange={(v) => v && setPace(v)}>
              <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relaxed">Relaxed (1-2 things/day)</SelectItem>
                <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                <SelectItem value="packed">Packed (See everything!)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <Button
          onClick={onRegenerate}
          disabled={isGenerating || isAiLoading}
          className="w-full h-14 rounded-2xl font-extrabold text-base bg-linear-to-r from-[#16795A] to-emerald-600 hover:from-[#115E46] hover:to-emerald-700 text-white shadow-lg shadow-[#16795A]/20 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer border-0"
        >
          {isGenerating || isAiLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>AI is crafting your itinerary...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Regenerate with AI</span>
              <ArrowRight className="w-4 h-4 opacity-60" />
            </>
          )}
        </Button>

        {(isGenerating || isAiLoading) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6 space-y-3">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-[#16795A] to-emerald-400 rounded-full"
                initial={{ width: "5%" }}
                animate={{
                  width: object?.days
                    ? `${Math.min(95, (object.days.length / Math.max(1, daysCount || 3)) * 100)}%`
                    : "30%",
                }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-medium">
              {object?.days
                ? `Streaming day ${object.days.length} of ${daysCount || "..."}...`
                : "Initializing AI generation..."}
            </p>
          </motion.div>
        )}

        {aiError && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>Generation failed: {aiError.message}. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
