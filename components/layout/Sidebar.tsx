"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUserStore } from "@/store/userStore"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Map,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  UserPlus
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
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
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
                  ? "bg-teal-50 text-[#1D9E75] font-semibold" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#1D9E75]" : "text-slate-400 group-hover:text-slate-600"}`} />
              {item.name}
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-4 px-2">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
              {profile?.full_name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-slate-500 truncate">
              @{profile?.username || "username"}
            </p>
          </div>
        </div>

        <Link 
          href="/profile"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors mt-1"
        >
          <LogOut className="w-5 h-5 text-red-400" />
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
            backdropFilter: scrolled ? "blur(20px)" : "blur(12px)",
            backgroundColor: scrolled
              ? "rgba(255, 255, 255, 0.85)"
              : "rgba(255, 255, 255, 0.6)",
            boxShadow: scrolled
              ? "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.3) inset"
              : "0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.5) inset",
            scale: scrolled ? 0.97 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full rounded-full border border-white/40 px-4 py-2.5 flex justify-between items-center shadow-lg"
          style={{ WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(12px)" }}
        >
          <Link href="/dashboard" className="text-xl font-bold tracking-tight px-1">
            Plan<span className="text-[#1D9E75]">ora</span>
          </Link>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full hover:bg-slate-100/80 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </motion.div>
      </motion.nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-40">
        {SidebarContent}
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
              className="md:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="md:hidden fixed left-0 top-0 h-screen w-64 bg-white shadow-2xl z-50 flex flex-col pt-16"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
