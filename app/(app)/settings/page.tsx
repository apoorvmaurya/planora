"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import {
  Bell,
  Lock,
  Trash2,
  Loader2,
  CheckCircle2,
  Sun,
  Moon,
  Laptop,
  ArrowLeft,
  ShieldAlert,
  Save,
  KeyRound
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog"
import Link from "next/link"

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

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useUserStore()
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Tabs state
  const [activeTab, setActiveTab] = useState<"security" | "notifications" | "danger">("security")

  // Password update state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Push notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")
  const [isPushSupported, setIsPushSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Account deletion state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check notification support
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setIsPushSupported(true)
      setNotificationPermission(Notification.permission)
      
      navigator.serviceWorker.ready.then(async (registration) => {
        const sub = await registration.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      })
    }
  }, [])

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setIsUpdatingPassword(true)
    const toastId = toast.loading("Updating password...")
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success("Password updated successfully!", { id: toastId })
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.", { id: toastId })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Handle push subscription toggle
  const togglePushSubscription = async () => {
    if (!isPushSupported) return
    setIsSubscribing(true)
    
    try {
      if (isSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
          
          if (profile?.id) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", profile.id)
          }
          
          setIsSubscribed(false)
          toast.success("Unsubscribed from push notifications successfully.")
        }
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        setNotificationPermission(permission)
        
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
          })

          const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription)
          })

          if (!res.ok) throw new Error("Failed to save subscription on server.")
          
          setIsSubscribed(true)
          toast.success("Subscribed to push notifications successfully!")
        } else {
          toast.error("Notification permission was denied.")
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Push subscription action failed: " + err.message)
    } finally {
      setIsSubscribing(false)
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    const toastId = toast.loading("Deleting account...")
    try {
      const res = await fetch("/api/profile/delete", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to delete account")
      
      toast.success("Your profile and account have been successfully deleted.", { id: toastId })
      window.location.href = "/login"
    } catch (err: any) {
      toast.error(err.message || "Error deleting your profile.", { id: toastId })
    } finally {
      setIsDeletingAccount(false)
      setIsDeleteOpen(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-[85vh] pb-12 max-w-5xl mx-auto space-y-8">
      {/* Background Fluid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-40 -z-10">
        <div className="glass-bubble bubble-anim-1 w-32 h-32 top-10 right-10" style={{ animationDelay: "0s" }} />
        <div className="glass-bubble bubble-anim-2 w-24 h-24 bottom-20 left-10" style={{ animationDelay: "-5s" }} />
        <div className="glass-bubble bubble-anim-3 w-40 h-40 top-1/2 left-1/3" style={{ animationDelay: "-10s" }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/profile" className="flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-[#16795A] dark:hover:text-teal-400 transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </Link>
        <span className="text-xs bg-teal-50 dark:bg-teal-950/30 text-[#16795A] dark:text-teal-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          Preferences
        </span>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar Card */}
        <div className="md:col-span-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-none h-fit space-y-2">
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "security"
                ? "bg-[#16795A] text-white shadow-lg shadow-[#16795A]/30"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            <Lock className="w-4 h-4" /> Password & Security
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "notifications"
                ? "bg-[#16795A] text-white shadow-lg shadow-[#16795A]/30"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications & UI
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800/60 my-2" />
          <button
            onClick={() => setActiveTab("danger")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === "danger"
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Danger Zone
          </button>
        </div>

        {/* Content Area Card */}
        <div className="md:col-span-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[50vh] flex flex-col justify-between">
          
          <AnimatePresence mode="wait">
            {activeTab === "security" && (
              <motion.form
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleUpdatePassword}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-[#16795A] dark:text-teal-400" />
                      Password & Security
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Change your password to secure your account.</p>
                  </div>

                  {/* New Password field */}
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-[#16795A] transition-colors"
                      required
                    />
                  </div>

                  {/* Confirm Password field */}
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retype your new password"
                      className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-[#16795A] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl px-6 h-12 shadow shadow-[#16795A]/25 flex items-center gap-2 cursor-pointer"
                  >
                    {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Update Password
                  </Button>
                </div>
              </motion.form>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 flex-1"
              >
                {/* Push Notifications Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-[#16795A] dark:text-teal-400" />
                      Notification Preferences
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure how you receive trip updates and alerts.</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-950 dark:text-white">Push Notifications</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Receive real-time web push notifications about group itinerary changes, expense additions, and chats.</p>
                    </div>
                    
                    {isPushSupported ? (
                      <Button
                        onClick={togglePushSubscription}
                        disabled={isSubscribing}
                        className={`rounded-xl px-6 h-11 font-bold cursor-pointer transition-colors ${
                          isSubscribed
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
                            : "bg-[#16795A] hover:bg-[#115E46] text-white"
                        }`}
                      >
                        {isSubscribing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        ) : isSubscribed ? (
                          <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                        ) : null}
                        {isSubscribed ? "Enabled" : "Enable"}
                      </Button>
                    ) : (
                      <span className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/40">
                        Not supported by this browser
                      </span>
                    )}
                  </div>
                </div>

                {/* Theme Section */}
                <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Application Theme</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Select the theme that best fits your environment.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 cursor-pointer ${
                        theme === "light"
                          ? "border-[#16795A] bg-teal-50/20 dark:bg-teal-950/10 text-[#16795A]"
                          : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <Sun className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-bold">Light</span>
                    </button>

                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 cursor-pointer ${
                        theme === "dark"
                          ? "border-[#16795A] bg-teal-50/20 dark:bg-teal-950/10 text-teal-400"
                          : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs font-bold">Dark</span>
                    </button>

                    <button
                      onClick={() => setTheme("system")}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 cursor-pointer ${
                        theme === "system"
                          ? "border-[#16795A] bg-teal-50/20 dark:bg-teal-950/10 text-slate-900 dark:text-slate-100"
                          : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <Laptop className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-bold">System</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "danger" && (
              <motion.div
                key="danger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-red-650 dark:text-red-500 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5" />
                      Danger Zone
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Irreversible account administration options.</p>
                  </div>

                  <div className="border border-red-200 dark:border-red-950/30 rounded-3xl overflow-hidden divide-y divide-red-100 dark:divide-red-950/20 bg-red-50/10 dark:bg-red-950/5">
                    
                    {/* Delete account option */}
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="space-y-1 max-w-lg">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Account</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Permanently delete your Planora account, including all your personal profile information, travel preferences, private trip plans, and cooperative group itineraries. This action is absolute and cannot be undone.
                        </p>
                      </div>
                      <Button
                        onClick={() => setIsDeleteOpen(true)}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-11 px-5 shadow-lg shadow-red-500/10 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                      </Button>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Delete Account Confirmation Alert */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Permanently delete your account?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              This action is final and irreversible. All travel records, profile metrics, private checklists, and group collaborative links will be destroyed immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer" />}>
              Cancel
            </AlertDialogClose>
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-5 h-11 cursor-pointer font-bold border-0"
            >
              {isDeletingAccount ? "Deleting..." : "Delete Account Permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
