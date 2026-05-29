import React from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Sparkles, Heart, MapPin, CalendarDays } from "lucide-react"
import { PublicShareHeader } from "@/components/shared/PublicShareHeader"

// Use service role to bypass RLS for public share links
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // 1. Fetch Plan by token
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, destination_name, start_date, end_date, recap_text, group:groups(name)')
    .eq('share_token', token)
    .single()

  if (planError || !plan) {
    return (
      <div className="premium-page-wrapper">
        <div className="premium-card text-center">
          <h1 className="text-2xl font-bold mb-2">Trip Not Found</h1>
          <p className="text-muted-foreground">This link may be invalid or the trip has been removed.</p>
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
    <div className="premium-page-root">
      {/* Header */}
      <PublicShareHeader />

      <main className="max-w-6xl mx-auto px-4 pt-28 pb-12 space-y-12">
        {/* Trip Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            {plan.destination_name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {(plan.group as any)?.name || 'Friends'}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {formatDate(plan.start_date)} - {formatDate(plan.end_date)}</span>
          </div>
        </div>

        {/* AI Recap */}
        {plan.recap_text && (
          <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 border border-border shadow-sm dark:shadow-none relative overflow-hidden max-w-3xl mx-auto transition-colors duration-500">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1D9E75]" />
            <div className="flex gap-4 items-start">
              <div className="bg-teal-50 dark:bg-teal-950/30 p-3 rounded-2xl text-[#1D9E75] shrink-0 hidden sm:block">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Trip Recap</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{plan.recap_text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">Shared Memories</h2>
          
          {!memories || memories.length === 0 ? (
            <div className="text-center py-20 bg-card text-muted-foreground rounded-3xl border border-border transition-colors duration-500">
              <p>No photos have been shared for this trip yet.</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {memories.map((memory) => {
                const likeCount = memory.memory_likes?.length || 0

                return (
                  <div key={memory.id} className="break-inside-avoid bg-card text-card-foreground rounded-3xl shadow-sm dark:shadow-none border border-border overflow-hidden transition-colors duration-500 group">
                    <div className="relative">
                      <img src={memory.photo_url} alt="Trip memory" className="w-full object-cover" />
                      {likeCount > 0 && (
                        <div className="absolute top-4 right-4 bg-background/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-border">
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                          <span className="text-sm font-semibold">{likeCount}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      {memory.caption && (
                        <p className="text-foreground/90 text-sm mb-3">{memory.caption}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {memory.user?.avatar_url ? (
                          <img 
                            src={memory.user.avatar_url} 
                            className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 object-cover"
                            alt="" 
                          />
                        ) : (
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${(() => { const n = memory.user?.full_name || ''; let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); const g = ['from-indigo-500 to-purple-600','from-teal-400 to-emerald-600','from-blue-500 to-cyan-600','from-orange-400 to-rose-600']; return g[Math.abs(h) % g.length]; })()} flex items-center justify-center text-[8px] font-black text-white uppercase select-none`}>
                            {memory.user?.full_name?.charAt(0) || "U"}
                          </div>
                        )}
                        <span className="text-xs font-medium text-muted-foreground">{memory.user?.full_name}</span>
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
