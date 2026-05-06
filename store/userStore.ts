import { create } from 'zustand'

export interface UserProfile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  travel_preferences: any
}

interface UserState {
  profile: UserProfile | null
  setProfile: (profile: UserProfile | null) => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}))
