"use client"

import React from "react"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export type BreadcrumbItem = {
  label: string
  href?: string
}

export type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6 transition-colors duration-500">
      <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 shrink-0">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-900 dark:hover:text-white truncate max-w-[120px] sm:max-w-[200px]">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 dark:text-white font-bold truncate max-w-[120px] sm:max-w-[200px] shrink-0">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
