"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { syncOfflineOps, offlineDB } from "@/lib/supabase/offlineSync"

export function usePlanDetails(planId: string, profile: any) {
  const supabase = createClient()

  const [plan, setPlan] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [votes, setVotes] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activityLogs, setActivityLogs] = useState<any[]>([])

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        const [cachedPlan, cachedItems, cachedVotes] = await Promise.all([
          offlineDB.plans.get(planId),
          offlineDB.items.get(planId),
          offlineDB.votes.get(planId),
        ])

        if (cachedPlan) setPlan(cachedPlan)
        if (cachedItems) setItems(cachedItems.data)
        if (cachedVotes) setVotes(cachedVotes.data)

        const { data: pData, error: pError } = await supabase
          .from("plans")
          .select("*")
          .eq("id", planId)
          .single()

        if (pError || !pData) {
          if (!cachedPlan) {
            setIsLoading(false)
            return
          }
        } else {
          setPlan(pData)
          await offlineDB.plans.put(pData)
        }

        if (pData?.group_id) {
          const { data: mData } = await supabase
            .from("group_members")
            .select("user:profiles(id, full_name, username, avatar_url, city), role")
            .eq("group_id", pData.group_id)
          if (mData) setMembers(mData)
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

        const { data: vData } = await supabase
          .from("member_votes")
          .select("*")
          .eq("plan_id", planId)
        if (vData) {
          setVotes(vData)
          await offlineDB.votes.put({ id: planId, planId, data: vData })
        }

        const { data: logData } = await supabase
          .from("plan_activity_logs")
          .select("*")
          .eq("plan_id", planId)
          .order("created_at", { ascending: false })
        if (logData) setActivityLogs(logData)
      } catch (err) {
        console.error("Data load failed:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (planId) {
      fetchPlanData()
    }
  }, [planId, profile?.id])

  useEffect(() => {
    if (!profile?.id) return

    const itemsChannel = supabase
      .channel(`items_${planId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itinerary_items",
          filter: `plan_id=eq.${planId}`,
        },
        async () => {
          const { data } = await supabase
            .from("itinerary_items")
            .select("*")
            .eq("plan_id", planId)
            .order("day_number")
            .order("sort_order")
          if (data) {
            setItems(data)
            await offlineDB.items.put({ id: planId, planId, data })
          }
        }
      )
      .subscribe()

    const votesChannel = supabase
      .channel(`votes_${planId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "member_votes",
          filter: `plan_id=eq.${planId}`,
        },
        async () => {
          const { data } = await supabase.from("member_votes").select("*").eq("plan_id", planId)
          if (data) {
            setVotes(data)
            await offlineDB.votes.put({ id: planId, planId, data })
          }
        }
      )
      .subscribe()

    const logsChannel = supabase
      .channel(`logs_${planId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plan_activity_logs",
          filter: `plan_id=eq.${planId}`,
        },
        async () => {
          const { data } = await supabase
            .from("plan_activity_logs")
            .select("*")
            .eq("plan_id", planId)
            .order("created_at", { ascending: false })
          if (data) setActivityLogs(data)
        }
      )
      .subscribe()

    const roomOne = supabase.channel(`presence_${planId}`, {
      config: { presence: { key: profile.id } },
    })

    roomOne
      .on("presence", { event: "sync" }, () => {
        const state = roomOne.presenceState()
        const users = Object.keys(state).map((key) => state[key][0] as any)
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await roomOne.track({
            id: profile.id,
            name: profile.full_name,
            avatar_url: profile.avatar_url,
          })
        }
      })

    const handleOnline = () => {
      syncOfflineOps(planId, async () => {
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
        const { data: vData } = await supabase.from("member_votes").select("*").eq("plan_id", planId)
        if (vData) {
          setVotes(vData)
          await offlineDB.votes.put({ id: planId, planId, data: vData })
        }
      })
    }

    window.addEventListener("online", handleOnline)
    if (navigator.onLine) handleOnline()

    return () => {
      supabase.removeChannel(itemsChannel)
      supabase.removeChannel(votesChannel)
      supabase.removeChannel(logsChannel)
      supabase.removeChannel(roomOne)
      window.removeEventListener("online", handleOnline)
    }
  }, [planId, profile])

  const refreshItinerary = async () => {
    try {
      const { data } = await supabase
        .from("itinerary_items")
        .select("*")
        .eq("plan_id", planId)
        .order("day_number")
        .order("sort_order")
      if (data) {
        setItems(data)
        await offlineDB.items.put({ id: planId, planId, data })
      }
    } catch {
      const localItems = await offlineDB.items.get(planId)
      if (localItems) setItems(localItems.data)
    }
  }

  return {
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
  }
}
