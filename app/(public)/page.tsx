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
  X
} from "lucide-react";
import Link from "next/link";

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

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Floating Island Navbar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
      >
        <motion.div
          animate={{
            backdropFilter: scrolled ? "blur(20px)" : "blur(12px)",
            backgroundColor: scrolled
              ? "rgba(255,255,255,0.85)"
              : "rgba(255,255,255,0.6)",
            boxShadow: scrolled
              ? "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.3) inset"
              : "0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.5) inset",
            scale: scrolled ? 0.97 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-4xl rounded-full border border-white/40 px-4 sm:px-6 py-3"
          style={{ WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(12px)" }}
        >
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight shrink-0">
              Plan<span style={{ color: TEAL }}>ora</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="#features" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors duration-200">Features</Link>
              <Link href="#how-it-works" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors duration-200">How it works</Link>
              <Link href="#pricing" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors duration-200">Pricing</Link>
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center space-x-3">
              <Link href="/login" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors duration-200 px-3 py-1.5">
                Login
              </Link>
              <Link href="/signup" className="bg-[#1D9E75] hover:bg-[#15805e] text-white px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm shadow-[#1D9E75]/30 hover:shadow-md hover:shadow-[#1D9E75]/40">
                Get started free
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-slate-100/80 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
              className="absolute top-[calc(100%+0.5rem)] left-4 right-4 mx-auto max-w-4xl bg-white/90 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 p-6 md:hidden"
              style={{ WebkitBackdropFilter: "blur(20px)" }}
            >
              <div className="flex flex-col space-y-4">
                <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 hover:text-slate-900 font-medium transition-colors py-2">Features</Link>
                <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 hover:text-slate-900 font-medium transition-colors py-2">How it works</Link>
                <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 hover:text-slate-900 font-medium transition-colors py-2">Pricing</Link>
                <hr className="border-slate-100" />
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 hover:text-slate-900 font-medium transition-colors py-2">Login</Link>
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
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                Plans that actually happen — <span style={{ color: TEAL }}>together.</span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 max-w-lg leading-relaxed">
                Because group plans shouldn&apos;t die in the group chat. Planora aligns your friends, budgets, and schedules in one magical workspace.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup" className="flex items-center justify-center bg-[#1D9E75] hover:bg-[#15805e] text-white px-8 py-3.5 rounded-full font-semibold text-lg transition-all shadow-lg shadow-[#1D9E75]/30 hover:shadow-[#1D9E75]/50">
                  Start planning free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link href="#how-it-works" className="flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-3.5 rounded-full font-semibold text-lg transition-all shadow-sm">
                  See how it works
                </Link>
              </div>
            </motion.div>

            <div className="relative h-[500px] lg:h-[600px] w-full hidden lg:block">
              {/* Floating Elements Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-slate-50 rounded-full blur-3xl opacity-50" />

              {/* Group Chat Bubble */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute top-[10%] left-[10%] bg-white/80 backdrop-blur-xl p-4 rounded-2xl rounded-tl-sm shadow-xl shadow-slate-200/50 border border-white max-w-[200px] z-20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">S</div>
                  <span className="font-semibold text-sm">Sarah</span>
                </div>
                <p className="text-sm text-slate-700">We should go Goa!! 🌴</p>
              </motion.div>

              {/* Plan Card */}
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute top-[30%] right-[5%] bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-teal-900/10 border border-slate-100/80 max-w-[300px] z-30"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Goa Getaway</h3>
                  <span className="bg-teal-100 text-teal-800 text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wider">Confirmed</span>
                </div>
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                  <MapPin className="w-4 h-4" />
                  <span>North Goa, India</span>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                  ))}
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500 shadow-sm">+2</div>
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
        <section className="bg-white py-24 relative z-20 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">The group trip paradox</h2>
              <p className="text-lg text-slate-600">Everyone wants to go, nobody wants to plan. We built Planora to fix the exact reasons why your last trip didn&apos;t happen.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { stat: "78%", text: "of group plans never happen", desc: "Lost in chaotic chat threads and endless scrolling." },
                { stat: "11", text: "apps used for one trip", desc: "Spreadsheets, chats, notes, and payment apps." },
                { stat: "0", text: "tools for follow-through", desc: "Until Planora&apos;s Momentum Engine." }
              ].map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="bg-slate-50 rounded-[2rem] p-8 lg:p-10 border border-slate-100 text-center relative overflow-hidden group hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300"
                >
                  <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 rotate-12">
                    <Sparkles className="w-32 h-32 text-[#1D9E75]" />
                  </div>
                  <h3 className="text-5xl lg:text-6xl font-black text-[#1D9E75] mb-4 tracking-tight">{item.stat}</h3>
                  <p className="text-xl font-bold text-slate-900 mb-3">{item.text}</p>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span className="text-[#1D9E75] font-bold tracking-wider uppercase text-sm mb-3 block">Features</span>
              <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Everything you need, nothing you don&apos;t</h2>
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
                  className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 group"
                >
                  <div className="bg-teal-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#1D9E75] transition-all duration-300">
                    <feature.icon className="w-7 h-7 text-[#1D9E75] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-slate-900 text-white py-24 lg:py-32 rounded-[3rem] mx-4 sm:mx-6 lg:mx-8 my-12 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/10 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 tracking-tight">How Planora works</h2>
              <p className="text-slate-400 text-lg lg:text-xl">From a simple idea to the boarding pass in four seamless steps.</p>
            </div>

            <div className="flex flex-col md:flex-row justify-between relative max-w-5xl mx-auto">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-700/50 -z-10"></div>

              {[
                { step: "01", title: "Create group", desc: "Invite your friends via link." },
                { step: "02", title: "AI plans the trip", desc: "Generate a starting itinerary." },
                { step: "03", title: "Group votes", desc: "Swipe to agree on activities." },
                { step: "04", title: "Momentum kicks in", desc: "Book and go!" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center mb-16 md:mb-0 relative group">
                  <div className="w-24 h-24 bg-slate-800/80 backdrop-blur-sm border-4 border-slate-900 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#1D9E75] transition-all duration-300 shadow-xl group-hover:shadow-[#1D9E75]/50 group-hover:scale-110">
                    <span className="text-2xl font-black text-slate-300 group-hover:text-white transition-colors">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-400 max-w-[180px] text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Simple, transparent pricing</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
              {[
                { name: "Free", price: "₹0", desc: "Perfect for small trips.", features: ["Up to 3 members", "Basic AI itinerary", "Standard polling"] },
                { name: "Pro", price: "₹199", period: "/mo", desc: "For the dedicated planner.", features: ["Unlimited members", "Advanced AI Itineraries", "Expense tracking", "Export to PDF"], popular: true },
                { name: "Groups", price: "₹499", period: "/mo", desc: "For large squads & families.", features: ["Everything in Pro", "Priority support", "Multiple sub-itineraries", "Custom integrations"] },
              ].map((tier, i) => (
                <div key={i} className={`bg-white rounded-[2rem] p-8 lg:p-10 border ${tier.popular ? 'border-[#1D9E75] shadow-2xl shadow-teal-900/10 md:-translate-y-4 md:scale-105 z-10' : 'border-slate-200'} relative flex flex-col h-full`}>
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#1D9E75] text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase shadow-md">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{tier.name}</h3>
                  <p className="text-slate-500 mb-8 h-12">{tier.desc}</p>
                  <div className="mb-8">
                    <span className="text-5xl font-black text-slate-900">{tier.price}</span>
                    {tier.period && <span className="text-slate-500 font-medium ml-1">{tier.period}</span>}
                  </div>
                  <ul className="space-y-4 mb-10 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-slate-700">
                        <CheckCircle2 className="w-5 h-5 text-[#1D9E75] flex-shrink-0" />
                        <span className="font-medium">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button className={`w-full py-4 rounded-full font-bold transition-all duration-300 ${tier.popular ? 'bg-[#1D9E75] hover:bg-[#15805e] text-white shadow-lg shadow-[#1D9E75]/25 hover:shadow-[#1D9E75]/40' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="text-3xl font-bold tracking-tight mb-6 inline-block">
                Plan<span style={{ color: TEAL }}>ora</span>
              </Link>
              <p className="text-slate-500 max-w-sm mb-8 text-lg leading-relaxed">
                Turning &quot;we should hang out&quot; into &quot;here&apos;s the boarding pass&quot;. The ultimate collaborative trip planner.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1D9E75] hover:border-[#1D9E75] transition-all duration-300 hover:shadow-md"><TwitterIcon className="w-5 h-5" /></a>
                <a href="#" className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1D9E75] hover:border-[#1D9E75] transition-all duration-300 hover:shadow-md"><InstagramIcon className="w-5 h-5" /></a>
                <a href="#" className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1D9E75] hover:border-[#1D9E75] transition-all duration-300 hover:shadow-md"><GithubIcon className="w-5 h-5" /></a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 text-lg">Product</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">Pricing</Link></li>
                <li><a href="#" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">Templates</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">Guides</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 text-lg">Company</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">About</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">Blog</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#1D9E75] font-medium transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm font-medium">© 2026 Planora. All rights reserved.</p>
            <p className="text-slate-400 text-sm font-medium flex items-center gap-1.5">Made with 💖 for better trips.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
