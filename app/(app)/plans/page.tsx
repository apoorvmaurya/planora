import React from "react"
import { createClient } from "@/lib/supabase/server"
import { PlansGrid } from "./PlansGrid"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch all plans where user is a member of the group
  const { data: plans } = await supabase
    .from('plans')
    .select(`
      *,
      group:groups(
        name,
        group_members(
          user:profiles(full_name, avatar_url)
        )
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Plans</h1>
          <p className="text-slate-500 mt-1">Manage your upcoming trips, drafts, and past memories.</p>
        </div>
        
        <Link href="/plans/new" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#1D9E75] hover:bg-[#15805e] text-white gap-2 h-11 px-6 shadow-sm text-sm font-medium transition-all">
          <Plus className="w-5 h-5" />
          New Trip
        </Link>
      </div>

      <PlansGrid plans={plans || []} />
    </div>
  )
}
