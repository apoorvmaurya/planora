"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { Bell, Sparkles, Loader2, CalendarClock, Briefcase, CloudSun, MapPin } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ErrorState } from "@/components/shared/ErrorState"

type Preferences = {
  opt_out_t30: boolean;
  opt_out_t7: boolean;
  opt_out_t24: boolean;
  opt_out_t0: boolean;
}

export default function NotificationsPage() {
  const params = useParams()
  const planId = params.planId as string
  const supabase = createClient()
  const { profile } = useUserStore()

  const [plan, setPlan] = useState<any>(null)
  const [preferences, setPreferences] = useState<Preferences>({
    opt_out_t30: false,
    opt_out_t7: false,
    opt_out_t24: false,
    opt_out_t0: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      const { data: pData } = await supabase.from('plans').select('*').eq('id', planId).single()
      setPlan(pData)

      if (profile) {
        const { data: prefData } = await supabase
          .from('plan_notification_preferences')
          .select('*')
          .eq('plan_id', planId)
          .eq('user_id', profile.id)
          .single()

        if (prefData) {
          setPreferences({
            opt_out_t30: prefData.opt_out_t30,
            opt_out_t7: prefData.opt_out_t7,
            opt_out_t24: prefData.opt_out_t24,
            opt_out_t0: prefData.opt_out_t0,
          })
        }
      }
      setIsLoading(false)
    }

    if (profile) fetchData()
  }, [planId, profile, supabase])

  const handleToggle = async (key: keyof Preferences, checked: boolean) => {
    if (!profile) return

    setPreferences(prev => ({ ...prev, [key]: checked }))
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('plan_notification_preferences')
        .upsert({
          plan_id: planId,
          user_id: profile.id,
          [key]: checked,
          updated_at: new Date().toISOString()
        }, { onConflict: 'plan_id,user_id' })

      if (error) throw error
    } catch (err) {
      console.error("Failed to update preferences", err)
      // Revert on fail
      setPreferences(prev => ({ ...prev, [key]: !checked }))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="text-center py-20 text-slate-500 dark:text-slate-450 transition-colors duration-500">Loading settings...</div>
  if (!plan) return <ErrorState variant="not_found" title="Plan not found" backHref="/plans" backLabel="Back to plans" />

  const triggers = [
    {
      key: 'opt_out_t30' as keyof Preferences,
      title: 'T-30 Excitement Spark',
      description: 'A hype-building reminder 30 days before the trip starts.',
      icon: <CalendarClock className="w-5 h-5" />,
      preview: `Only 30 days until ${plan.destination_name}! Get ready! 🎉`
    },
    {
      key: 'opt_out_t7' as keyof Preferences,
      title: 'T-7 Packing Nudge',
      description: 'A reminder to start packing 7 days out.',
      icon: <Briefcase className="w-5 h-5" />,
      preview: `1 Week Left! Time to start packing for ${plan.destination_name}! 🧳`
    },
    {
      key: 'opt_out_t24' as keyof Preferences,
      title: 'T-24 Hype Drop',
      description: 'The final 24-hour weather and hype check.',
      icon: <CloudSun className="w-5 h-5" />,
      preview: `Tomorrow is the day! Check the weather for ${plan.destination_name}! ☀️`
    },
    {
      key: 'opt_out_t0' as keyof Preferences,
      title: 'Day-of Morning Brief',
      description: 'An energetic morning push on the day the trip starts.',
      icon: <MapPin className="w-5 h-5" />,
      preview: `Trip Day! It's finally here. Let's conquer ${plan.destination_name}! 🗺️`
    }
  ]

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-8 px-4 sm:px-0">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-550">Momentum Engine</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2 transition-colors duration-500">
          Manage AI-powered push notifications for this trip. 
          <span className="inline-flex items-center gap-1 text-[#16795A] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors duration-500">
            <Sparkles className="w-3 h-3" /> Powered by AI
          </span>
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-500">
        {triggers.map((trigger, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={trigger.key} 
            className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/35 transition-colors duration-500"
          >
            <div className="flex gap-4 items-start flex-1">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-slate-600 dark:text-slate-350 shrink-0 transition-colors duration-500">
                {trigger.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white transition-colors duration-500">{trigger.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-500">{trigger.description}</p>
                
                <div className="mt-4 bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-2xl shadow-lg inline-block relative max-w-sm border border-slate-800">
                  <div className="absolute -top-2 left-4 w-4 h-4 bg-slate-900 dark:bg-slate-950 border-t border-l border-slate-850 dark:border-slate-800 rotate-45" />
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/icon-192.png" className="w-4 h-4 rounded-sm bg-white" alt="" />
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Planora</span>
                  </div>
                  <p className="text-sm leading-tight text-white/90">
                    {trigger.preview}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 shrink-0 pt-4 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors duration-500">
                {preferences[trigger.key] ? 'Opted out' : 'Enabled'}
              </span>
              <Switch 
                checked={!preferences[trigger.key]} 
                onCheckedChange={(checked: boolean) => handleToggle(trigger.key, !checked)}
                disabled={isSaving}
                className="data-[state=checked]:bg-[#16795A]"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
