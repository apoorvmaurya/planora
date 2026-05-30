"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Sparkles,
  Zap,
  Users,
  Wallet,
  Image as ImageIcon,
  PlaneTakeoff,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Footer } from "@/components/layout/Footer";

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);
const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
);

const TEAL = "#1D9E75";

export default function PublicHomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    setMounted(true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-hidden">
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
            {/* Logo */}
            <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight shrink-0 text-slate-900 dark:text-slate-100">
              Plan<span style={{ color: TEAL }}>ora</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="#features" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-colors duration-200">Features</Link>
              <Link href="#how-it-works" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-colors duration-200">How it works</Link>
              <Link href="/coming-soon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-colors duration-200">Coming Soon</Link>
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center space-x-3">
              {mounted && (
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <Moon className="w-4 h-4 text-teal-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                </button>
              )}
              <Link href="/login" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-colors duration-200 px-3 py-1.5">
                Login
              </Link>
              <Link href="/signup" className="bg-[#1D9E75] hover:bg-[#15805e] text-white px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm shadow-[#1D9E75]/30 hover:shadow-md hover:shadow-[#1D9E75]/40">
                Get started free
              </Link>
            </div>

            {/* Mobile menu button & theme button */}
            <div className="md:hidden flex items-center gap-1">
              {mounted && (
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-pointer"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <Moon className="w-4 h-4 text-teal-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-[calc(100%+0.5rem)] left-4 right-4 mx-auto max-w-4xl bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800/50 shadow-xl shadow-slate-200/50 dark:shadow-black/45 p-6 md:hidden transition-all duration-500"
              style={{ WebkitBackdropFilter: "blur(20px)" }}
            >
              <div className="flex flex-col space-y-4">
                <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors py-2">Features</Link>
                <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors py-2">How it works</Link>
                <Link href="/coming-soon" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors py-2">Coming Soon</Link>
                <hr className="border-slate-100 dark:border-slate-900" />
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors py-2">Login</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="bg-[#1D9E75] hover:bg-[#15805e] text-white text-center px-6 py-3 rounded-full font-semibold transition-all shadow-sm">
                  Get started free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-32 lg:pb-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="z-10"
            >
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-6">
                Plans that actually happen — <span style={{ color: TEAL }}>together.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-lg leading-relaxed">
                Because group plans shouldn&apos;t die in the group chat. Planora aligns your friends, budgets, and schedules in one magical workspace.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup" className="flex items-center justify-center bg-[#1D9E75] hover:bg-[#15805e] text-white px-8 py-3.5 rounded-full font-semibold text-lg transition-all shadow-lg shadow-[#1D9E75]/30 hover:shadow-[#1D9E75]/50">
                  Start planning free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link href="#how-it-works" className="flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-8 py-3.5 rounded-full font-semibold text-lg transition-all shadow-sm">
                  See how it works
                </Link>
              </div>
            </motion.div>

            <div className="relative h-[500px] lg:h-[600px] w-full hidden lg:block">
              {/* Floating Elements Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-slate-50/50 dark:from-teal-950/20 dark:to-slate-950/20 rounded-full blur-3xl opacity-50" />

              {/* Group Chat Bubble */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute top-[10%] left-[10%] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl rounded-tl-sm shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-white dark:border-slate-800 max-w-[200px] z-20 transition-all duration-500"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">S</div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Sarah</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">We should go Goa!! 🌴</p>
              </motion.div>

              {/* Plan Card */}
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute top-[30%] right-[5%] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-teal-900/10 dark:shadow-black/40 border border-slate-100/80 dark:border-slate-800/80 max-w-[300px] z-30 transition-all duration-500"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Goa Getaway</h3>
                  <span className="bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-400 text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wider">Confirmed</span>
                </div>
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>North Goa, India</span>
                </div>
                <div className="flex -space-x-2">
                  {[{name: 'Sarah', grad: 'from-pink-500 to-rose-600'}, {name: 'John', grad: 'from-blue-500 to-cyan-600'}, {name: 'Alex', grad: 'from-teal-400 to-emerald-600'}, {name: 'Emily', grad: 'from-purple-500 to-fuchsia-600'}].map((person, i) => (
                    <div 
                      key={i} 
                      className={`w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 shadow-sm bg-gradient-to-br ${person.grad} flex items-center justify-center text-[10px] font-black text-white uppercase select-none`}
                    >
                      {person.name.charAt(0)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400 shadow-sm">+2</div>
                </div>
              </motion.div>

              {/* Notification Bubble */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-[20%] left-[20%] bg-[#1D9E75] text-white p-4 rounded-2xl shadow-xl shadow-[#1D9E75]/30 z-40 flex items-center gap-4"
              >
                <div className="bg-white/20 p-2 rounded-full shrink-0">
                  <Zap className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm font-bold">Momentum reached!</p>
                  <p className="text-xs text-teal-100 mt-0.5">Flights are getting booked.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="bg-white dark:bg-slate-950 py-24 relative z-20 border-y border-slate-100 dark:border-slate-900 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4 animate-fade-in">The group trip paradox</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">Everyone wants to go, nobody wants to plan. We built Planora to fix the exact reasons why your last trip didn&apos;t happen.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { stat: "78%", text: "of group plans never happen", desc: "Lost in chaotic chat threads and endless scrolling." },
                { stat: "11", text: "apps used for one trip", desc: "Spreadsheets, chats, notes, and payment apps." },
                { stat: "0", text: "tools for follow-through", desc: "Until Planora's Momentum Engine." }
              ].map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-8 lg:p-10 border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden group hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/40 transition-all duration-300"
                >
                  <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 rotate-12">
                    <Sparkles className="w-32 h-32 text-[#1D9E75]" />
                  </div>
                  <h3 className="text-5xl lg:text-6xl font-black text-[#1D9E75] mb-4 tracking-tight">{item.stat}</h3>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3">{item.text}</p>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-50/50 dark:bg-slate-950/20 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span className="text-[#1D9E75] font-bold tracking-wider uppercase text-sm mb-3 block">Features</span>
              <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-slate-50 mb-6 tracking-tight">Everything you need, nothing you don&apos;t</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Sparkles, title: "Smart AI Planning", desc: "Drop a prompt and get a fully personalized itinerary in seconds. No research needed." },
                { icon: Zap, title: "Momentum Engine", desc: "Smart nudges keep everyone engaged and accountable so plans actually materialize." },
                { icon: PlaneTakeoff, title: "Transit Weaver", desc: "Seamlessly integrate flights, trains, and cabs directly into your daily schedule." },
                { icon: Users, title: "Group Sync", desc: "Real-time collaborative workspace. Ditch the spreadsheets and endless chat scrolling." },
                { icon: Wallet, title: "Budget Splitter", desc: "Track expenses on the go and settle up automatically without the awkward math." },
                { icon: ImageIcon, title: "Trip Memories", desc: "A shared collaborative photo dump to easily relive the best moments of your journey." },
              ].map((feature, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 dark:hover:shadow-black/40 transition-all duration-300 group"
                >
                  <div className="bg-teal-50 dark:bg-teal-950/45 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#1D9E75] transition-all duration-300">
                    <feature.icon className="w-7 h-7 text-[#1D9E75] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-slate-900 dark:bg-slate-950 text-white py-24 lg:py-32 rounded-[3rem] mx-4 sm:mx-6 lg:mx-8 my-12 relative overflow-hidden shadow-2xl transition-colors duration-500 border border-slate-800/20 dark:border-slate-800/80">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/10 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 tracking-tight">How Planora works</h2>
              <p className="text-slate-400 text-lg lg:text-xl">From a simple idea to the boarding pass in four seamless steps.</p>
            </div>

            <div className="flex flex-col md:flex-row justify-between relative max-w-5xl mx-auto">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-700/50 dark:bg-slate-800/50 -z-10"></div>

              {[
                { step: "01", title: "Create group", desc: "Invite your friends via link." },
                { step: "02", title: "AI plans the trip", desc: "Generate a starting itinerary." },
                { step: "03", title: "Group votes", desc: "Swipe to agree on activities." },
                { step: "04", title: "Momentum kicks in", desc: "Book and go!" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center mb-16 md:mb-0 relative group">
                  <div className="w-24 h-24 bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-sm border-4 border-slate-900 dark:border-slate-950 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#1D9E75] transition-all duration-300 shadow-xl group-hover:shadow-[#1D9E75]/50 group-hover:scale-110">
                    <span className="text-2xl font-black text-slate-300 group-hover:text-white transition-colors">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-400 dark:text-slate-400 max-w-[180px] text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
