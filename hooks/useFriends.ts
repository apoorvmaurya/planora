"use client"

import { useState, useEffect, useCallback } from "react"
import { useUserStore } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function useFriends() {
  const { profile } = useUserStore()
  const supabase = createClient()

  const [friends, setFriends] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchFriendsData = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true)
    
    try {
      const { data: acceptedFriends, error: err1 } = await supabase
        .from("friendships")
        .select(`
          id,
          status,
          requester_id,
          addressee_id,
          requester:profiles!friendships_requester_id_fkey(*),
          addressee:profiles!friendships_addressee_id_fkey(*)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)
      
      if (err1) throw err1;

      const mappedFriends = acceptedFriends.map((f: any) => ({
        friendshipId: f.id,
        user: f.requester_id === profile.id ? f.addressee : f.requester
      }))
      setFriends(mappedFriends)

      const { data: incoming, error: err2 } = await supabase
        .from("friendships")
        .select(`
          id,
          requester:profiles!friendships_requester_id_fkey(*)
        `)
        .eq('status', 'pending')
        .eq('addressee_id', profile.id)
      
      if (err2) throw err2;
      setIncomingRequests(incoming.map((f: any) => ({
        friendshipId: f.id,
        user: f.requester
      })))

      const { data: outgoing, error: err3 } = await supabase
        .from("friendships")
        .select(`
          id,
          addressee:profiles!friendships_addressee_id_fkey(*)
        `)
        .eq('status', 'pending')
        .eq('requester_id', profile.id)
      
      if (err3) throw err3;
      setOutgoingRequests(outgoing.map((f: any) => ({
        friendshipId: f.id,
        user: f.addressee
      })))

    } catch (error: any) {
      console.error(error)
      toast.error("Failed to load friends data")
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    fetchFriendsData()

    if (profile?.id) {
      const channel = supabase.channel('friendships_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships' },
          (payload) => {
            fetchFriendsData()
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchFriendsData, profile?.id, supabase])

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2 || !profile?.id) {
      setSearchResults([])
      return
    }

    try {
      const excludeIds = [
        profile.id,
        ...friends.map(f => f.user.id),
        ...incomingRequests.map(f => f.user.id),
        ...outgoingRequests.map(f => f.user.id)
      ]

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const sendRequest = async (addressee_id: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressee_id })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Friend request sent!")
      setSearchResults(prev => prev.filter(u => u.id !== addressee_id))
      fetchFriendsData()
    } catch (error: any) {
      toast.error(error.message || "Failed to send request")
    } finally {
      setIsProcessing(false)
    }
  }

  const acceptRequest = async (friendshipId: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: friendshipId, status: 'accepted' })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Request accepted!")
      fetchFriendsData()
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request")
    } finally {
      setIsProcessing(false)
    }
  }

  const declineRequest = async (friendshipId: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: friendshipId, status: 'rejected' })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Request declined")
      fetchFriendsData()
    } catch (error: any) {
      toast.error(error.message || "Failed to decline request")
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFriend = async (friendshipId: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/friends?id=${friendshipId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Friend removed")
      fetchFriendsData()
    } catch (error: any) {
      toast.error(error.message || "Failed to remove friend")
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    searchResults,
    isLoading,
    isProcessing,
    searchUsers,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend
  }
}
