"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, MapPin, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Step 1: Avatar & Username
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Step 2: Location
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{city?: string, country?: string, lat?: number, lon?: number} | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Step 3: Preferences
  const [preferences, setPreferences] = useState({
    budget: [] as string[],
    style: [] as string[],
    company: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
      else router.push("/login");
    });
  }, [supabase, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleNextStep1 = async () => {
    if (!username) {
      toast.error("Please enter a username");
      return;
    }
    setStep(2);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (locationQuery.length > 2) {
        setIsSearchingLocation(true);
        try {
          const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(locationQuery)}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setLocationResults(data);
          }
        } catch (error) {
          console.error("Location search failed", error);
        } finally {
          setIsSearchingLocation(false);
        }
      } else {
        setLocationResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [locationQuery]);

  const handleSelectLocation = (loc: any) => {
    setSelectedLocation({
      city: loc.address?.city || loc.address?.town || loc.address?.village || loc.display_name.split(',')[0],
      country: loc.address?.country,
      lat: parseFloat(loc.lat),
      lon: parseFloat(loc.lon)
    });
    setLocationQuery(loc.display_name);
    setLocationResults([]);
  };

  const handleNextStep2 = () => {
    if (!selectedLocation) {
      toast.error("Please select a location from the dropdown");
      return;
    }
    setStep(3);
  };

  const togglePref = (category: 'budget' | 'style' | 'company', value: string) => {
    setPreferences(prev => {
      const current = prev[category];
      const updated = current.includes(value) 
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleFinish = async () => {
    if (!userId) return;
    setIsSubmitting(true);

    let finalAvatarUrl = null;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
      
      if (error) {
        toast.error("Failed to upload avatar. Check storage bucket config.");
        console.error(error);
      } else if (data) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalAvatarUrl = publicUrlData.publicUrl;
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username,
        avatar_url: finalAvatarUrl,
        city: selectedLocation?.city,
        country: selectedLocation?.country,
        latitude: selectedLocation?.lat,
        longitude: selectedLocation?.lon,
        travel_preferences: preferences
      })
      .eq('id', userId);

    if (profileError) {
      toast.error("Failed to save profile details");
      setIsSubmitting(false);
      return;
    }

    toast.success("Profile setup complete!");
    router.push("/dashboard");
  };

  return (
    <div className="premium-page-wrapper">
      <div className="max-w-xl w-full">
        {/* Progress Bar */}
        <div className="mb-8 flex justify-between items-center px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= i ? 'bg-[#16795A] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                {i}
              </div>
              {i < 3 && (
                <div className={`h-1 w-24 sm:w-32 mx-2 rounded-full transition-colors ${step > i ? 'bg-[#16795A]' : 'bg-slate-200 dark:bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="premium-card overflow-hidden relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Let&apos;s set up your profile</h2>
                  <p className="text-slate-500 dark:text-slate-400">Pick a username and add a photo so friends can find you.</p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#16795A] hover:bg-teal-50 dark:hover:bg-[#16795A]/10 transition-colors">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Label className="text-sm text-slate-500 dark:text-slate-400">Upload profile photo</Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Username</Label>
                  <Input 
                    placeholder="e.g. wanderlust99" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                  />
                </div>

                <Button onClick={handleNextStep1} className="w-full btn-teal-primary">
                  Continue
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Where are you based?</h2>
                  <p className="text-slate-500 dark:text-slate-400">We use this to calculate travel times and flight origins.</p>
                </div>

                <div className="space-y-2 relative">
                  <Label className="text-slate-700 dark:text-slate-300">Your City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input 
                      placeholder="Search for your city..." 
                      className="pl-9"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                    />
                    {isSearchingLocation && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 animate-spin" />
                    )}
                  </div>
                  
                  {locationResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 max-h-60 overflow-y-auto">
                      {locationResults.map((loc, i) => (
                        <div 
                          key={i} 
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 text-sm text-slate-700 dark:text-slate-300"
                          onClick={() => handleSelectLocation(loc)}
                        >
                          {loc.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="w-1/3 btn-slate-outline">Back</Button>
                  <Button onClick={handleNextStep2} className="w-2/3 btn-teal-primary">
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Travel Preferences</h2>
                  <p className="text-slate-500 dark:text-slate-400">Help our AI suggest the best plans for you.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-slate-900 dark:text-slate-100">Budget Level</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Budget', 'Mid-range', 'Luxury'].map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`budget-${item}`} 
                            checked={preferences.budget.includes(item)}
                            onCheckedChange={() => togglePref('budget', item)}
                          />
                          <label htmlFor={`budget-${item}`} className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-slate-900 dark:text-slate-100">Travel Style</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Adventure', 'Relaxed', 'Cultural', 'Nightlife'].map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`style-${item}`} 
                            checked={preferences.style.includes(item)}
                            onCheckedChange={() => togglePref('style', item)}
                          />
                          <label htmlFor={`style-${item}`} className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-slate-900 dark:text-slate-100">Usual Company</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Solo', 'Couples', 'Friends Group', 'Family'].map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`company-${item}`} 
                            checked={preferences.company.includes(item)}
                            onCheckedChange={() => togglePref('company', item)}
                          />
                          <label htmlFor={`company-${item}`} className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="w-1/3 btn-slate-outline" disabled={isSubmitting}>Back</Button>
                  <Button onClick={handleFinish} disabled={isSubmitting} className="w-2/3 btn-teal-primary">
                    {isSubmitting ? "Saving..." : "Finish Setup"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
