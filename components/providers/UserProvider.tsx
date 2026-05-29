"use client"

import { ReactNode, useEffect } from "react"
import { useUserStore, UserProfile } from "@/store/userStore"

export function UserProvider({ 
  children, 
  initialProfile 
}: { 
  children: ReactNode; 
  initialProfile: UserProfile | null 
}) {
  useEffect(() => {
    useUserStore.getState().setProfile(initialProfile)
  }, [initialProfile])

  return <>{children}</>
}

