"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  MapPin, 
  CalendarDays, 
  Users, 
  DollarSign, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle2, 
  ArrowRight, 
  Bot, 
  Plus, 
  RotateCcw, 
  Clock, 
  CreditCard,
  Send,
  Loader2,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { calculateSimplifiedSplits } from "@/lib/utils/splitCalculator"
import { MarkdownText } from "@/components/shared/MarkdownText"

interface DemoItem {
  id: string
  day: number
  time: string
  title: string
  location: string
  description: string
  category: "activity" | "food" | "transport" | "leisure"
  duration: number
  cost: number
  upvotes: number
  downvotes: number
  userVoted: "up" | "down" | null
  status: "approved" | "suggestion"
}

interface DemoExpense {
  id: string
  title: string
  amount: number
  paidBy: string
  paidById: string
  splitType: "equal" | "custom"
}

interface DemoChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  isSample?: boolean
  isError?: boolean
  failedPrompt?: string
}

const DEMO_MEMBERS = [
  { user_id: "demo-user", full_name: "Demo User (You)", avatar_url: "" },
  { user_id: "alex", full_name: "Alex M.", avatar_url: "" },
  { user_id: "sofia", full_name: "Sofia R.", avatar_url: "" },
  { user_id: "kenji", full_name: "Kenji T.", avatar_url: "" },
]

const INITIAL_ITEMS: DemoItem[] = [
  {
    id: "item-1",
    day: 1,
    time: "Morning",
    title: "Senso-ji Ancient Temple & Nakamise Dori",
    location: "Asakusa, Tokyo",
    description: "Explore Tokyo's oldest Buddhist temple, stroll through traditional craft stalls, and receive an omikuji fortune.",
    category: "activity",
    duration: 120,
    cost: 0,
    upvotes: 4,
    downvotes: 0,
    userVoted: "up",
    status: "approved"
  },
  {
    id: "item-2",
    day: 1,
    time: "Lunch",
    title: "Tsukiji Outer Market Culinary Crawl",
    location: "Tsukiji, Chuo City",
    description: "Sample fresh wagyu skewers, tamagoyaki omelet, and seasonal sashimi bowls from heritage market vendors.",
    category: "food",
    duration: 90,
    cost: 28,
    upvotes: 3,
    downvotes: 0,
    userVoted: null,
    status: "approved"
  },
  {
    id: "item-3",
    day: 1,
    time: "Afternoon",
    title: "teamLab Planets Immersive Digital Art",
    location: "Toyosu, Tokyo",
    description: "Walk through water and body-immersive digital light exhibits that dissolve boundaries between art and viewer.",
    category: "activity",
    duration: 120,
    cost: 38,
    upvotes: 4,
    downvotes: 0,
    userVoted: "up",
    status: "approved"
  },
  {
    id: "item-4",
    day: 1,
    time: "Evening",
    title: "Shibuya Crossing & Nonbei Yokocho Izakaya",
    location: "Shibuya, Tokyo",
    description: "Experience the iconic scramble intersection at golden hour, then tuck into yakitori and highballs in lantern-lit alleyways.",
    category: "food",
    duration: 150,
    cost: 45,
    upvotes: 2,
    downvotes: 1,
    userVoted: null,
    status: "suggestion"
  },
  {
    id: "item-5",
    day: 2,
    time: "Morning",
    title: "Meiji Jingu Shrine & Forest Stroll",
    location: "Harajuku, Shibuya",
    description: "Tranquil stroll through 170 acres of evergreen sacred forest surrounding Tokyo's grandest Shinto shrine.",
    category: "activity",
    duration: 90,
    cost: 0,
    upvotes: 3,
    downvotes: 0,
    userVoted: "up",
    status: "approved"
  },
  {
    id: "item-6",
    day: 2,
    time: "Afternoon",
    title: "Omotesando Architecture & Roppongi Hills Observation",
    location: "Minato City, Tokyo",
    description: "Admire world-class boutique architecture before taking in 360-degree skyline views of Tokyo Tower and Mount Fuji.",
    category: "activity",
    duration: 150,
    cost: 22,
    upvotes: 2,
    downvotes: 0,
    userVoted: null,
    status: "approved"
  },
  {
    id: "item-7",
    day: 3,
    time: "Full Day",
    title: "Day Excursion: Hakone Fuji Views & Onsen",
    location: "Hakone, Kanagawa",
    description: "Ride the Romancecar to Hakone, cruise Lake Ashi on a pirate ship, view Mt. Fuji, and soak in natural hot springs.",
    category: "leisure",
    duration: 360,
    cost: 85,
    upvotes: 4,
    downvotes: 0,
    userVoted: "up",
    status: "approved"
  }
]

