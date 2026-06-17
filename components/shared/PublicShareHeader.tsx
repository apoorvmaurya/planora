"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

export function PublicShareHeader() {
  const [scrolled, setScrolled] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
    setMounted(true)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  return (
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
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Plan<span className="text-[#16795A]">ora</span>
          </Link>
          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? <Moon className="w-4 h-4 text-teal-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </button>
            )}
            <Link 
              href="/" 
              className="text-xs sm:text-sm font-semibold text-[#16795A] hover:text-white dark:hover:text-white bg-teal-50 dark:bg-teal-950/40 hover:bg-[#16795A] dark:hover:bg-[#16795A] px-4 py-2 rounded-full transition-all duration-200"
            >
              Create your own trip
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.nav>
  )
}
