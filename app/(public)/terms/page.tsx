"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, BookOpen, AlertCircle, UserCheck, ShieldAlert, Scale } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/layout/Footer"

export default function TermsOfServicePage() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("agreement")

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
    
    // Simple intersection detection for quick scroll index
    const sections = ["agreement", "accounts", "user-conduct", "limitation", "termination"]
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
    { id: "agreement", label: "1. Agreement of Terms", icon: BookOpen },
    { id: "accounts", label: "2. User Accounts", icon: UserCheck },
    { id: "user-conduct", label: "3. Rules of Conduct", icon: AlertCircle },
    { id: "limitation", label: "4. Liability Limits", icon: ShieldAlert },
    { id: "termination", label: "5. Termination", icon: Scale }
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
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform animate-pulse" />
            Back to Home
          </Link>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Plan<span className="text-[#1D9E75]">ora</span>
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
            className="inline-flex items-center gap-2 bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-[#1D9E75] uppercase"
          >
            <Scale className="w-3.5 h-3.5" />
            User Agreement
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Terms of Service
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-550 dark:text-slate-400 text-base"
          >
            Last Updated: May 30, 2026. Review our official terms of platform usage alongside our handy Plain English summaries.
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
                        ? "bg-[#1D9E75]/10 text-[#1D9E75] dark:text-teal-400"
                        : "text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-850"
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
            <div id="agreement" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#1D9E75]" /> 1. Agreement of Terms
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-350 space-y-4 text-sm leading-relaxed">
                  <p>
                    These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity (&quot;you&quot;), and Planora (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), concerning your access to and use of the Planora travel planner, website, and mobile software.
                  </p>
                  <p>
                    By logging in or using our service, you acknowledge that you have read, understood, and agree to be bound by all of these terms. If you do not agree, please close this page and stop using Planora immediately.
                  </p>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#1D9E75] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-550 dark:text-slate-400 leading-relaxed">
                    By logging into or using Planora, you are entering a legally binding agreement. Stop using the service if you don&apos;t agree to these rules.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div id="accounts" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#1D9E75]" /> 2. User Accounts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-350 space-y-4 text-sm leading-relaxed">
                  <p>
                    To access the trip planning platform, you must create a profile. You agree to provide accurate, current, and complete profile information. You are solely responsible for maintaining the confidentiality of your account credentials.
                  </p>
                  <p>
                    You must notify us immediately if you suspect unauthorized access or breaches of your credentials. We reserve the right to remove usernames or block accounts that are offensive or violate trademark rights.
                  </p>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#1D9E75] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-550 dark:text-slate-400 leading-relaxed">
                    Keep your profile information accurate and secure. You are responsible for all activity on your account.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div id="user-conduct" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#1D9E75]" /> 3. Rules of Conduct
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-350 space-y-4 text-sm leading-relaxed">
                  <p>
                    Planora is a collaborative platform. You agree to use the service only for legitimate group trip planning and expense coordination. You may not:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Upload abusive, defamatory, or copyright-violating text/images to shared group trip boards or Shared Memories.</li>
                    <li>Submit fake expense entries to deceive other group members.</li>
                    <li>Attempt to bypass our rate-limiting or Postgres RLS policies to view other users&apos; itineraries.</li>
                  </ul>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#1D9E75] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-550 dark:text-slate-400 leading-relaxed">
                    Be a good group member. Don&apos;t spam, write abusive posts, upload illegal photos, list fake expense statements, or attempt to hack our servers.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div id="limitation" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#1D9E75]" /> 4. Liability Limits
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-350 space-y-4 text-sm leading-relaxed">
                  <p>
                    Planora is provided on an &quot;AS-IS&quot; and &quot;AS-AVAILABLE&quot; basis. We make no warranties regarding service availability, lack of API errors, or database loss. We do not assume responsibility for flight delays, cancellation of events, or failures of group members to pay back debt logged on our platform.
                  </p>
                  <p>
                    Your reliance on any itineraries generated by our AI engine or pinned map coordinates is solely at your own risk.
                  </p>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#1D9E75] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-550 dark:text-slate-400 leading-relaxed">
                    We offer Planora &quot;as-is&quot;. We are not liable for database hiccups, bugs in AI routes, or friends failing to pay their split travel bills.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div id="termination" className="scroll-mt-24 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#1D9E75]" /> 5. Termination
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 text-slate-600 dark:text-slate-350 space-y-4 text-sm leading-relaxed">
                  <p>
                    We may terminate or suspend your account and access to the service immediately, without prior notice or liability, under our sole discretion, for conduct that violates these Terms or harms other users.
                  </p>
                  <p>
                    All provisions of the Terms which by their nature should survive termination shall survive termination, including ownership provisions, warranty disclaimers, and limitations of liability.
                  </p>
                </div>
                <div className="md:col-span-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/80 dark:border-teal-950/40 p-5 rounded-2xl text-xs space-y-2">
                  <span className="font-extrabold text-[#1D9E75] uppercase tracking-wider block">In Plain English</span>
                  <p className="text-slate-550 dark:text-slate-400 leading-relaxed">
                    We reserve the right to ban users who disrupt the platform or break the rules, without warning.
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
