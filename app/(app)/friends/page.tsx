"use client"

import React, { useState, useEffect } from "react"
import { useFriends } from "@/hooks/useFriends"
import { FriendCard } from "@/components/shared/FriendCard"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle2, Search, Users, UserPlus, Inbox } from "lucide-react"

export default function FriendsPage() {
  const {
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
  } = useFriends()

  const [searchQuery, setSearchQuery] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)

  const handleShareLink = () => {
    const url = `${window.location.origin}/signup`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers(searchQuery)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Friends</h1>
          <p className="text-slate-500 mt-1 text-lg">Manage your connections and find travel buddies.</p>
        </div>
        
        <Button 
          onClick={handleShareLink}
          className={`rounded-xl h-11 px-6 shadow-md transition-colors ${
            copiedLink
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-slate-900 hover:bg-slate-800'
          } text-white`}
        >
          {copiedLink ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
          ) : (
            <><Copy className="w-4 h-4 mr-2" /> Share Planora</>
          )}
        </Button>
      </header>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 p-1 rounded-2xl h-14">
          <TabsTrigger value="friends" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" /> My friends <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{friends.length}</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Inbox className="w-4 h-4 mr-2" /> Requests 
            {incomingRequests.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-bold">{incomingRequests.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="find" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Search className="w-4 h-4 mr-2" /> Find friends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-6 outline-none">
          {isLoading ? (
            <p className="text-slate-500 text-center py-10">Loading friends...</p>
          ) : friends.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No friends yet</h3>
              <p className="text-slate-500">Go to the Find friends tab to start connecting.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((friend, i) => (
                <motion.div key={friend.friendshipId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <FriendCard
                    user={friend.user}
                    friendshipId={friend.friendshipId}
                    context="friends"
                    onRemove={removeFriend}
                    isProcessing={isProcessing}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-8 outline-none">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              Incoming Requests
              <span className="ml-3 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{incomingRequests.length}</span>
            </h3>
            {incomingRequests.length === 0 ? (
              <p className="text-slate-500 bg-white p-6 rounded-3xl border border-slate-100">No incoming requests.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingRequests.map((req, i) => (
                  <motion.div key={req.friendshipId} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <FriendCard
                      user={req.user}
                      friendshipId={req.friendshipId}
                      context="incoming_request"
                      onAccept={acceptRequest}
                      onDecline={declineRequest}
                      isProcessing={isProcessing}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              Pending Outgoing
              <span className="ml-3 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{outgoingRequests.length}</span>
            </h3>
            {outgoingRequests.length === 0 ? (
              <p className="text-slate-500 bg-white p-6 rounded-3xl border border-slate-100">No outgoing requests.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outgoingRequests.map((req, i) => (
                  <motion.div key={req.friendshipId} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <FriendCard
                      user={req.user}
                      context="outgoing_request"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="find" className="space-y-6 outline-none">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Search by name or @username..." 
              className="pl-12 h-14 rounded-2xl text-lg bg-white border-slate-200 focus-visible:ring-[#1D9E75]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.length > 0 && searchResults.length === 0 ? (
            <p className="text-center text-slate-500 py-10">No users found matching &quot;{searchQuery}&quot;</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {searchResults.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <FriendCard
                    user={user}
                    context="search"
                    onAdd={sendRequest}
                    isProcessing={isProcessing}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
