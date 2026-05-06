import React from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Sparkles, Heart, MapPin, CalendarDays } from "lucide-react"

// Use service role to bypass RLS for public share links
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PublicSharePage({ params }: { params: { token: string } }) {
  // 1. Fetch Plan by token
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, destination_name, start_date, end_date, recap_text, group:groups(name)')
    .eq('share_token', params.token)
    .single()

  if (planError || !plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Trip Not Found</h1>
          <p className="text-slate-500">This link may be invalid or the trip has been removed.</p>
        </div>
      </div>
    )
  }

  // 2. Fetch Memories for this plan
  const { data: memories } = await supabase
    .from('trip_memories')
    .select(`
      *,
      user:profiles(full_name, avatar_url),
      memory_likes(user_id)
    `)
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: false })

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              P
            </div>
            Planora
          </div>
          <Link href="/" className="text-sm font-medium text-[#1D9E75] hover:underline">
            Create your own trip
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Trip Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
            {plan.destination_name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {(plan.group as any)?.name || 'Friends'}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {formatDate(plan.start_date)} - {formatDate(plan.end_date)}</span>
          </div>
        </div>

        {/* AI Recap */}
        {plan.recap_text && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden max-w-3xl mx-auto">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1D9E75]" />
            <div className="flex gap-4 items-start">
              <div className="bg-teal-50 p-3 rounded-2xl text-[#1D9E75] shrink-0 hidden sm:block">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Trip Recap</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{plan.recap_text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Shared Memories</h2>
          
          {!memories || memories.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
              <p className="text-slate-500">No photos have been shared for this trip yet.</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {memories.map((memory) => {
                const likeCount = memory.memory_likes?.length || 0

                return (
                  <div key={memory.id} className="break-inside-avoid bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group">
                    <div className="relative">
                      <img src={memory.photo_url} alt="Trip memory" className="w-full object-cover" />
                      {likeCount > 0 && (
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                          <span className="text-sm font-semibold text-slate-700">{likeCount}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      {memory.caption && (
                        <p className="text-slate-800 text-sm mb-3">{memory.caption}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <img 
                          src={memory.user?.avatar_url || `https://ui-avatars.com/api/?name=${memory.user?.full_name}`} 
                          className="w-6 h-6 rounded-full bg-slate-100 object-cover"
                          alt="" 
                        />
                        <span className="text-xs font-medium text-slate-500">{memory.user?.full_name}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
