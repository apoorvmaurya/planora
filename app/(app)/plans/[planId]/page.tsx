"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"
import { ErrorState } from "@/components/shared/ErrorState"
import confetti from "canvas-confetti"
import { queueOfflineOp, offlineDB } from "@/lib/supabase/offlineSync"
import { usePlanDetails } from "@/hooks/usePlanDetails"
import { PlanChatDrawer } from "@/components/shared/PlanChatDrawer"
import { TransitPanel } from "@/components/shared/TransitPanel"
import { PlanAdminSheet } from "@/components/shared/PlanAdminSheet"
import { PlanAddActivityDialog } from "@/components/shared/PlanAddActivityDialog"
import { PlanActivityLogDrawer } from "@/components/shared/PlanActivityLogDrawer"
import { PlanItineraryTab } from "@/components/shared/PlanItineraryTab"
import { PlanSidebar } from "@/components/shared/PlanSidebar"
import { PlanHeaderBanner } from "@/components/shared/PlanHeaderBanner"
import { PlanAlertDialogs } from "@/components/shared/PlanAlertDialogs"

export default function PlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.planId as string
  const supabase = createClient()
  const { profile } = useUserStore()

  const {
    plan,
    setPlan,
    members,
    setMembers,
    items,
    setItems,
    votes,
    setVotes,
    onlineUsers,
    isLoading,
    activityLogs,
    setActivityLogs,
    refreshItinerary,
  } = usePlanDetails(planId, profile)

  const [revertingLogIds, setRevertingLogIds] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [adminSheetOpen, setAdminSheetOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDayForAdd, setSelectedDayForAdd] = useState(1)
  const [kickTarget, setKickTarget] = useState<any>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleVote = async (itemId: string, vote: "up" | "down") => {
    if (!profile?.id) return

    const existingIndex = votes.findIndex((v) => v.item_id === itemId && v.user_id === profile.id)
    const newVotes = [...votes]

    if (existingIndex > -1) {
      const existing = votes[existingIndex]
      if (existing.vote === vote) {
        newVotes.splice(existingIndex, 1)
      } else {
        newVotes[existingIndex] = { ...existing, vote }
      }
    } else {
      newVotes.push({
        id: "temp-id-" + Date.now(),
        plan_id: planId,
        item_id: itemId,
        user_id: profile.id,
        vote,
        created_at: new Date().toISOString(),
      })
    }

    setVotes(newVotes)
    await offlineDB.votes.put({ id: planId, planId, data: newVotes })

    if (!navigator.onLine) {
      await queueOfflineOp(planId, "VOTE", { item_id: itemId, vote })
      toast.info("Offline: Vote queued for synchronization")
      return
    }

    try {
      const res = await fetch(`/api/plans/${planId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, vote }),
      })

      if (res.ok) {
        const { data: vData } = await supabase.from("member_votes").select("*").eq("plan_id", planId)
        if (vData) {
          setVotes(vData)
          await offlineDB.votes.put({ id: planId, planId, data: vData })
        }
        const { data: iData } = await supabase
          .from("itinerary_items")
          .select("*")
          .eq("plan_id", planId)
          .order("day_number")
          .order("sort_order")
        if (iData) {
          setItems(iData)
          await offlineDB.items.put({ id: planId, planId, data: iData })
        }
      } else {
        toast.error("Failed to vote")
        const { data: vData } = await supabase.from("member_votes").select("*").eq("plan_id", planId)
        if (vData) setVotes(vData)
      }
    } catch {
      await queueOfflineOp(planId, "VOTE", { item_id: itemId, vote })
      toast.info("Network dropped. Vote queued for synchronization")
    }
  }

  const handleManualAddActivity = async (activityData: any) => {
    const payload = {
      ...activityData,
      day_number: selectedDayForAdd,
    }

    if (!navigator.onLine) {
      try {
        const tempItem = {
          id: "temp-item-" + Date.now(),
          plan_id: planId,
          user_id: null,
          sort_order: 99,
          ...payload,
        }
        setItems((prev) => {
          const next = [...prev, tempItem].sort(
            (a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order
          )
          offlineDB.items.put({ id: planId, planId, data: next })
          return next
        })
        await queueOfflineOp(planId, "MANUAL_ADD_ITEM", payload)
        toast.info("Offline: Activity queued for synchronization")
      } catch (err) {
        console.error("Offline manual add failed:", err)
        toast.error("Failed to add activity offline")
      }
      return
    }

    try {
      const res = await fetch(`/api/plans/${planId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(
          data.item?.suggestion_status === "suggestion"
            ? "Suggestion proposed to group!"
            : "Activity added to itinerary!"
        )
        await refreshItinerary()
      } else {
        toast.error(data.error || "Failed to add activity")
      }
    } catch {
      toast.error("Failed to add activity due to a network error")
    }
  }

  const handleRevertChange = async (logId: string) => {
    const confirmRevert = window.confirm("Are you sure you want to revert this change?")
    if (!confirmRevert) return

    setRevertingLogIds((prev) => [...prev, logId])
    try {
      const res = await fetch(`/api/plans/${planId}/history/${logId}/revert`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Reverted successfully!")
        await refreshItinerary()
        const { data: logData } = await supabase
          .from("plan_activity_logs")
          .select("*")
          .eq("plan_id", planId)
          .order("created_at", { ascending: false })
        if (logData) setActivityLogs(logData)
      } else {
        toast.error(data.error || "Failed to revert change")
      }
    } catch {
      toast.error("Failed to revert change due to a network error")
    } finally {
      setRevertingLogIds((prev) => prev.filter((id) => id !== logId))
    }
  }

  const handleConfirmPlan = async () => {
    setAdminSheetOpen(false)
    const res = await fetch(`/api/plans/${planId}/confirm`, { method: "POST" })
    if (res.ok) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
      toast.success("Plan confirmed!")
      setPlan((p: any) => ({ ...p, status: "confirmed" }))
    } else {
      toast.error("Failed to confirm")
    }
  }

  const handleMarkCompleted = async () => {
    setAdminSheetOpen(false)
    const res = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    if (res.ok) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
      toast.success("Trip marked as completed! 🎉")
      setPlan((p: any) => ({ ...p, status: "completed" }))
    } else {
      toast.error("Failed to update")
    }
  }

  const handleConfirmKick = async () => {
    const res = await fetch(`/api/groups/${plan.group_id}/members?userId=${kickTarget?.id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      toast.success("Member removed")
      setMembers((prev) => prev.filter((p) => (p.user?.id || p.id) !== kickTarget?.id))
    } else {
      toast.error("Failed to remove member")
    }
    setKickTarget(null)
  }

  const handleConfirmCancel = async () => {
    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Plan cancelled")
      setPlan((p: any) => ({ ...p, status: "cancelled" }))
    } else {
      toast.error("Failed to cancel")
    }
    setShowCancelDialog(false)
  }

  const handleConfirmDelete = async () => {
    const res = await fetch(`/api/plans/${planId}?permanent=true`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Plan deleted")
      router.push("/plans")
    } else {
      toast.error("Failed to delete")
    }
    setShowDeleteDialog(false)
  }

  const visibleItems = useMemo(() => {
    return items.filter((i) => i.user_id === null || i.user_id === profile?.id)
  }, [items, profile?.id])

  const sortedItems = useMemo(() => {
    return [...visibleItems].sort((a, b) => {
      if (a.day_number !== b.day_number) return a.day_number - b.day_number
      const timeOrder: Record<string, number> = {
        "Pre-trip": 0,
        Morning: 1,
        Afternoon: 2,
        Evening: 3,
        Night: 4,
      }
      const weightA = timeOrder[a.time_of_day] ?? 1
      const weightB = timeOrder[b.time_of_day] ?? 1
      if (weightA !== weightB) return weightA - weightB

      const getSubRank = (item: any) => {
        const category = (item.category || "").toLowerCase()
        const title = (item.title || "").toLowerCase()
        if (category === "transit" || category === "transport") {
          const destCity = (plan?.destination_name || "").split(",")[0].toLowerCase().trim()
          return title.startsWith(destCity) || title.includes(`${destCity} to`) ? 100 : -100
        }
        if (category === "accommodation") return -50
        if (category === "food" || category === "restaurant") return 10
        return 0
      }

      const subRankA = getSubRank(a)
      const subRankB = getSubRank(b)
      if (subRankA !== subRankB) return subRankA - subRankB

      return (a.sort_order || 0) - (b.sort_order || 0)
    })
  }, [visibleItems, plan?.destination_name])

  if (isLoading) return <div className="text-center py-20 text-slate-500">Loading plan...</div>
  if (!plan)
    return (
      <ErrorState
        variant="not_found"
        title="Plan not found"
        description="This plan may have been deleted or you don't have access."
        backHref="/plans"
        backLabel="Back to plans"
      />
    )

  const days = Array.from(new Set(sortedItems.map((i) => i.day_number))).sort()
  const currentMember = members.find((m) => m.user?.id === profile?.id)
  const isAdmin = currentMember?.role === "admin" || plan.created_by === profile?.id

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <PlanHeaderBanner
        plan={plan}
        members={members}
        profile={profile}
        isAdmin={isAdmin}
        onOpenHistory={() => {
          setIsHistoryOpen(true)
          setIsChatOpen(false)
        }}
        onOpenChat={() => {
          setIsChatOpen(true)
          setIsHistoryOpen(false)
        }}
        onOpenAdmin={() => setAdminSheetOpen(true)}
      />

      {plan.group_id && onlineUsers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <div className="w-2 h-2 rounded-full bg-[#16795A] animate-pulse" />
          <span>Live viewing:</span>
          {onlineUsers.map((u) => (
            <span
              key={u.id}
              className="text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
            >
              {u.name}
            </span>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <PlanItineraryTab
            sortedItems={sortedItems}
            days={days}
            votes={votes}
            profile={profile}
            isAdmin={isAdmin}
            isSolo={!plan.group_id}
            members={members}
            planDestination={plan.destination_name}
            onVote={handleVote}
            onRefreshItinerary={refreshItinerary}
            onOpenAddDialog={(dayNum) => {
              setSelectedDayForAdd(dayNum)
              setIsAddDialogOpen(true)
            }}
            onAIReplan={() => setIsChatOpen(true)}
          />

          <TransitPanel
            planId={planId}
            groupId={plan.group_id}
            profile={profile}
            members={members}
            onTransitAdded={refreshItinerary}
            destinationName={plan.destination_name}
          />
        </div>

        <PlanSidebar
          plan={plan}
          members={members}
          profile={profile}
          isAdmin={isAdmin}
          mounted={mounted}
          onKickTarget={setKickTarget}
          onConfirmPlan={handleConfirmPlan}
          onMarkCompleted={handleMarkCompleted}
          onShowCancelDialog={() => setShowCancelDialog(true)}
          onShowDeleteDialog={() => setShowDeleteDialog(true)}
        />
      </div>

      <PlanAddActivityDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        dayNumber={selectedDayForAdd}
        onAddActivity={handleManualAddActivity}
      />

      <PlanChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpen={() => setIsChatOpen(true)}
        planId={planId}
        profileName={profile?.full_name?.split(" ")[0] || "Traveler"}
        onPlanUpdated={refreshItinerary}
      />

      <PlanActivityLogDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        activityLogs={activityLogs}
        members={members}
        isAdmin={isAdmin}
        planCurrency={plan.currency}
        onRevertChange={handleRevertChange}
        revertingLogIds={revertingLogIds}
      />

      {isAdmin && (
        <PlanAdminSheet
          isOpen={adminSheetOpen}
          onOpenChange={setAdminSheetOpen}
          plan={plan}
          members={members}
          currentUserId={profile?.id}
          onConfirmPlan={handleConfirmPlan}
          onMarkCompleted={handleMarkCompleted}
          onCancelPlan={() => {
            setAdminSheetOpen(false)
            setShowCancelDialog(true)
          }}
          onDeletePlan={() => {
            setAdminSheetOpen(false)
            setShowDeleteDialog(true)
          }}
          onKickMember={(user) => {
            setAdminSheetOpen(false)
            setKickTarget(user)
          }}
        />
      )}

      <PlanAlertDialogs
        kickTarget={kickTarget}
        setKickTarget={setKickTarget}
        onConfirmKick={handleConfirmKick}
        showCancelDialog={showCancelDialog}
        setShowCancelDialog={setShowCancelDialog}
        onConfirmCancel={handleConfirmCancel}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        onConfirmDelete={handleConfirmDelete}
        planTitle={plan.title}
      />
    </div>
  )
}
