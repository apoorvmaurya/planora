"use client"

import React from "react"
import { motion } from "framer-motion"
import { AlertTriangle, RefreshCw, SearchX, WifiOff, ShieldX, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type ErrorVariant = "not_found" | "error" | "no_access" | "offline"

interface ErrorStateProps {
  variant?: ErrorVariant
  title?: string
  description?: string
  onRetry?: () => void
  backHref?: string
  backLabel?: string
}

const variantConfig: Record<ErrorVariant, { icon: React.ReactNode; defaultTitle: string; defaultDescription: string }> = {
  not_found: {
    icon: <SearchX className="w-10 h-10" />,
    defaultTitle: "Not found",
    defaultDescription: "We couldn't find what you're looking for. It may have been deleted or the link is broken.",
  },
  error: {
    icon: <AlertTriangle className="w-10 h-10" />,
    defaultTitle: "Something went wrong",
    defaultDescription: "An unexpected error occurred. Please try again.",
  },
  no_access: {
    icon: <ShieldX className="w-10 h-10" />,
    defaultTitle: "Access denied",
    defaultDescription: "You don't have permission to view this page.",
  },
  offline: {
    icon: <WifiOff className="w-10 h-10" />,
    defaultTitle: "You're offline",
    defaultDescription: "Check your internet connection and try again.",
  },
}

export function ErrorState({
  variant = "error",
  title,
  description,
  onRetry,
  backHref,
  backLabel = "Go back",
}: ErrorStateProps) {
  const config = variantConfig[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-24 px-6"
    >
      <div className="w-20 h-20 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-6">
        {config.icon}
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        {title || config.defaultTitle}
      </h2>
      <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
        {description || config.defaultDescription}
      </p>
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref}>
            <Button variant="outline" className="rounded-xl h-11 px-5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Button>
          </Link>
        )}
        {onRetry && (
          <Button
            onClick={onRetry}
            className="rounded-xl h-11 px-5 bg-[#1D9E75] hover:bg-[#15805e] text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
      </div>
    </motion.div>
  )
}
