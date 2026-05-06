"use client"

import React, { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App Route Error:", error)
  }, [error])

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong!</h2>
      <p className="text-slate-500 mb-8 max-w-md">
        We encountered an unexpected error while trying to load this page. 
      </p>
      <Button 
        onClick={() => reset()}
        className="bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl px-8 h-12"
      >
        Try again
      </Button>
    </div>
  )
}
