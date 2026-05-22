"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

export function PublicShareHeader() {
  const [scrolled, setScrolled] = useState(false)

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
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
          <Link href="/" className="text-xl font-bold tracking-tight">
            Plan<span className="text-[#1D9E75]">ora</span>
          </Link>
          <Link 
            href="/" 
            className="text-xs sm:text-sm font-semibold text-[#1D9E75] hover:text-[#15805e] bg-teal-50 hover:bg-teal-100/80 px-4 py-2 rounded-full transition-all duration-200"
          >
            Create your own trip
          </Link>
        </div>
      </motion.div>
    </motion.nav>
  )
}
