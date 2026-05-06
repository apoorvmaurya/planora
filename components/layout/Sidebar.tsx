"use client"

import React, { useState } from "react"
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

        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium">Settings</span>
        </button>
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
      <div className="md:hidden fixed top-0 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          Plan<span className="text-[#1D9E75]">ora</span>
        </Link>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

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
