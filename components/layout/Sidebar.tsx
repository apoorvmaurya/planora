"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUserStore } from "@/store/userStore"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Map,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  UserPlus,
  Sun,
  Moon
} from "lucide-react"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Plans", href: "/plans", icon: Map },
  { name: "Groups", href: "/groups", icon: Users },
  { name: "Friends", href: "/friends", icon: UserPlus },
  { name: "Profile", href: "/profile", icon: UserCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile } = useUserStore()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 10)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }



  const SidebarContent = (
    <>
      <div className="p-6">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Plan<span className="text-[#1D9E75]">ora</span>
        </Link>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? "bg-teal-50 dark:bg-teal-950/30 text-[#1D9E75] font-semibold" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-50"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#1D9E75]" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
              {item.name}
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
              {profile?.full_name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              @{profile?.username || "username"}
            </p>
          </div>
        </div>

        {mounted && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors mt-1">
            <div className="flex items-center gap-3">
              {resolvedTheme === "dark" ? <Moon className="w-5 h-5 text-teal-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <span className="text-sm font-medium">Theme</span>
            </div>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle theme"
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-teal-400 shadow-md"
                style={{
                  marginLeft: resolvedTheme === "dark" ? "1.5rem" : "0.25rem"
                }}
              />
            </button>
          </div>
        )}

        <Link 
          href="/profile"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mt-1"
          onClick={() => setIsOpen(false)}
        >
          <Settings className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-300 transition-colors mt-1 cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-red-400 dark:text-red-500" />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Top Bar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-30 flex justify-center px-4 pt-3 md:hidden"
      >
        <motion.div
          animate={{
            scale: scrolled ? 0.97 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`w-full rounded-full px-4 py-2.5 flex justify-between items-center relative overflow-hidden ${
            scrolled ? "glass-nav-scrolled" : "glass-nav-unscrolled"
          }`}
        >
          {/* Refracting Bubbles specifically for mobile header background */}
          {scrolled && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-60">
              <div className="glass-bubble bubble-anim-1 w-10 h-10 -top-2 left-10" style={{ animationDelay: "-2s" }} />
              <div className="glass-bubble bubble-anim-2 w-8 h-8 -bottom-1 right-20" style={{ animationDelay: "-10s" }} />
            </div>
          )}
          
          <div className="relative z-10 flex justify-between items-center w-full">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight px-1 text-slate-900 dark:text-slate-100">
              Plan<span className="text-[#1D9E75]">ora</span>
            </Link>
            <div className="flex items-center gap-1">
              {mounted && (
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 cursor-pointer"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <Moon className="w-5 h-5 text-teal-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                </button>
              )}
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 z-40 overflow-hidden">
        {/* Refracting Glass Bubbles Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-60">
          <div className="glass-bubble bubble-anim-1 w-24 h-24 -left-6" style={{ animationDelay: "0s" }} />
          <div className="glass-bubble bubble-anim-2 w-16 h-16 -right-4" style={{ animationDelay: "-8s" }} />
          <div className="glass-bubble bubble-anim-3 w-32 h-32 left-10" style={{ animationDelay: "-15s" }} />
          <div className="glass-bubble bubble-anim-1 w-20 h-20 right-6" style={{ animationDelay: "-22s" }} />
        </div>
        <div className="relative z-10 flex flex-col h-full flex-1">
          {SidebarContent}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="md:hidden fixed left-0 top-0 h-screen w-64 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 shadow-2xl z-50 flex flex-col pt-16 overflow-hidden"
            >
              {/* Refracting Glass Bubbles Background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-60">
                <div className="glass-bubble bubble-anim-1 w-20 h-20 -left-4" style={{ animationDelay: "-4s" }} />
                <div className="glass-bubble bubble-anim-2 w-14 h-14 -right-2" style={{ animationDelay: "-12s" }} />
                <div className="glass-bubble bubble-anim-3 w-28 h-28 left-8" style={{ animationDelay: "-20s" }} />
              </div>
              <div className="relative z-10 flex flex-col h-full flex-1">
                {SidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
