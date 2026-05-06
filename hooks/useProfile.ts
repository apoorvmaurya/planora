"use client"

import { useState } from "react"
import { useUserStore, UserProfile } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"

export function useProfile() {
  const { profile, setProfile } = useUserStore()
  const supabase = createClient()
  const [isUpdating, setIsUpdating] = useState(false)

  const updateProfile = async (updates: Partial<UserProfile>, newAvatarFile?: File) => {
    if (!profile?.id) return { error: "No user found" };
    setIsUpdating(true)

    try {
      let finalAvatarUrl = updates.avatar_url || profile.avatar_url;

      if (newAvatarFile) {
        const fileExt = newAvatarFile.name.split('.').pop();
        const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, newAvatarFile);
        
        if (uploadError) {
          throw new Error("Failed to upload avatar: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalAvatarUrl = publicUrlData.publicUrl;
      }

      const newProfileData = {
        ...updates,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(newProfileData)
        .eq('id', profile.id);

      if (error) throw error;

      // Update local Zustand store
      setProfile({
        ...profile,
        ...newProfileData
      });

      return { error: null };
    } catch (error: any) {
      console.error(error);
      return { error: error.message || "Failed to update profile" };
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    profile,
    updateProfile,
    isUpdating
  }
}
