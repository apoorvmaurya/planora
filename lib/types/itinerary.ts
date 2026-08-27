/**
 * Strongly typed domain interfaces for Planora itineraries, votes, members, and transit.
 * Replaces unstructured `any` types across UI components and API handlers.
 */

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'pre-trip'

export type ItemCategory = 'activity' | 'food' | 'transport' | 'accommodation' | 'leisure'

export interface PlanItem {
  id: string
  plan_id: string
  day_number: number
  title: string
  description?: string | null
  time_of_day: TimeOfDay | string
  location_name?: string | null
  lat?: number | null
  lng?: number | null
  category?: ItemCategory | string
  duration_minutes?: number | null
  estimated_cost?: number | null
  sort_order?: number
  suggestion_status?: 'approved' | 'suggestion' | 'rejected' | string
  parent_item_id?: string | null
  is_delete_suggestion?: boolean
  created_by?: string | null
  created_at?: string
}

export interface MemberVote {
  id: string
  item_id: string
  user_id: string
  vote: 'up' | 'down'
  plan_id?: string
  created_at?: string
}

export interface GroupMemberProfile {
  id?: string
  full_name?: string | null
  avatar_url?: string | null
  email?: string | null
}

export interface GroupMember {
  id?: string
  group_id: string
  user_id: string
  role: 'admin' | 'member' | string
  created_at?: string
  user?: GroupMemberProfile | null
  full_name?: string
  avatar_url?: string
}

export interface ActivityLog {
  id: string
  plan_id: string
  user_id: string
  action: string
  description: string
  created_at: string
  metadata?: Record<string, any>
  user?: GroupMemberProfile | null
}

export interface TransitOption {
  id?: string
  mode: 'flight' | 'train' | 'bus' | 'drive' | string
  from: string
  to: string
  duration: string
  estimated_cost?: string | number
  carrier?: string
  departure_time?: string
  arrival_time?: string
  booking_url?: string
}

export interface PlanDetails {
  id: string
  title: string
  destination_name: string
  start_date: string
  end_date: string
  budget?: number | null
  currency?: string
  group_id?: string | null
  created_by: string
  status: 'draft' | 'confirmed' | 'completed' | string
  home_city?: string | null
  pace?: string
  travel_style?: string
  dietary_preferences?: string[]
}

export interface ItineraryItemCardProps {
  item: PlanItem
  votes: MemberVote[]
  currentUserId?: string
  isAdmin: boolean
  onVote: (itemId: string, voteType: 'up' | 'down') => Promise<void> | void
  onUpdate?: () => Promise<void> | void
  members: GroupMember[]
  isSolo?: boolean
}
