"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Clock, MapPin, Sparkles, Filter, ChevronRight, Copy, Check } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/layout/Footer"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function TemplatesPage() {
  const [scrolled, setScrolled] = useState(false)
  const [selectedTag, setSelectedTag] = useState("All")
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const handleUseTemplate = (id: number) => {
    setCopiedId(id)
    toast.success("Template copied to your clipboard! Redirecting you to login...")
    setTimeout(() => {
      setCopiedId(null)
      window.location.href = "/login"
    }, 1500)
  }

  const tags = ["All", "Adventure", "Relaxing", "Budget", "Roadtrip", "Cultural"]

  const templates = [
    {
      id: 1,
      title: "Tokyo & Kyoto Explorer",
      desc: "Immerse your crew in the contrast of high-tech neon lights and ancient bamboo groves. The ultimate Japan group itinerary.",
      duration: "9 Days",
      location: "Japan",
      tag: "Cultural",
      cost: "¥¥¥",
      gradient: "from-rose-400 to-orange-500",
      days: [
        "Day 1: Arrival & Shibuya Crossing walking tour",
        "Day 2: TeamLab borderless digital museum & sushi crawl",
        "Day 3: Bullet train to Kyoto & Fushimi Inari gates",
        "Day 4: Gion district historical teahouses walking tour"
      ]
    },
    {
      id: 2,
      title: "Iceland Ring Road Odyssey",
      desc: "Drive past black sand beaches, thundering waterfalls, and active volcanoes in this rugged campervan road trip.",
      duration: "7 Days",
      location: "Iceland",
      tag: "Roadtrip",
      cost: "¥¥¥¥",
      gradient: "from-blue-500 to-cyan-500",
      days: [
        "Day 1: Golden Circle geysers & Gullfoss waterfall",
        "Day 2: Seljalandsfoss waterfall walk & black sand beach",
        "Day 3: Glacier hiking in Skaftafell national park",
        "Day 4: Glacier lagoon boat tour & diamond beach"
      ]
    },
    {
      id: 3,
      title: "Goa Beachside Escapade",
      desc: "Ditch the spreadsheets and dive into beach shacks, spice plantation tours, and private catamaran cruises.",
      duration: "5 Days",
      location: "India",
      tag: "Relaxing",
      cost: "¥¥",
      gradient: "from-[#16795A] to-emerald-500",
      days: [
        "Day 1: Arrival & sunset beach bonfire at Vagator",
        "Day 2: Historical fort exploration & seafood tour",
        "Day 3: Spice plantation lunch & Dudhsagar waterfall trek",
        "Day 4: Private catamaran sunset party cruise"
      ]
    },
    {
      id: 4,
      title: "Backpacking Southeast Asia",
      desc: "An budget-friendly adventure through night markets, ancient temples, and limestone island bays.",
      duration: "10 Days",
      location: "Thailand & Vietnam",
      tag: "Budget",
      cost: "¥",
      gradient: "from-yellow-500 to-amber-600",
      days: [
        "Day 1: Bangkok Grand Palace & tuk-tuk street food tour",
        "Day 2: Train to Chiang Mai & night bazaar shopping",
        "Day 3: Halong Bay overnight cruise on traditional junk boat",
        "Day 4: Hanoi old quarter historical walk & coffee tasting"
      ]
    },
    {
      id: 5,
      title: "Amalfi Coast Dreamin'",
      desc: "A gorgeous cliffside road trip passing pastel-colored villages, lemon groves, and historic coastal viewpoints.",
      duration: "6 Days",
      location: "Italy",
      tag: "Roadtrip",
      cost: "¥¥¥¥",
      gradient: "from-purple-500 to-indigo-600",
      days: [
        "Day 1: Arrival in Naples & traditional pizza tour",
        "Day 2: Drive along Amalfi cliffs to Positano",
        "Day 3: Private yacht cruise around Capri island",
        "Day 4: Hiking the Path of the Gods hiking route"
      ]
    },
    {
      id: 6,
      title: "Patagonian Trekking Summit",
      desc: "A challenging backpacker trek past towering granite spires, blue glaciers, and crystal clear lakes.",
      duration: "8 Days",
      location: "Chile & Argentina",
      tag: "Adventure",
      cost: "¥¥¥",
      gradient: "from-emerald-600 to-teal-700",
      days: [
        "Day 1: Fly to El Calafate & Perito Moreno glacier view",
        "Day 2: Bus to El Chaltén & fitz roy base camp trek",
        "Day 3: Laguna de los Tres sunrise viewing climb",
        "Day 4: Glacier trek on Viedma ice fields"
      ]
    }
  ]

  const filteredTemplates = templates.filter(t => selectedTag === "All" || t.tag === selectedTag)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-hidden flex flex-col justify-between">
      {/* Background Fluid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-30">
        <div className="glass-bubble bubble-anim-1 w-32 h-32 top-10 left-[10%]" />
        <div className="glass-bubble bubble-anim-2 w-24 h-24 bottom-20 right-[15%]" style={{ animationDelay: "-6s" }} />
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
            Plan<span className="text-[#16795A]">ora</span>
          </div>
        </motion.div>
      </motion.nav>

      {/* Main Templates Hub */}
      <main className="z-10 flex-1 max-w-6xl mx-auto w-full px-6 pt-32 pb-20">
        
        {/* Header */}
        <section className="text-center max-w-2xl mx-auto mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#16795A]/10 border border-[#16795A]/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-[#16795A] uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launchpad Templates
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Trip Templates
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-550 dark:text-slate-400 text-lg leading-relaxed"
          >
            Don&apos;t build your trip from scratch. Start with beautiful, group-tested itineraries and customize them to fit your crew&apos;s schedule.
          </motion.p>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap gap-2 items-center justify-center mb-12">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider mr-2">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all border ${
                selectedTag === tag
                  ? "bg-[#16795A] border-[#16795A] text-white shadow shadow-[#16795A]/25"
                  : "bg-white/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </section>

        {/* Templates Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((temp) => (
              <motion.div
                key={temp.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                onMouseEnter={() => setHoveredCard(temp.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group h-[28rem] relative"
              >
                {/* Header Background */}
                <div className={`h-36 bg-gradient-to-tr ${temp.gradient} p-6 flex flex-col justify-between text-white relative`}>
                  <div className="flex justify-between items-start">
                    <span className="bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md border border-white/10">
                      {temp.tag}
                    </span>
                    <span className="text-sm font-extrabold tracking-wide">{temp.cost}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-white/80 font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> {temp.location}</span>
                    <h3 className="font-extrabold text-xl leading-tight truncate">{temp.title}</h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Standard description / Animated Day list overlay */}
                  <div className="relative flex-1">
                    <AnimatePresence mode="wait">
                      {hoveredCard === temp.id ? (
                        <motion.div
                          key="days"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1">Snippet Itinerary</span>
                          {temp.days.map((day, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 font-medium leading-relaxed">
                              <ChevronRight className="w-3.5 h-3.5 text-[#16795A] shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{day}</span>
                            </div>
                          ))}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="desc"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            {temp.desc}
                          </p>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <Clock className="w-3.5 h-3.5" /> {temp.duration} duration
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Copy Link / Launch Action */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      onClick={() => handleUseTemplate(temp.id)}
                      className="bg-[#16795A]/10 text-[#16795A] hover:bg-[#16795A] hover:text-white rounded-xl h-11 px-5 border-0 font-bold flex items-center gap-2 cursor-pointer transition-all duration-300"
                    >
                      {copiedId === temp.id ? (
                        <>
                          <Check className="w-4 h-4 animate-bounce" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Use Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </section>

      </main>

      <Footer />
    </div>
  )
}
