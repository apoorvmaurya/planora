"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useProfile } from "@/hooks/useProfile"
import { autocomplete } from "@/lib/locationiq/geocode"
import { toast } from "sonner"
import { Loader2, MapPin, Upload } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

const profileSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  bio: z.string().max(200, "Bio is too long").optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
})

interface EditProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProfileSheet({ open, onOpenChange }: EditProfileSheetProps) {
  const { profile, updateProfile, isUpdating } = useProfile()
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  // Location autocomplete states
  const [locationQuery, setLocationQuery] = useState("")
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{city?: string, country?: string, lat?: number, lon?: number} | null>(null)

  // Travel preferences
  const [preferences, setPreferences] = useState({
    budget: [] as string[],
    style: [] as string[],
    company: [] as string[],
  })

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      username: "",
      bio: "",
      city: "",
      country: "",
      timezone: "",
    },
  })

  // Initialize form with profile data when sheet opens
  useEffect(() => {
    if (open && profile) {
      form.reset({
        fullName: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        city: profile.city || "",
        country: profile.country || "",
        timezone: profile.timezone || "",
      })
      setLocationQuery(profile.city ? `${profile.city}, ${profile.country || ''}` : "")
      if (profile.travel_preferences) {
        setPreferences({
          budget: profile.travel_preferences.budget || [],
          style: profile.travel_preferences.style || [],
          company: profile.travel_preferences.company || [],
        })
      }
      setAvatarPreview(profile.avatar_url)
      setAvatarFile(null)
    }
  }, [open, profile, form])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (locationQuery.length > 2 && locationQuery !== `${selectedLocation?.city}, ${selectedLocation?.country}`) {
        setIsSearchingLocation(true)
        const results = await autocomplete(locationQuery)
        setLocationResults(results)
        setIsSearchingLocation(false)
      } else {
        setLocationResults([])
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [locationQuery, selectedLocation])

  const handleSelectLocation = (loc: any) => {
    const city = loc.address?.city || loc.address?.town || loc.address?.village || loc.display_name.split(',')[0]
    const country = loc.address?.country
    
    setSelectedLocation({
      city,
      country,
      lat: parseFloat(loc.lat),
      lon: parseFloat(loc.lon)
    })
    setLocationQuery(`${city}, ${country || ''}`)
    setLocationResults([])
    
    form.setValue("city", city)
    form.setValue("country", country)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const togglePref = (category: 'budget' | 'style' | 'company', value: string) => {
    setPreferences(prev => {
      const current = prev[category] || []
      const updated = current.includes(value) 
        ? current.filter(item => item !== value)
        : [...current, value]
      return { ...prev, [category]: updated }
    })
  }

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    const updates = {
      full_name: values.fullName,
      username: values.username,
      bio: values.bio,
      city: selectedLocation?.city || values.city,
      country: selectedLocation?.country || values.country,
      latitude: selectedLocation?.lat || profile?.latitude,
      longitude: selectedLocation?.lon || profile?.longitude,
      timezone: values.timezone,
      travel_preferences: preferences
    }

    const { error } = await updateProfile(updates, avatarFile || undefined)
    
    if (error) {
      toast.error(error)
    } else {
      toast.success("Profile updated successfully")
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-xl w-full p-0 flex flex-col bg-white">
        <SheetHeader className="px-6 py-4 border-b border-slate-100">
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>Update your personal information and preferences.</SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#1D9E75] hover:bg-teal-50 transition-colors">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#1D9E75]" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <Form {...form}>
              <form id="profile-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="janedoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your travel style..." 
                          className="resize-none h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2 relative">
                  <FormLabel>Location</FormLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search for your city..." 
                      className="pl-9"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                    />
                    {isSearchingLocation && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                    )}
                  </div>
                  
                  {locationResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-y-auto">
                      {locationResults.map((loc, i) => (
                        <div 
                          key={i} 
                          className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm"
                          onClick={() => handleSelectLocation(loc)}
                        >
                          {loc.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-4">Travel Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel className="text-sm font-medium text-slate-500">Budget Level</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {['Budget', 'Mid-range', 'Luxury'].map(item => (
                          <div key={item} className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <Checkbox 
                              id={`budget-${item}`} 
                              checked={preferences.budget?.includes(item)}
                              onCheckedChange={() => togglePref('budget', item)}
                            />
                            <label htmlFor={`budget-${item}`} className="text-sm cursor-pointer">{item}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel className="text-sm font-medium text-slate-500">Travel Style</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {['Adventure', 'Relaxed', 'Cultural', 'Nightlife'].map(item => (
                          <div key={item} className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <Checkbox 
                              id={`style-${item}`} 
                              checked={preferences.style?.includes(item)}
                              onCheckedChange={() => togglePref('style', item)}
                            />
                            <label htmlFor={`style-${item}`} className="text-sm cursor-pointer">{item}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </Form>
          </div>
        </ScrollArea>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 mt-auto">
          <Button 
            type="submit" 
            form="profile-form" 
            className="w-full bg-[#1D9E75] hover:bg-[#15805e]"
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
