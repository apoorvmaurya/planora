import React from "react"
import { Loader2 } from "lucide-react"

export default function AppLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-[#16795A] mb-4" />
      <p className="text-slate-500 font-medium">Loading your planner...</p>
    </div>
  )
}
