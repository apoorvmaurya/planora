"use client"

import { ReactNode, useRef } from "react"
import { useUserStore, UserProfile } from "@/store/userStore"

export function UserProvider({ 
  children, 
  initialProfile 
}: { 
  children: ReactNode; 
  initialProfile: UserProfile | null 
}) {
  const isInitialized = useRef(false)
  
  if (!isInitialized.current) {
    useUserStore.getState().setProfile(initialProfile)
    isInitialized.current = true
  }

  return <>{children}</>
}
