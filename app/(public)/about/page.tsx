"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Users, Shield, Sparkles, Zap, Heart, MapPin, Compass } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/layout/Footer"

export default function AboutPage() {
  const [scrolled, setScrolled] = useState(false)

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const values = [
    {
      icon: Users,
      title: "Radical Collaboration",
      desc: "Group trips shouldn't be dictated by one stressed organizer. We believe in building democratic workspaces where planning is shared and fun."
    },
    {
      icon: Zap,
      title: "Momentum First",
      desc: "Our momentum engine keeps conversations going, votes counting, and dates locking in. We design tools specifically to fight planning friction."
    },
    {
      icon: Shield,
      title: "Built on Trust",
      desc: "Your travel data, locations, and personal budgets are private. We store your details securely, allowing you to control who sees what."
    },
    {
      icon: Sparkles,
      title: "AI-Driven Magic",
      desc: "AI shouldn't replace the human touch of travel, but it should eliminate research fatigue. We use smart algorithms to jumpstart your itineraries."
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-hidden flex flex-col justify-between">
      {/* Background Fluid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-30">
        <div className="glass-bubble bubble-anim-1 w-32 h-32 top-20 left-10" />
        <div className="glass-bubble bubble-anim-2 w-28 h-28 bottom-40 right-10" style={{ animationDelay: "-4s" }} />
        <div className="glass-bubble bubble-anim-3 w-40 h-40 top-1/2 left-1/4" style={{ animationDelay: "-8s" }} />
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

      {/* Hero Section */}
      <main className="z-10 flex-1 max-w-5xl mx-auto w-full px-6 pt-32 pb-20">
        <section className="text-center max-w-3xl mx-auto mb-20 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-[#1D9E75] uppercase"
          >
            <Compass className="w-3.5 h-3.5" />
            Our Mission
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
          >
            We believe group trips should <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1D9E75] to-emerald-500">actually happen.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed"
          >
            Planora was born out of frustration. Countless chat groups titled &quot;Goa 2026&quot; or &quot;Europe Trip 🛫&quot; dying slow, quiet deaths in chat threads. We built a workspace to turn ideas into flight confirmations.
          </motion.p>
        </section>

        {/* Narrative Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Why group plans fail</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Planning trips with friends requires aligning calendars, splitting restaurant tabs, searching for locations on three different map apps, and compiling booking screenshots. It&apos;s a second full-time job.
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              When one person takes on the burden, they burn out. When everyone takes it on, communication disintegrates. Planora distributes the planning load equally and seamlessly.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800/85 p-8 rounded-3xl shadow-xl space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="bg-teal-100 dark:bg-teal-950/45 p-3 rounded-2xl text-[#1D9E75]">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">The Collaborative Map</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Vote on destinations, pin hotels, and plot road trips on a shared visual board.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-teal-100 dark:bg-teal-950/45 p-3 rounded-2xl text-[#1D9E75]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Real-Time Polls</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Decide on dates and budgets democratically without leaving the platform.</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Values Grid */}
        <section className="space-y-12 mb-20">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">What we stand for</h2>
            <p className="text-slate-500 dark:text-slate-400">Our design values shape the features we build for you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, i) => {
              const Icon = value.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-slate-100 dark:border-slate-900/80 p-8 rounded-3xl hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="bg-[#1D9E75]/10 group-hover:bg-[#1D9E75] w-12 h-12 rounded-xl flex items-center justify-center text-[#1D9E75] group-hover:text-white transition-all duration-300 mb-6">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{value.title}</h3>
                  <p className="text-slate-550 dark:text-slate-400 leading-relaxed text-sm">{value.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
