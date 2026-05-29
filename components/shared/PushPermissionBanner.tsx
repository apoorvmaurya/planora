"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BellRing, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushPermissionBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    // Check if dismissed previously or if already granted/denied
    const isDismissed = localStorage.getItem("planora_push_dismissed")
    if (isDismissed) return

    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        setIsVisible(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem("planora_push_dismissed", "true")
    setIsVisible(false)
  }

  const handleEnable = async () => {
    try {
      setIsSubscribing(true)
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        })

        localStorage.setItem("planora_push_dismissed", "true")
        setIsVisible(false)
      } else {
        handleDismiss() // user denied or dismissed
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 450, damping: 25 }}
          className="fixed top-20 right-4 z-50 max-w-sm w-full"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-none rounded-2xl p-4 flex gap-4 items-start relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#1D9E75]/10 rounded-bl-full" />
            
            <div className="bg-teal-50 dark:bg-teal-950/20 text-[#1D9E75] dark:text-teal-400 p-2.5 rounded-xl shrink-0 mt-1 transition-colors duration-500">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            
            <div className="flex-1 pr-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm transition-colors duration-500">Enable trip reminders</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3 transition-colors duration-500">Get real-time updates about your group itineraries, votes, and expenses.</p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleEnable} 
                  disabled={isSubscribing}
                  size="sm" 
                  className="bg-[#1D9E75] hover:bg-[#15805e] text-white h-8 text-xs rounded-lg cursor-pointer"
                >
                  {isSubscribing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : null}
                  Enable Notifications
                </Button>
                <Button 
                  onClick={handleDismiss} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Later
                </Button>
              </div>
            </div>

            <button onClick={handleDismiss} className="absolute top-3 right-3 text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350 cursor-pointer transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
