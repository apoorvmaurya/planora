"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, Loader2, Check, AlertCircle } from "lucide-react"

interface PlanNewStepGenerationProps {
  step: number
  setStep: (s: number) => void
  destination: any
  startDate: string
  endDate: string
  budget: string
  currency: string
  groupId: string
  groups: any[]
  tripType: string
  pace: string
  isGenerating: boolean
  generationStatus: "idle" | "initializing" | "streaming" | "saving" | "ready"
  onGenerate: () => void
  error: any
}

export function PlanNewStepGeneration({
  setStep,
  destination,
  startDate,
  endDate,
  budget,
  currency,
  groupId,
  groups,
  tripType,
  pace,
  isGenerating,
  generationStatus,
  onGenerate,
  error,
}: PlanNewStepGenerationProps) {
  const getStatusDetails = () => {
    switch (generationStatus) {
      case "initializing":
        return {
          title: "Analyzing Destination & Setting Up...",
          description: "Evaluating regional constraints, travel pacing, and preparing your custom workspace...",
          icon: <Loader2 className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4 animate-spin" />,
          progressWidth: "15%",
          progressDuration: 1.5,
        }
      case "streaming":
        return {
          title: "Planora AI is crafting your trip...",
          description: "Streaming your itinerary from AI, optimizing distances, budgets, and sequencing daily activities...",
          icon: <Sparkles className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4 animate-pulse" />,
          progressWidth: "65%",
          progressDuration: 8,
        }
      case "saving":
        return {
          title: "Saving Itinerary to Workspace...",
          description: "Structuring the itinerary days, caching locations, and preparing your dashboard views...",
          icon: <Loader2 className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4 animate-spin" />,
          progressWidth: "90%",
          progressDuration: 3,
        }
      case "ready":
        return {
          title: "Itinerary is Ready!",
          description: "Successfully saved. Redirecting you to your beautiful new trip workspace...",
          icon: (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-[#16795A] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-900/35"
            >
              <Check className="w-8 h-8 text-white stroke-[3.5px]" />
            </motion.div>
          ),
          progressWidth: "100%",
          progressDuration: 0.5,
        }
      default:
        return {
          title: "Preparing Generation...",
          description: "Starting AI generation process...",
          icon: <Sparkles className="w-12 h-12 text-[#16795A] dark:text-teal-400 mx-auto mb-4" />,
          progressWidth: "5%",
          progressDuration: 1,
        }
    }
  }

  const statusDetails = getStatusDetails()

  if (isGenerating) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-12 text-center transition-colors duration-500">
        {statusDetails.icon}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-500">
          {statusDetails.title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 transition-colors duration-500">
          {statusDetails.description}
        </p>

        <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-gradient-to-r from-[#16795A] to-teal-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: statusDetails.progressWidth }}
            transition={{ duration: statusDetails.progressDuration, ease: "easeInOut" }}
          />
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Generation encountered an issue: {error.message}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">
        Step 4: Review & Generate
      </h2>

      <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-500">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Destination:</span>{" "}
            <strong className="block text-slate-900 dark:text-white transition-colors duration-500">
              {destination?.name}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Dates:</span>{" "}
            <strong className="block text-slate-900 dark:text-white transition-colors duration-500">
              {startDate} to {endDate}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Budget:</span>{" "}
            <strong className="block text-slate-900 dark:text-white transition-colors duration-500">
              {budget} {currency}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Group:</span>{" "}
            <strong className="block text-slate-900 dark:text-white transition-colors duration-500">
              {groupId === "solo" ? "Solo Trip" : groups.find((g) => g.id === groupId)?.name}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Type & Pace:</span>{" "}
            <strong className="block text-slate-900 dark:text-white capitalize transition-colors duration-500">
              {tripType} • {pace}
            </strong>
          </div>
        </div>
      </div>

      <div className="bg-teal-50 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 p-4 rounded-xl flex items-start gap-3 text-sm transition-colors duration-500">
        <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          Planora AI will analyze all group members&apos; locations and preferences alongside your inputs to craft a customized itinerary.
        </p>
      </div>

      <div className="flex justify-between pt-6">
        <Button
          variant="ghost"
          onClick={() => setStep(3)}
          className="rounded-xl h-12 px-8 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors duration-300"
        >
          Back
        </Button>
        <Button
          onClick={onGenerate}
          className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 px-8 shadow-sm"
        >
          Generate Itinerary <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
