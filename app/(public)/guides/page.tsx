"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, BookOpen, ChevronDown, HelpCircle, Sparkles, Star } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/layout/Footer"

export default function GuidesPage() {
  const [scrolled, setScrolled] = useState(false)
  const [openGuide, setOpenGuide] = useState<number | null>(0)

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const guides = [
    {
      title: "Creating your first group & inviting friends",
      content: "To begin collaborative planning, navigate to your Groups tab and click 'Create group'. Upload a group cover photo, name it, and write a bio. Once created, copy the unique invite link and share it directly with your friends via WhatsApp or email. They will automatically be added as group members when clicking the link."
    },
    {
      title: "Generating AI itineraries with PlaBot",
      content: "When inside a group plan, click the 'Generate AI Itinerary' option. Enter a prompt describing your destination and travel style (e.g., 'A 4-day budget-friendly backpacking itinerary for Tokyo highlighting food crawls'). Planora's AI will parse your request and generate a complete day-by-day itinerary with pinned coordinates on your map board."
    },
    {
      title: "Splitting expenses & settling balances",
      content: "Navigate to your plan's Expense tab. Click 'Add Expense', enter the amount, select who paid, and choose how the cost should be split (equally, or custom shares). Planora automatically updates individual balances in real-time. When it's time to pay back, our engine calculates the minimum number of transactions needed to settle all debts."
    },
    {
      title: "Setting trip dates and voting on activities",
      content: "Itineraries are flexible. Any group member can suggest activities or schedule items. Other members can vote on proposed times, hotel locations, or restaurant bookings. Once consensus is reached, the activity is officially marked as 'Confirmed' on the shared timeline."
    },
    {
      title: "Using Offline Syncing on remote tracks",
      content: "Planora features full offline support. When hiking or transiting in areas without network coverage, you can still view your itineraries and add expenses. All changes are stored locally in your browser's IndexedDB database. The moment your device detects an internet connection, all entries will sync automatically with Supabase servers."
    }
  ]

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

      {/* Main Content Area */}
      <main className="z-10 flex-1 max-w-4xl mx-auto w-full px-6 pt-32 pb-20">
        
        {/* Header */}
        <section className="text-center max-w-2xl mx-auto mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#16795A]/10 border border-[#16795A]/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-[#16795A] uppercase"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Knowledge Base
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Planora User Guides
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-550 dark:text-slate-400 text-lg leading-relaxed"
          >
            Everything you need to know about setting up groups, utilizing AI planning, tracking joint budgets, and traveling stress-free.
          </motion.p>
        </section>

        {/* Guides Accordion Grid */}
        <section className="space-y-4 mb-16">
          {guides.map((guide, index) => {
            const isOpen = openGuide === index
            return (
              <div
                key={index}
                className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:shadow transition-all duration-300"
              >
                <button
                  onClick={() => setOpenGuide(isOpen ? null : index)}
                  className="w-full px-6 sm:px-8 py-5 flex items-center justify-between text-left font-bold text-slate-900 dark:text-white group cursor-pointer"
                >
                  <span className="text-base sm:text-lg group-hover:text-[#16795A] transition-colors">{guide.title}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 group-hover:text-slate-650 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 sm:px-8 pb-6 text-sm text-slate-550 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-850 pt-4">
                        {guide.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </section>

        {/* PlaBot chatbot promo */}
        <section className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-slate-100 dark:border-slate-900/85 p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg text-center sm:text-left">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-spin" style={{ animationDuration: '4s' }} /> Need quick assistance?
            </h3>
            <p className="text-sm text-slate-550 dark:text-slate-450 leading-relaxed">
              Use our built-in assistant **PlaBot** at the bottom-right corner of the app. It can guide you through trip setups, split math details, or itinerary updates in real-time.
            </p>
          </div>
          <div className="bg-[#16795A]/10 border border-[#16795A]/35 px-4 py-2 rounded-2xl text-xs font-bold text-[#16795A] uppercase tracking-wide shrink-0">
            <Sparkles className="w-4 h-4 inline-block mr-1.5 align-middle" /> Ask PlaBot
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