const INITIAL_EXPENSES: DemoExpense[] = [
  { id: "exp-1", title: "Shinjuku Izakaya Dinner", amount: 168.00, paidBy: "Alex M.", paidById: "alex", splitType: "equal" },
  { id: "exp-2", title: "Shinkansen Bullet Train Passes", amount: 320.00, paidBy: "Demo User (You)", paidById: "demo-user", splitType: "equal" },
  { id: "exp-3", title: "teamLab Planets Group Tickets", amount: 152.00, paidBy: "Sofia R.", paidById: "sofia", splitType: "equal" },
]

export default function DemoPage() {
  const [selectedDay, setSelectedDay] = useState(1)
  const [items, setItems] = useState<DemoItem[]>(INITIAL_ITEMS)
  const [expenses, setExpenses] = useState<DemoExpense[]>(INITIAL_EXPENSES)
  const [activeTab, setActiveTab] = useState<"itinerary" | "expenses" | "plabot">("itinerary")
  const [botPrompt, setBotPrompt] = useState("")
  const [botLoading, setBotLoading] = useState(false)
  const [botSource, setBotSource] = useState<"live" | "sample" | "streaming" | "error">("sample")
  const [botMessages, setBotMessages] = useState<DemoChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: "Kon'nichiwa! 🌸 I'm PlaBot, your AI group travel concierge for Tokyo. Ask me for recommendations, hidden gems, or itinerary advice for your 5-day trip!",
      isSample: true
    }
  ])

  // Compute live simplified repayments from the current expense ledger
  const computedSettlements = useMemo(() => {
    const formatted = expenses.map(e => ({
      id: e.id,
      plan_id: "demo-plan",
      paid_by: e.paidById,
      title: e.title,
      amount: e.amount,
      split_type: e.splitType,
      split_details: null
    }))
    return calculateSimplifiedSplits(formatted, DEMO_MEMBERS)
  }, [expenses])

  // Voting simulation
  const handleVote = (itemId: string, direction: "up" | "down") => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item

      let upvotes = item.upvotes
      let downvotes = item.downvotes
      let userVoted = item.userVoted

      if (userVoted === direction) {
        if (direction === "up") upvotes--
        else downvotes--
        userVoted = null
        toast.info("Vote removed")
      } else {
        if (userVoted === "up") upvotes--
        if (userVoted === "down") downvotes--

        if (direction === "up") {
          upvotes++
          userVoted = "up"
          toast.success("Upvoted! Consensus score updated.")
        } else {
          downvotes++
          userVoted = "down"
          toast.error("Downvoted suggestion")
        }
      }

      return { ...item, upvotes, downvotes, userVoted }
    }))
  }

  // PlaBot Chat Simulation & Live Response with honest labeling and timeout
  const executeSendPrompt = async (promptToSend: string, isRetry = false) => {
    if (!promptToSend.trim() || botLoading) return

    setBotPrompt("")
    setBotLoading(true)
    setBotSource("streaming")

    const userMsgId = `user-${Date.now()}`
    const assistantMsgId = `assistant-${Date.now()}`

    if (!isRetry) {
      setBotMessages(prev => [
        ...prev,
        { id: userMsgId, role: "user", content: promptToSend }
      ])
    } else {
      setBotMessages(prev => prev.filter(m => !m.isError))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const historyPayload = botMessages
        .filter(m => !m.isError)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/plabot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are PlaBot, an enthusiastic, knowledgeable travel planner assisting with a 5-day group trip to Tokyo. Answer concisely using markdown formatting (bullet points, bold text) and realistic prices in USD or JPY."
            },
            ...historyPayload,
            { role: "user", content: promptToSend }
          ]
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`)
      }
      if (!res.body) {
        throw new Error("No response stream body")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullAnswer = ""

      setBotMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "", isSample: false }
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullAnswer += chunk
        setBotMessages(prev =>
          prev.map(m => m.id === assistantMsgId ? { ...m, content: fullAnswer } : m)
        )
      }

      if (!fullAnswer.trim()) {
        throw new Error("Stream closed with empty content")
      }

      setBotSource("live")
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.warn("Demo PlaBot request failed:", err)

      const isTimeout = err.name === "AbortError"
      const errorText = isTimeout
        ? "Request timed out after 20 seconds."
        : "Live AI stream could not be reached."

      setBotSource("error")
      setBotMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: `${errorText} You can retry the live connection or load an offline sample answer below.`,
          isError: true,
          failedPrompt: promptToSend
        }
      ])
    } finally {
      setBotLoading(false)
    }
  }

  const handleLoadSampleAnswer = (prompt: string) => {
    const sampleContent = `**Sample Tokyo Recommendations for "${prompt}":**
