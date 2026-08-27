"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, CheckCircle2, XCircle, Lock, MapPin, Loader2, Lightbulb, Check } from "lucide-react"

interface EditPlanComparisonPanelProps {
  isAiLoading: boolean
  object: any
  isAdmin: boolean
  daysList: number[]
  dayChoice: Record<number, 'current' | 'new'>
  setDayChoice: React.Dispatch<React.SetStateAction<Record<number, 'current' | 'new'>>>
  currentItems: any[]
  currency: string
  isSavingMerge: boolean
  onCancelReview: () => void
  onSaveMerge: () => Promise<void>
}

const categoryColors: Record<string, string> = {
  activity: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
  food: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
  transport: "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30",
  accommodation: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
  leisure: "bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/30",
}

const categoryEmoji: Record<string, string> = {
  activity: "🏛️",
  food: "🍽️",
  transport: "🚌",
  accommodation: "🏨",
  leisure: "🌿",
}

export function EditPlanComparisonPanel({
  isAiLoading,
  object,
  isAdmin,
  daysList,
  dayChoice,
  setDayChoice,
  currentItems,
  currency,
  isSavingMerge,
  onCancelReview,
  onSaveMerge,
}: EditPlanComparisonPanelProps) {
  const selectedNewCount = daysList.filter(d => (dayChoice[d] || 'new') === 'new').length
  const selectedKeepCount = daysList.filter(d => dayChoice[d] === 'current').length

  return (
    <AnimatePresence>
      {(isAiLoading || object?.days) && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 p-6 sm:p-8 shadow-xl shadow-slate-200/10 dark:shadow-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#16795A] to-emerald-600 flex items-center justify-center shadow-lg shadow-[#16795A]/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-extrabold text-xl text-slate-900 dark:text-white">Review AI Suggestions</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAdmin
                      ? "Compare and cherry-pick what to keep. Your selection will replace the current itinerary."
                      : "Compare and propose changes. Your selection will be submitted as suggestions for the group."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allNew: Record<number, 'current' | 'new'> = {}
                    daysList.forEach(d => { allNew[d] = 'new' })
                    setDayChoice(allNew)
                  }}
                  className="text-xs font-bold rounded-xl border-emerald-200 dark:border-emerald-900/40 text-[#16795A] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer h-9 px-4"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Accept All New
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allCurrent: Record<number, 'current' | 'new'> = {}
                    daysList.forEach(d => { allCurrent[d] = 'current' })
                    setDayChoice(allCurrent)
                  }}
                  className="text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer h-9 px-4"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Keep All Original
                </Button>
              </div>
            </div>

            {object?.title && (
              <div className="bg-linear-to-r from-teal-50 to-emerald-50 dark:from-teal-950/15 dark:to-emerald-950/15 border border-teal-100 dark:border-teal-900/30 p-4 rounded-2xl flex items-center justify-between mb-6">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#16795A]/70">AI Suggested Title</span>
                  <p className="font-extrabold text-slate-900 dark:text-white text-lg">{object.title}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 italic bg-white/60 dark:bg-slate-950/40 px-3 py-1 rounded-full">
                  {isAdmin ? 'Will replace current title' : 'Title suggestion only'}
                </span>
              </div>
            )}

            {daysList.length > 0 && !isAiLoading && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-50 dark:bg-slate-950/30 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800/60">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{daysList.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Days</p>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-2xl font-black text-[#16795A]">{selectedNewCount}</p>
                  <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Using AI New</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/30 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800/60">
                  <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{selectedKeepCount}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keeping Original</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {daysList.map((dayNum, dayIdx) => {
              const choice = dayChoice[dayNum] || 'new'
              const dayCurrentItems = currentItems.filter(i => i.day_number === dayNum)
              const dayNewObj = object?.days?.find((d: any) => d?.day_number === dayNum)
              const dayNewItems = dayNewObj?.itinerary_items || []

              return (
                <motion.div
                  key={dayNum}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIdx * 0.08 }}
                  className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-lg shadow-slate-200/10 dark:shadow-none overflow-hidden"
                >
                  <div className="px-6 py-4 bg-linear-to-r from-slate-50 to-transparent dark:from-slate-800/30 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center">
                        <span className="text-sm font-black text-white dark:text-slate-900">{dayNum}</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-200">Day {dayNum}</h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {dayCurrentItems.length} current • {dayNewItems.length} new activities
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-64 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setDayChoice(prev => ({ ...prev, [dayNum]: 'current' }))}
                        className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                          choice === 'current'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Lock className="w-3 h-3" /> Keep Current
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayChoice(prev => ({ ...prev, [dayNum]: 'new' }))}
                        className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                          choice === 'new'
                            ? 'bg-[#16795A] text-white shadow-sm shadow-[#16795A]/25'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" /> Use AI New
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/60">
                    <div className={`p-5 space-y-2.5 transition-all duration-300 ${
                      choice === 'current' ? 'opacity-100' : 'opacity-40 grayscale-30'
                    }`}>
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Original Itinerary
                      </div>
                      {dayCurrentItems.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          No activities planned
                        </div>
                      ) : (
                        dayCurrentItems.map((item, idx) => (
                          <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-xs space-y-2 border border-slate-100 dark:border-slate-800/60">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm">{categoryEmoji[item.category] || '📍'}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${categoryColors[item.category] || categoryColors.activity}`}>
                                {item.time_of_day}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{item.location_name}</span>
                              <span className="shrink-0">{item.duration_minutes}m</span>
                              <span className="shrink-0">{item.estimated_cost} {currency}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={`p-5 space-y-2.5 transition-all duration-300 ${
                      choice === 'new' ? 'opacity-100' : 'opacity-40 grayscale-30'
                    }`}>
                      <div className="text-[10px] font-extrabold text-emerald-500/80 uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16795A]" />
                          AI Proposed
                        </span>
                        {isAiLoading && !dayNewObj && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16795A]" />}
                      </div>
                      {dayNewItems.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-8 text-center bg-emerald-50/30 dark:bg-emerald-950/10 rounded-2xl border border-dashed border-emerald-100 dark:border-emerald-900/30">
                          {isAiLoading ? "Generating..." : "No suggestions for this day"}
                        </div>
                      ) : (
                        dayNewItems.map((item: any, idx: number) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl text-xs space-y-2 border border-emerald-100 dark:border-emerald-900/30 shadow-sm"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm">{categoryEmoji[item?.category] || '📍'}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item?.title}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${categoryColors[item?.category] || categoryColors.activity}`}>
                                {item?.time_of_day}
                              </span>
                            </div>
                            {item?.description && (
                              <p className="text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{item?.location_name}</span>
                              <span className="shrink-0">{item?.duration_minutes}m</span>
                              <span className="shrink-0">{item?.estimated_cost} {currency}</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {!isAiLoading && object?.days && (
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 p-6 sm:p-8 shadow-xl shadow-slate-200/10 dark:shadow-none"
            >
              {!isAdmin && (
                <div className="mb-6 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Member Suggestion Mode</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Your selections will be submitted as proposals for the group to vote on.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button
                  variant="outline"
                  onClick={onCancelReview}
                  className="rounded-xl h-12 px-6 border-slate-200 dark:border-slate-800 cursor-pointer w-full sm:w-auto"
                >
                  Cancel Review
                </Button>
                <Button
                  onClick={onSaveMerge}
                  disabled={isSavingMerge}
                  className="rounded-2xl bg-linear-to-r from-[#16795A] to-emerald-600 hover:from-[#115E46] hover:to-emerald-700 text-white font-extrabold h-14 px-10 shadow-lg shadow-[#16795A]/20 cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2.5 text-base border-0"
                >
                  {isSavingMerge ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isAdmin ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Lightbulb className="w-5 h-5" />
                  )}
                  {isAdmin ? 'Save & Merge Itinerary' : 'Propose as Suggestions'}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
