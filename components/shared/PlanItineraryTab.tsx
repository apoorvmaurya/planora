"use client"

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Sparkles } from "lucide-react"
import { ItineraryItemCard } from "@/components/shared/ItineraryItemCard"
import dynamic from "next/dynamic"

const MapComponent = dynamic(
  () => import("@/components/shared/MapComponent").then((mod) => mod.MapComponent),
  { ssr: false }
)

interface PlanItineraryTabProps {
  sortedItems: any[]
  days: number[]
  votes: any[]
  profile: any
  isAdmin: boolean
  isSolo: boolean
  members: any[]
  planDestination: string
  onVote: (itemId: string, vote: 'up' | 'down') => Promise<void>
  onRefreshItinerary: () => Promise<void>
  onOpenAddDialog: (dayNum: number) => void
  onAIReplan: (dayNum: number) => void
}

export function PlanItineraryTab({
  sortedItems,
  days,
  votes,
  profile,
  isAdmin,
  isSolo,
  members,
  planDestination,
  onVote,
  onRefreshItinerary,
  onOpenAddDialog,
  onAIReplan,
}: PlanItineraryTabProps) {
  const timesOfDay = ["Pre-trip", "Morning", "Afternoon", "Evening", "Night"]

  return (
    <Tabs defaultValue={days[0]?.toString() || "1"} className="w-full">
      <TabsList className="flex flex-wrap h-auto bg-transparent mb-6 gap-2">
        {days.map((dayNum: any) => (
          <TabsTrigger
            key={dayNum}
            value={dayNum.toString()}
            className="data-[state=active]:bg-[#16795A] data-[state=active]:text-white bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-6 py-2 transition-all duration-300 cursor-pointer"
          >
            Day {dayNum}
          </TabsTrigger>
        ))}
        {days.length > 0 && (
          <TabsTrigger
            value="map"
            className="data-[state=active]:bg-[#16795A] data-[state=active]:text-white bg-teal-50/50 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 rounded-full px-6 py-2 font-bold flex items-center gap-1.5 border border-teal-100 dark:border-teal-900/30 transition-all duration-300 cursor-pointer"
          >
            🗺️ Map View
          </TabsTrigger>
        )}
      </TabsList>

      {days.map((dayNum: any) => {
        const dayItems = sortedItems.filter((i) => i.day_number === dayNum)
        const approvedDayItems = dayItems.filter((i) => i.suggestion_status === "approved" || !i.suggestion_status)
        const daySuggestions = dayItems.filter((i) => i.suggestion_status === "suggestion")

        return (
          <TabsContent key={dayNum} value={dayNum.toString()} className="outline-none mt-0">
            <h2 className="sr-only">Day {dayNum} Itinerary</h2>
            <div className="pt-2 space-y-6">
              {dayItems.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 transition-colors duration-500">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    No activities planned for this day yet.
                  </p>
                  <div className="flex justify-center gap-3 mt-4">
                    <Button
                      onClick={() => onOpenAddDialog(dayNum)}
                      className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-10 px-5 font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> {isAdmin ? "Add Activity" : "Propose Activity"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {timesOfDay.map((slot) => {
                    const approvedSlotItems = approvedDayItems.filter((i) => i.time_of_day === slot)
                    const slotSuggestions = daySuggestions.filter((i) => i.time_of_day === slot)

                    if (approvedSlotItems.length === 0 && slotSuggestions.length === 0) return null

                    return (
                      <div key={slot} className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-2">
                          {slot}
                        </p>

                        {approvedSlotItems.map((item) => {
                          const alternatives = slotSuggestions.filter((s) => s.parent_item_id === item.id)

                          return (
                            <div key={item.id} className="space-y-3">
                              <ItineraryItemCard
                                item={item}
                                votes={votes.filter((v) => v.item_id === item.id)}
                                currentUserId={profile?.id}
                                isAdmin={isAdmin}
                                onVote={onVote}
                                onUpdate={onRefreshItinerary}
                                members={members}
                                isSolo={isSolo}
                              />

                              {alternatives.length > 0 && (
                                <div className="ml-6 sm:ml-8 pl-4 border-l-2 border-dashed border-teal-200 dark:border-teal-900/50 space-y-3 mb-4">
                                  <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                    💡 Proposed Alternatives ({alternatives.length})
                                  </p>
                                  {alternatives.map((altItem) => (
                                    <ItineraryItemCard
                                      key={altItem.id}
                                      item={altItem}
                                      votes={votes.filter((v) => v.item_id === altItem.id)}
                                      currentUserId={profile?.id}
                                      isAdmin={isAdmin}
                                      onVote={onVote}
                                      onUpdate={onRefreshItinerary}
                                      members={members}
                                      isSolo={isSolo}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {(() => {
                          const newProposals = slotSuggestions.filter((s) => !s.parent_item_id)
                          if (newProposals.length === 0) return null

                          return (
                            <div className="ml-6 sm:ml-8 pl-4 border-l-2 border-dashed border-teal-200 dark:border-teal-900/50 space-y-3">
                              <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                ➕ Proposed Additions ({newProposals.length})
                              </p>
                              {newProposals.map((newSug) => (
                                <ItineraryItemCard
                                  key={newSug.id}
                                  item={newSug}
                                  votes={votes.filter((v) => v.item_id === newSug.id)}
                                  currentUserId={profile?.id}
                                  isAdmin={isAdmin}
                                  onVote={onVote}
                                  onUpdate={onRefreshItinerary}
                                  members={members}
                                  isSolo={isSolo}
                                />
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}

                  <div className="flex justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <Button
                      onClick={() => onOpenAddDialog(dayNum)}
                      className="bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/10 rounded-xl h-11 px-5 font-extrabold text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4.5 h-4.5" /> {isAdmin ? "Add Activity" : "Propose Activity"}
                    </Button>
                    <Button
                      onClick={() => onAIReplan(dayNum)}
                      className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/10 rounded-xl h-11 px-5 font-extrabold text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> AI Replan Day {dayNum}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        )
      })}

      {days.length > 0 && (
        <TabsContent value="map" className="outline-none mt-0">
          <div className="pt-2">
            <MapComponent items={sortedItems} planDestination={planDestination} />
          </div>
        </TabsContent>
      )}
    </Tabs>
  )
}
