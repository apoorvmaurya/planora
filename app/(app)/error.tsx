"use client"

import React, { useEffect } from "react"
import { AlertTriangle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] text-center px-4 transition-colors duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800/80 space-y-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto transition-colors duration-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Something went wrong!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            We encountered an unexpected error while trying to load this page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            onClick={() => reset()}
            className="flex-1 bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 font-bold cursor-pointer transition-all shadow-md shadow-teal-500/10"
          >
            Try again
          </Button>
          <Link href="/dashboard" className="flex-1">
            <Button 
              variant="outline"
              className="w-full border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-12 font-semibold cursor-pointer"
            >
              <Home className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
