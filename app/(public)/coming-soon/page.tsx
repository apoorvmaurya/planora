"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Send,
  ArrowLeft,
  CheckCircle,
  Users,
  MessageSquare,
  Globe,
  Loader2,
  Heart,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import confetti from "canvas-confetti"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Footer } from "@/components/layout/Footer"

interface Supporter {
  id: string
  name: string
  email: string
  suggestion: string | null
  created_at: string
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 10) return "Just now"
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return "Yesterday"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const getGradient = (name: string) => {
  const gradients = [
    "from-[#1D9E75] to-emerald-500",
    "from-teal-500 to-cyan-500",
    "from-emerald-500 to-green-500",
    "from-teal-600 to-indigo-600",
    "from-cyan-600 to-blue-600",
    "from-[#1D9E75] to-teal-400",
  ]
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return gradients[sum % gradients.length]
}

export default function ComingSoonPage() {
  const supabase = createClient()
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [suggestion, setSuggestion] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [isLoadingSupporters, setIsLoadingSupporters] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [newlyAddedIds, setNewlyAddedIds] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  // Fetch initial supporters list
  useEffect(() => {
    async function fetchSupporters() {
      try {
        const { data, error, count } = await supabase
          .from("coming_soon_interest")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(50)

        if (error) throw error
        setSupporters(data || [])
        setTotalCount(count || data?.length || 0)
      } catch (err) {
        console.error("Failed to load supporters:", err)
      } finally {
        setIsLoadingSupporters(false)
      }
    }
    fetchSupporters()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error("Please enter your name")
      return
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from("coming_soon_interest")
        .insert([
          {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            suggestion: suggestion.trim() || null,
          }
        ])
        .select()

      if (error) {
        // Handle duplicate key error (already registered email)
        if (error.code === "23505") {
          toast.error("This email is already registered! Thank you for your support.")
          setIsSubmitting(false)
          return
        }
        throw error
      }

      // Prepend newly added supporter to list immediately
      const newSupporter = data?.[0]
      if (newSupporter) {
        setSupporters((prev) => [newSupporter, ...prev])
        setTotalCount((prev) => prev + 1)
        setNewlyAddedIds((prev) => [...prev, newSupporter.id])
      }

      // Success celebrations
      triggerConfetti()
      setHasSubmitted(true)
      toast.success("Thank you! You've been added to our waitlist.")
      
      // Clear suggestions input
      setName("")
      setEmail("")
      setSuggestion("")
    } catch (err: any) {
      console.error("Error submitting interest:", err)
      toast.error(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const triggerConfetti = () => {
    const duration = 3 * 1000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ["#1D9E75", "#10B981", "#3B82F6"]
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ["#1D9E75", "#10B981", "#3B82F6"]
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Dynamic glow blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-[#1D9E75] opacity-[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-teal-500 opacity-[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45rem] h-[45rem] rounded-full bg-indigo-500 opacity-[0.03] blur-[150px] pointer-events-none" />

      {/* Floating Island Navbar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
      >
        <motion.div
          animate={{
            scale: scrolled ? 0.97 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`w-full max-w-4xl rounded-full px-4 sm:px-6 py-3 ${
            scrolled ? "glass-nav-scrolled" : "glass-nav-unscrolled"
          }`}
        >
          <div className="flex justify-between items-center">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 group text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Home
            </Link>
            <div className="text-xl font-bold tracking-tight">
              Plan<span className="text-[#1D9E75]">ora</span>
            </div>
          </div>
        </motion.div>
      </motion.nav>

      {/* Main Content Area */}
      <main className="z-10 flex-1 max-w-7xl mx-auto w-full px-6 pt-28 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Side: Presentation and Submission Form */}
        <div className="lg:col-span-6 space-y-8 lg:sticky lg:top-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-3 py-1 rounded-full text-xs font-bold tracking-wide text-[#1D9E75] uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Pro & Groups Tiers Coming Soon
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              The ultimate trip planner is getting even <span className="text-[#1D9E75]">better.</span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg">
              We&apos;re currently building Planora Pro and Groups to offer infinite trips, advanced AI itineraries, real-time sync, and intelligent budget calculations. 
              Help us craft the perfect app by letting us know what you want to see!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {hasSubmitted ? (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 shadow-2xl p-8 rounded-3xl text-center space-y-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/5 to-transparent pointer-events-none" />
                <div className="w-16 h-16 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-2xl flex items-center justify-center mx-auto text-[#1D9E75] animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">You&apos;re on the list! 🎉</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    We&apos;ve reserved your early access spot. We will email you the moment our premium features launch.
                  </p>
                </div>
                <button
                  onClick={() => setHasSubmitted(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
                >
                  Submit another suggestion
                </button>
              </div>
            ) : (
              <form 
                onSubmit={handleSubmit}
                className="bg-slate-900/30 backdrop-blur-xl border border-slate-900 shadow-2xl p-6 sm:p-8 rounded-3xl space-y-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                
                <h2 className="text-xl font-bold text-slate-200">Join the Premium Waitlist</h2>

                {/* Name Input */}
                <div className="space-y-2">
                  <label htmlFor="name-input" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Your Name
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all duration-300 disabled:opacity-50"
                  />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="email-input" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all duration-300 disabled:opacity-50"
                  />
                </div>

                {/* Suggestions textarea */}
                <div className="space-y-2">
                  <label htmlFor="suggestion-input" className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                    <span>Desired Feature / Suggestion</span>
                    <span className="text-[10px] text-slate-500 font-medium lowercase">Optional</span>
                  </label>
                  <textarea
                    id="suggestion-input"
                    placeholder="What features or tools would you love to see in Planora?"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    disabled={isSubmitting}
                    rows={4}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all duration-300 resize-none disabled:opacity-50"
                  />
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1D9E75] hover:bg-[#15805e] disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#1D9E75]/20 hover:shadow-[#1D9E75]/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Securing Your Spot...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Reserve Early Access & Submit
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>

        {/* Right Side: Dynamic Scrollable Suggestions List */}
        <div className="lg:col-span-6 space-y-6 lg:h-[calc(100vh-10rem)] flex flex-col">
          {/* List Header */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Suggestion Board
              </span>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full text-xs font-bold text-slate-200">
              <Users className="w-3.5 h-3.5 text-[#1D9E75]" />
              <span>{totalCount} Supporters planning</span>
            </div>
          </div>

          {/* Supporters Feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[500px] lg:max-h-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {isLoadingSupporters ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin" />
                <p className="text-sm text-slate-500">Connecting to feed...</p>
              </div>
            ) : supporters.length === 0 ? (
              <div className="border border-dashed border-slate-900 rounded-3xl p-10 text-center space-y-4">
                <MessageSquare className="w-10 h-10 text-slate-700 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-400">No suggestions yet</p>
                  <p className="text-xs text-slate-500">Be the first to share your thoughts!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {supporters.map((item, index) => {
                    const initials = item.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                    
                    const isNewEntry = newlyAddedIds.includes(item.id);

                    return (
                      <motion.div
                        key={item.id}
                        initial={isNewEntry ? { opacity: 0, y: -20, scale: 0.95 } : { opacity: 1 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="bg-slate-900/20 hover:bg-slate-900/40 border border-slate-900 hover:border-slate-800/80 p-5 rounded-2xl shadow-sm transition-all duration-300 group flex items-start gap-4 relative overflow-hidden"
                      >
                        {/* New label glow */}
                        {isNewEntry && (
                          <div className="absolute top-0 right-0 bg-[#1D9E75] text-white px-2 py-0.5 rounded-bl-lg text-[9px] font-bold tracking-wider uppercase animate-pulse">
                            Just Added
                          </div>
                        )}

                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient(item.name)} flex items-center justify-center font-bold text-white text-sm shadow-inner shrink-0`}>
                          {initials}
                        </div>

                        {/* Supporter Details */}
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-sm text-slate-200 truncate pr-4">
                              {item.name}
                            </h3>
                            <span className="text-[10px] text-slate-500 font-medium shrink-0">
                              {mounted ? formatRelativeTime(item.created_at) : ""}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-400 leading-relaxed italic bg-slate-950/30 px-3 py-2.5 rounded-xl border border-slate-900">
                            {item.suggestion ? (
                              item.suggestion
                            ) : (
                              <span className="text-slate-500 not-italic">
                                Excited for Planora Premium launch! 🚀
                              </span>
                            )}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