- **Shibuya Sky**: Visit during golden hour for panoramic 360-degree city views ($18 / person).
- **Cat Street in Harajuku**: Wander quiet pedestrian backstreets packed with specialty coffee and vintage boutiques.
- **Omoide Yokocho (Shinjuku)**: Enjoy authentic charcoal yakitori and highballs in lantern-lit alleyways.

*Estimated Budget:* $25-$45 per person.`

    setBotMessages(prev => {
      const withoutError = prev.filter(m => !m.isError)
      return [
        ...withoutError,
        {
          id: `sample-${Date.now()}`,
          role: "assistant",
          content: sampleContent,
          isSample: true
        }
      ]
    })
    setBotSource("sample")
    toast.info("Loaded offline sample answer")
  }

  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    executeSendPrompt(botPrompt)
  }

  // Expense calculation
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const perPersonExpense = (totalExpenses / DEMO_MEMBERS.length).toFixed(2)

  const handleAddSampleExpense = () => {
    const sampleOptions = [
      { title: "Tsukiji Seafood Tasting & Matcha", amount: 64.00, paidBy: "Kenji T.", paidById: "kenji" },
      { title: "Hakone Ropeway Cable Car Passes", amount: 88.00, paidBy: "Sofia R.", paidById: "sofia" },
      { title: "Ramen Dinner at Afuri Harajuku", amount: 56.00, paidBy: "Alex M.", paidById: "alex" },
    ]
    const nextIdx = (expenses.length - 3) % sampleOptions.length
    const sample = sampleOptions[Math.max(0, nextIdx)]

    const newExp: DemoExpense = {
      id: `exp-${Date.now()}`,
      title: sample.title,
      amount: sample.amount,
      paidBy: sample.paidBy,
      paidById: sample.paidById,
      splitType: "equal"
    }
    setExpenses(prev => [newExp, ...prev])
    toast.success(`Added sample expense: $${sample.amount.toFixed(2)} paid by ${sample.paidBy}`)
  }

  const handleReset = () => {
    setItems(INITIAL_ITEMS)
    setExpenses(INITIAL_EXPENSES)
    toast.info("Demo data reset to default")
  }

  const dayItems = items.filter(i => i.day === selectedDay)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Recruiter Demo Banner */}
      <div className="sticky top-0 z-50 bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span className="font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-[11px]">
              Live Recruiter Demo
            </span>
            <span className="hidden md:inline font-medium">
              No signup required. Test interactive voting, day-by-day itineraries, group expense splits, and PlaBot.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleReset}
              className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset Data
            </Button>
            <Link href="/signup">
              <Button size="sm" className="h-7 text-xs bg-white text-emerald-800 hover:bg-white/90 font-bold">
                Create Your Own Trip <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Trip Header Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-6 sm:p-10 shadow-2xl border border-slate-800">
          <div className="absolute inset-0 bg-linear-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/70" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#16795A] hover:bg-[#16795A] text-white border-none font-semibold text-xs">
                  ✨ Seeded Recruiter Workspace
                </Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                  ● 4 Demo Members (Simulated Presence)
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                Tokyo 5-Day Explorer 🇯🇵
              </h1>
              <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
                Ancient temples, bustling street markets, neon-lit alleyways, and digital art wonders with the wandering nomads.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 font-medium pt-2">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-teal-400" /> Tokyo, Japan</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-teal-400" /> Oct 12 - Oct 17, 2026</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-teal-400" /> 4 Travelers</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-teal-400" /> $2,800 USD Budget</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/signup">
                <Button className="bg-[#16795A] hover:bg-[#115E46] text-white font-bold rounded-2xl shadow-lg shadow-[#16795A]/30">
                  Save as Template <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("itinerary")}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "itinerary" 
                ? "border-[#16795A] text-[#16795A] font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Day-by-Day Itinerary ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "expenses" 
                ? "border-[#16795A] text-[#16795A] font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Group Expense Splitter (${totalExpenses.toFixed(0)})
          </button>
          <button
            onClick={() => setActiveTab("plabot")}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "plabot" 
                ? "border-[#16795A] text-[#16795A] font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Bot className="w-4 h-4" /> PlaBot AI Assistant
          </button>
        </div>

        {/* Tab 1: Day-by-Day Itinerary */}
        {activeTab === "itinerary" && (
          <div className="space-y-6">
            {/* Day Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5].map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                    selectedDay === day
                      ? "bg-[#16795A] text-white shadow-md shadow-[#16795A]/25"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Day {day} {day === 1 ? "(Asakusa)" : day === 2 ? "(Shibuya)" : day === 3 ? "(Hakone)" : ""}
                </button>
              ))}
            </div>

            {/* Activities List */}
            <div className="space-y-4">
              {dayItems.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-500">No scheduled activities for Day {selectedDay}. Switch back to Day 1, 2, or 3 to view curated items.</p>
                </div>
              ) : (
                dayItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider text-[#16795A] border-emerald-300 dark:border-emerald-800">
                          {item.time}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px] font-medium capitalize">
                          {item.category === "food" ? "🍽️ Culinary" : item.category === "activity" ? "🏛️ Sight" : "🌿 Leisure"}
                        </Badge>
                        {item.status === "suggestion" && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 text-[10px]">
                            Vote in Progress
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.duration} min
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.cost === 0 ? "Free" : `$${item.cost} / person`}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        <span>{item.location}</span>
                      </div>
                    </div>

                    {/* Voting Controls */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        variant={item.userVoted === "up" ? "default" : "outline"}
                        onClick={() => handleVote(item.id, "up")}
                        className={`h-9 px-3 rounded-xl font-bold text-xs gap-1.5 cursor-pointer ${
                          item.userVoted === "up" 
                            ? "bg-[#16795A] hover:bg-[#115E46] text-white" 
                            : "hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{item.upvotes}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant={item.userVoted === "down" ? "default" : "outline"}
                        onClick={() => handleVote(item.id, "down")}
                        className={`h-9 px-3 rounded-xl font-bold text-xs gap-1.5 cursor-pointer ${
                          item.userVoted === "down" 
                            ? "bg-rose-600 hover:bg-rose-700 text-white" 
                            : "hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>{item.downvotes}</span>
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Group Expense Splitter */}
        {activeTab === "expenses" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-400">Total Group Spend</span>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">${totalExpenses.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">Sample expenses in USD (Multi-currency supported)</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-400">Per Person Share</span>
                <p className="text-3xl font-black text-[#16795A] mt-1">${perPersonExpense}</p>
                <p className="text-xs text-slate-500 mt-1">Even split among 4 members</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400">Interactive Action</span>
                  <p className="text-xs text-slate-500 mt-1">Test adding expenses to see settlements dynamically rebalance.</p>
                </div>
                <Button 
                  onClick={handleAddSampleExpense}
                  size="sm"
                  className="mt-3 bg-[#16795A] hover:bg-[#115E46] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Sample Expense
                </Button>
              </div>
            </div>

            {/* Expenses Ledger */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 font-bold text-xs text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Expense Item</span>
                <span>Amount / Paid By</span>
              </div>
              {expenses.map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{exp.title}</p>
                    <p className="text-xs text-slate-400">Split evenly across all 4 group members</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-900 dark:text-white">${exp.amount.toFixed(2)}</p>
                    <span className="text-xs text-[#16795A] font-medium">Paid by {exp.paidBy}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Balance Settlement */}
            <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Simplified Repayments (Calculated Live)
                </h4>
                <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  {computedSettlements.length} {computedSettlements.length === 1 ? "settlement" : "settlements"} needed
                </Badge>
              </div>
              {computedSettlements.length === 0 ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  All group members are settled up! No outstanding balances.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {computedSettlements.map((s, idx) => {
                    const fromName = DEMO_MEMBERS.find(m => m.user_id === s.from)?.full_name || s.from
                    const toName = DEMO_MEMBERS.find(m => m.user_id === s.to)?.full_name || s.to
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-950 dark:text-emerald-200 shadow-2xs"
                      >
                        <span className="text-slate-700 dark:text-slate-300">{fromName}</span>
                        <span className="text-emerald-600 font-bold">owes</span>
                        <span className="text-slate-700 dark:text-slate-300">{toName}</span>
                        <span className="font-black text-[#16795A] dark:text-emerald-400 ml-0.5">${s.amount.toFixed(2)}</span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: PlaBot AI Assistant */}
        {activeTab === "plabot" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col h-[550px]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-[#16795A] to-teal-500 flex items-center justify-center text-white shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">PlaBot Travel Assistant</h3>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">● Connected to Tokyo Trip Context</p>
                </div>
              </div>

              {/* Honest Status Badge */}
              {botSource === "streaming" ? (
                <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Live AI Streaming (Groq)
                </Badge>
              ) : botSource === "live" ? (
                <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> Live AI Response (Groq)
                </Badge>
              ) : botSource === "error" ? (
                <Badge variant="outline" className="text-xs border-red-400 text-red-600 dark:text-red-400">
                  Connection Error
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                  Offline Sample Response
                </Badge>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {botMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#16795A] text-white rounded-br-none whitespace-pre-wrap"
                        : msg.isError
                          ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-200 rounded-bl-none"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {msg.isSample ? "Sample Content" : "PlaBot"}
                        </span>
                        {msg.isSample && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                            Offline Demo
                          </span>
                        )}
                      </div>
                    )}

                    {msg.content ? (
                      msg.role === "assistant" && !msg.isError ? (
                        <MarkdownText content={msg.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )
                    ) : (
                      <span className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                      </span>
                    )}

                    {msg.isError && (
                      <div className="mt-3 pt-2.5 border-t border-red-200 dark:border-red-900/50 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeSendPrompt(msg.failedPrompt || "", true)}
                          disabled={botLoading}
                          className="h-7 text-xs border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Retry Live Call
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleLoadSampleAnswer(msg.failedPrompt || "Tokyo")}
                          disabled={botLoading}
                          className="h-7 text-xs font-semibold cursor-pointer"
                        >
                          Load Offline Sample Answer
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested Prompts */}
            <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] text-slate-400 font-medium shrink-0">Try asking:</span>
              {[
                "Where can we find the best matcha dessert in Ginza?",
                "Suggest a quiet cocktail bar in Shibuya.",
                "How long does the Hakone loop take?"
              ].map((suggestion, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => { setBotPrompt(suggestion); }}
                  className="text-[11px] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendPrompt} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={botPrompt}
                onChange={e => setBotPrompt(e.target.value)}
                placeholder="Ask PlaBot about restaurants, transit, or day planning in Tokyo..."
                disabled={botLoading}
                className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#16795A] border border-slate-200 dark:border-slate-700"
              />
              <Button
                type="submit"
                disabled={botLoading || !botPrompt.trim()}
                className="bg-[#16795A] hover:bg-[#115E46] text-white px-5 rounded-xl font-bold text-xs cursor-pointer shadow-sm"
              >
                {botLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
