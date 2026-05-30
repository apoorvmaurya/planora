"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Search, Calendar, Clock, BookOpen, Sparkles, Send, Loader2 } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/layout/Footer"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function BlogPage() {
  const [scrolled, setScrolled] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setEmail("")
      toast.success("Subscribed successfully! Welcome to the waitlist newsletter.")
    }, 1000)
  }

  const categories = ["All", "Travel Guides", "Planning Tips", "AI & Tech", "Stories"]

  const blogPosts = [
    {
      title: "How to Plan a Group Trip Without Losing Your Friends",
      excerpt: "Group planning is notoriously chaotic. Learn the 5 structural rules we used to transition from messy spreadsheets to successful boarding passes.",
      category: "Planning Tips",
      date: "May 28, 2026",
      readTime: "6 min read",
      gradient: "from-teal-400 to-emerald-605",
      author: "Apoorv Maurya"
    },
    {
      title: "How AI is Reshaping Itinerary Planning in 2026",
      excerpt: "Generative AI is no longer a gimmick for travelers. Explore how natural language models are crafting hyper-personalized city walks in seconds.",
      category: "AI & Tech",
      date: "May 20, 2026",
      readTime: "5 min read",
      gradient: "from-blue-400 to-indigo-600",
      author: "PlaBot AI Team"
    },
    {
      title: "10 Hidden Gems in South Goa You Should Pin on Your Map",
      excerpt: "Escape the commercial north. Discover serene white-sand beaches, colonial spice farms, and remote waterfalls that are perfect for groups.",
      category: "Travel Guides",
      date: "May 15, 2026",
      readTime: "8 min read",
      gradient: "from-[#1D9E75] to-teal-450",
      author: "Sarah Jenkins"
    },
    {
      title: "The Group Chat Paradox: Why 78% of Travel Plans Die Early",
      excerpt: "We analyze the cognitive load of decision-making in group chats and share strategies on how to build momentum before excitement fades.",
      category: "Planning Tips",
      date: "May 08, 2026",
      readTime: "4 min read",
      gradient: "from-purple-550 to-fuchsia-600",
      author: "Dr. Elena Rostova"
    },
    {
      title: "Packing Light for Collaborative Backpacking Across Europe",
      excerpt: "Sharing gear is the ultimate travel hack. Here is a definitive checklist of items your crew can split to keep bags light and airport transits swift.",
      category: "Travel Guides",
      date: "Apr 28, 2026",
      readTime: "7 min read",
      gradient: "from-rose-400 to-orange-500",
      author: "Alex Mercer"
    },
    {
      title: "Offline Syncing: Engineering Planora's Offline Mobile Support",
      excerpt: "An inside look at our indexedDB and service worker synchronization layer that keeps maps loading in remote Swiss valleys without network access.",
      category: "AI & Tech",
      date: "Apr 14, 2026",
      readTime: "9 min read",
      gradient: "from-cyan-550 to-blue-500",
      author: "Planora Dev"
    }
  ]

  // Filter posts
  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-hidden flex flex-col justify-between">
      {/* Background Fluid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-30">
        <div className="glass-bubble bubble-anim-1 w-32 h-32 top-10 left-[10%]" />
        <div className="glass-bubble bubble-anim-2 w-24 h-24 bottom-40 right-[15%]" style={{ animationDelay: "-6s" }} />
        <div className="glass-bubble bubble-anim-3 w-40 h-40 top-1/2 left-[40%]" style={{ animationDelay: "-11s" }} />
      </div>

      {/* Floating Island Navbar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
      >
        <motion.div
          animate={{ scale: scrolled ? 0.97 : 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`w-full max-w-4xl rounded-full px-6 py-3 flex justify-between items-center ${
            scrolled ? "glass-nav-scrolled" : "glass-nav-unscrolled"
          }`}
        >
          <Link href="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 group text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Plan<span className="text-[#1D9E75]">ora</span>
          </div>
        </motion.div>
      </motion.nav>

      {/* Main Blog Hub */}
      <main className="z-10 flex-1 max-w-6xl mx-auto w-full px-6 pt-32 pb-20">
        
        {/* Header */}
        <section className="text-center max-w-2xl mx-auto mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-[#1D9E75] uppercase"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Planora Chronicles
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Stories & Guides
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-550 dark:text-slate-400 text-lg leading-relaxed"
          >
            Expert advice, technical breakdowns, and planning hacks designed to turn group trips from wishlist dreams into bookings.
          </motion.p>
        </section>

        {/* Toolbar (Search & Category filter) */}
        <section className="space-y-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all border ${
                    selectedCategory === cat
                      ? "bg-[#1D9E75] border-[#1D9E75] text-white shadow shadow-[#1D9E75]/25"
                      : "bg-white/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-slate-200 dark:border-slate-850 focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] text-slate-900 dark:text-white transition-all duration-350"
              />
            </div>
          </div>
        </section>

        {/* Blog Post Grid */}
        <section className="mb-24">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 dark:border-slate-850">
              <p className="text-slate-500 dark:text-slate-400 font-semibold">No articles match your search parameters.</p>
              <button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} className="text-xs font-bold text-[#1D9E75] uppercase tracking-wider mt-4">Reset Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, i) => (
                <motion.article
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -6 }}
                  className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-350 flex flex-col group cursor-pointer"
                >
                  <div className={`h-40 bg-gradient-to-tr ${post.gradient} relative p-6 flex flex-col justify-between`}>
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md w-fit border border-white/20">
                      {post.category}
                    </span>
                    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles className="w-16 h-16 text-white" />
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg leading-snug text-slate-900 dark:text-white group-hover:text-[#1D9E75] dark:group-hover:text-teal-400 transition-colors duration-300">
                        {post.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs text-slate-450 dark:text-slate-500 font-semibold transition-colors duration-500">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readTime}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter Signup Form */}
        <section className="bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-slate-800/20 dark:border-slate-800/80">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/20 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">Stay updated with Planora</h2>
            <p className="text-slate-450 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              Sign up for our newsletter to receive the latest trip templates, travel tips, and early release features of Planora Premium.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isSubmitting}
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm placeholder:text-slate-650 focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#1D9E75] hover:bg-[#15805e] text-white font-bold h-12 rounded-xl px-6 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#1D9E75]/20 shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Subscribe
                  </>
                )}
              </Button>
            </form>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
