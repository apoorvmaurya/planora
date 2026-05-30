"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"

export function useGroup(groupId?: string) {
  const supabase = createClient()
  const { profile } = useUserStore()
  
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId || !profile?.id) return
    setIsLoading(true)

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select(`
          id,
          role,
          joined_at,
          user:profiles(*)
        `)
        .eq('group_id', groupId)

      if (memberError) throw memberError
      setMembers(memberData)

      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (planError) throw planError
      setPlans(planData)

    } catch (error: any) {
      console.error(error)
      toast.error("Failed to load group details")
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, profile?.id])

  useEffect(() => {
    fetchGroupDetails()

    if (groupId) {
      const channel = supabase.channel(`group_${groupId}_changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
          () => fetchGroupDetails()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
          () => fetchGroupDetails()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'plans', filter: `group_id=eq.${groupId}` },
          () => fetchGroupDetails()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchGroupDetails, groupId])

  const addMember = async (userId: string, role = 'member') => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Member added!")
    } catch (error: any) {
      toast.error(error.message || "Failed to add member")
    } finally {
      setIsProcessing(false)
    }
  }

  const removeMember = async (userId: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Member removed")
      if (userId === profile?.id) {
        window.location.href = '/groups'
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member")
    } finally {
      setIsProcessing(false)
    }
  }

  const updateGroup = async (updates: any) => {
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)

      if (error) throw error
      toast.success("Group updated")
    } catch (error: any) {
      toast.error(error.message || "Failed to update group")
    } finally {
      setIsProcessing(false)
    }
  }

  const deleteGroup = async () => {
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error
      toast.success("Group deleted")
      window.location.href = '/groups'
    } catch (error: any) {
      toast.error(error.message || "Failed to delete group")
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    group,
    members,
    plans,
    isLoading,
    isProcessing,
    addMember,
    removeMember,
    updateGroup,
    deleteGroup
  }
}
