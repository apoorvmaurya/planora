"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Shield, Eye, Lock, FileText, Database } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/layout/Footer"

export default function PrivacyPolicyPage() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("introduction")

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
    
    // Simple intersection detection for quick scroll index
    const sections = ["introduction", "information-collected", "data-usage", "data-sharing", "security"]
    for (const section of sections) {
      const el = document.getElementById(section)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.top >= 0 && rect.top <= 300) {
          setActiveSection(section)
          break
        }
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const sections = [
    { id: "introduction", label: "1. Introduction", icon: FileText },
    { id: "information-collected", label: "2. Information We Collect", icon: Database },
    { id: "data-usage", label: "3. How We Use Data", icon: Eye },
    { id: "data-sharing", label: "4. Information Sharing", icon: Shield },
    { id: "security", label: "5. Data Security", icon: Lock }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-hidden flex flex-col justify-between">
      {/* Background Fluid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-30">
        <div className="glass-bubble bubble-anim-1 w-32 h-32 top-10 left-[10%]" />
        <div className="glass-bubble bubble-anim-2 w-24 h-24 bottom-20 right-[10%]" style={{ animationDelay: "-5s" }} />
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

      {/* Content Container */}
      <main className="z-10 flex-1 max-w-6xl mx-auto w-full px-6 pt-32 pb-20">
        
        {/* Header */}
        <section className="text-center max-w-2xl mx-auto mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#16795A]/10 border border-[#16795A]/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-[#16795A] uppercase"
          >
            <Shield className="w-3.5 h-3.5" />
            Privacy Center
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Privacy Policy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 dark:text-slate-400 text-base"
          >
            Last Updated: May 30, 2026. We believe legal policies should be readable. Below, you will find our official terms alongside clear &quot;Plain English&quot; summaries.
          </motion.p>
        </section>

        {/* Split view: Index & Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Navigation Index */}
          <div className="lg:col-span-4 sticky top-24 hidden lg:block bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Sections</h3>
            <div className="space-y-1">
              {sections.map((sec) => {
                const Icon = sec.icon
                const isActive = activeSection === sec.id
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                      isActive
                        ? "bg-[#16795A]/10 text-[#16795A] dark:text-teal-400"
                        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {sec.label}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right Documents list */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Section 1 */}
            <div id="introduction" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#16795A]" /> 1. Introduction
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-300 space-y-4 text-sm leading-relaxed">
                  <p>
                    Planora (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our collaborative travel planning service, mobile apps, and associated APIs.
                  </p>
                  <p>
                    By accessing or using Planora, you consent to the collection and processing of your personal information as described in this policy. If you do not agree, please do not use our services.
                  </p>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#16795A] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    This document explains what data Planora collects from you, how we keep it safe, and what we do with it. By using Planora, you agree to these rules.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div id="information-collected" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#16795A]" /> 2. Information We Collect
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-300 space-y-4 text-sm leading-relaxed">
                  <p>
                    We collect personal information that you voluntarily provide to us when registering, setting up a profile, creating trips, splitting budgets, or communicating with us. This includes:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Account details (Username, Email, Full Name, Password, and profile avatars).</li>
                    <li>Collaborative Trip Data (pinned map locations, custom itineraries, flight codes, shared expenses, and uploads to Shared Memories).</li>
                    <li>Device metadata (IP Address, Browser Type, operating system, and push subscription details for notifications).</li>
                  </ul>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#16795A] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-550 dark:text-slate-400 leading-relaxed">
                    We collect the name and email you sign up with, the details of the trips you plan, the expenses you add, photos you upload, and standard technical details from your device.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div id="data-usage" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#16795A]" /> 3. How We Use Data
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-300 space-y-4 text-sm leading-relaxed">
                  <p>
                    We process your information for purposes based on legitimate business interests, the fulfillment of our contract with you, compliance with legal obligations, and user consent. We use your data to:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Facilitate real-time collaborative map edits and expense balances across group members.</li>
                    <li>Train and trigger our momentum engine prompts and itinerary generation algorithms (using OpenAI/Groq APIs, without storing personal tokens).</li>
                    <li>Send push alerts about trip date locks, itinerary modifications, and expense settlements.</li>
                  </ul>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#16795A] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    We use your details to make sure you and your friends can plan trips in real-time, generate routes using AI, split expenses, and receive timely push notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div id="data-sharing" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#16795A]" /> 4. Information Sharing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-300 space-y-4 text-sm leading-relaxed">
                  <p>
                    We do not sell, rent, or trade your personal information. Your details are shared only in the following scenarios:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>**With group members**: Your full name, profile username, profile photo, and budget balances are visible to other members of the groups you join.</li>
                    <li>**With third-party vendors**: Database storage via Supabase, emails via Resend, and analytics via Vercel. These providers only access data necessary for their service.</li>
                  </ul>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#16795A] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    We never sell your data. We share your profile name with friends you plan trips with, and securely sync data with our hosting partners (like Supabase).
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div id="security" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#16795A]" /> 5. Data Security
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-300 space-y-4 text-sm leading-relaxed">
                  <p>
                    We implement appropriate technical and organizational security measures, including database Row Level Security (RLS) on Postgres schemas, to protect the security of your personal information.
                  </p>
                  <p>
                    However, please remember that no transmission over the internet can be guaranteed 100% secure. Although we will do our best to protect your personal information, transmission of personal information to and from our services is at your own risk.
                  </p>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#16795A] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    We use state-of-the-art security filters so only group members can see group trips. While we do our best to encrypt and protect data, internet transfers always carry some small risk.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      <Footer />
    </div>
  )
}
