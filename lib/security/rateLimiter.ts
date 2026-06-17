import { createClient } from '@supabase/supabase-js'

interface RateLimitOptions {
  ipAddress?: string
  userId?: string
  endpoint: string
  limit?: number
  windowMs?: number
}

/**
 * Checks and logs requests to enforce rate-limiting using the database request_logs table.
 * Returns true if request is allowed, false if limit is exceeded.
 */
export async function rateLimit({
  ipAddress,
  userId,
  endpoint,
  limit = 10,
  windowMs = 60000
}: RateLimitOptions): Promise<{ success: boolean; count: number }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const since = new Date(Date.now() - windowMs).toISOString()

  let query = supabase
    .from('request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('endpoint', endpoint)
    .gte('created_at', since)

  if (userId) {
    query = query.eq('user_id', userId)
  } else if (ipAddress) {
    query = query.eq('ip_address', ipAddress)
  } else {
    console.warn(`rateLimit called with neither ipAddress nor userId for endpoint ${endpoint}`)
    return { success: true, count: 0 }
  }

  const { count, error } = await query
  if (error) {
    console.error("Database error during rate limit check:", error)
    // Fail-open so database issues don't completely lock out users, but log error
    return { success: true, count: 0 }
  }

  const currentCount = count || 0

  if (currentCount >= limit) {
    return { success: false, count: currentCount }
  }

  // Insert log to record this request
  const { error: insertError } = await supabase
    .from('request_logs')
    .insert({
      ip_address: ipAddress || null,
      user_id: userId || null,
      endpoint
    })

  if (insertError) {
    console.error("Database error logging request to request_logs:", insertError)
  }

  return { success: true, count: currentCount + 1 }
}
