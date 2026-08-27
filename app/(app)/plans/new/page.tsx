"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { toast } from "sonner"
import { AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { itineraryResponseSchema } from "@/lib/ai/prompts"
import { PlanNewStepBasics } from "@/components/shared/PlanNewStepBasics"
import { PlanNewStepPreferences } from "@/components/shared/PlanNewStepPreferences"
import { PlanNewStepGeneration } from "@/components/shared/PlanNewStepGeneration"

export default function NewPlanPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [groups, setGroups] = useState<any[]>([])

  const [destinationQuery, setDestinationQuery] = useState("")
  const [destination, setDestination] = useState<any>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [groupId, setGroupId] = useState("")

  const [tripType, setTripType] = useState("leisure")
  const [pace, setPace] = useState("moderate")
  const [dietaryNotes, setDietaryNotes] = useState("")
  const [mustHaves, setMustHaves] = useState("")
  const [avoid, setAvoid] = useState("")

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "initializing" | "streaming" | "saving" | "ready"
  >("idle")
  const planIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const urlGroupId = params.get("groupId")
      if (urlGroupId) setGroupId(urlGroupId)
    }
  }, [])

  useEffect(() => {
    async function fetchGroups() {
      const { data } = await supabase.from("groups").select("id, name, description")
      if (data) setGroups(data)
    }
    fetchGroups()
  }, [])

  const { submit, error } = useObject({
    api: "/api/plans/generate",
    schema: itineraryResponseSchema,
    onFinish: () => {
      setGenerationStatus("saving")
      toast.info("Saving itinerary to your workspace...")
      if (planIdRef.current) {
        const pollInterval = setInterval(async () => {
          try {
            const { data } = await supabase
              .from("itinerary_items")
              .select("id")
              .eq("plan_id", planIdRef.current)
              .limit(1)

            if (data && data.length > 0) {
              clearInterval(pollInterval)
              setGenerationStatus("ready")
              setTimeout(() => {
                router.push(`/plans/${planIdRef.current}/edit`)
              }, 1200)
            }
          } catch {
            // keep polling
          }
        }, 1500)

        setTimeout(() => {
          clearInterval(pollInterval)
          router.push(`/plans/${planIdRef.current}/edit`)
        }, 12000)
      }
    },
    onError: (err) => {
      setIsGenerating(false)
      setGenerationStatus("idle")
      toast.error(err.message || "Failed to generate plan")
    },
  })

  const todayStr = new Date().toISOString().split("T")[0]

  const handleStep1Next = () => {
    if (startDate < todayStr) {
      toast.error("Start date cannot be in the past.")
      return
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after the start date.")
      return
    }
    setStep(2)
  }

  const handleGenerate = async () => {
    if (!destination || !startDate || !endDate || !budget || !groupId) {
      toast.error("Please fill in all required fields")
      return
    }

    if (startDate < todayStr) {
      toast.error("Start date cannot be in the past.")
      return
    }

    if (endDate < startDate) {
      toast.error("End date must be on or after the start date.")
      return
    }

    setIsGenerating(true)
    setGenerationStatus("initializing")

    try {
      const createRes = await fetch("/api/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          budget: parseFloat(budget),
          currency,
          groupId,
          preferences: { tripType, pace, dietaryNotes, mustHaves, avoid },
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || "Failed to create plan")
      }

      const { planId } = await createRes.json()
      planIdRef.current = planId

      setGenerationStatus("streaming")
      submit({
        planId,
        destination,
        startDate,
        endDate,
        budget: parseFloat(budget),
        currency,
        groupId,
        preferences: { tripType, pace, dietaryNotes, mustHaves, avoid },
      })
    } catch (err: any) {
      toast.error(err.message || "Generation failed")
      setIsGenerating(false)
      setGenerationStatus("idle")
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-0">
      {!isGenerating ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-8 transition-colors duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-8 border-b border-slate-100 dark:border-slate-800 gap-4 transition-colors duration-500">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-550">
                Craft your plan
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-500">
                Let Planora&apos;s AI build the perfect itinerary for your group.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    step >= s ? "bg-[#16795A] scale-110" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <PlanNewStepBasics
                destination={destination}
                setDestination={setDestination}
                destinationQuery={destinationQuery}
                setDestinationQuery={setDestinationQuery}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                budget={budget}
                setBudget={setBudget}
                currency={currency}
                setCurrency={setCurrency}
                onNext={handleStep1Next}
              />
            )}

            {(step === 2 || step === 3) && (
              <PlanNewStepPreferences
                step={step}
                setStep={setStep}
                groupId={groupId}
                setGroupId={setGroupId}
                groups={groups}
                tripType={tripType}
                setTripType={setTripType}
                pace={pace}
                setPace={setPace}
                mustHaves={mustHaves}
                setMustHaves={setMustHaves}
                avoid={avoid}
                setAvoid={setAvoid}
                dietaryNotes={dietaryNotes}
                setDietaryNotes={setDietaryNotes}
              />
            )}

            {step === 4 && (
              <PlanNewStepGeneration
                step={step}
                setStep={setStep}
                destination={destination}
                startDate={startDate}
                endDate={endDate}
                budget={budget}
                currency={currency}
                groupId={groupId}
                groups={groups}
                tripType={tripType}
                pace={pace}
                isGenerating={false}
                generationStatus={generationStatus}
                onGenerate={handleGenerate}
                error={error}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
        <PlanNewStepGeneration
          step={step}
          setStep={setStep}
          destination={destination}
          startDate={startDate}
          endDate={endDate}
          budget={budget}
          currency={currency}
          groupId={groupId}
          groups={groups}
          tripType={tripType}
          pace={pace}
          isGenerating={true}
          generationStatus={generationStatus}
          onGenerate={handleGenerate}
          error={error}
        />
      )}
    </div>
  )
}
