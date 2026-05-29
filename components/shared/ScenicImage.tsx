"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"

interface ScenicImageProps {
  destination: string
  className?: string
  alt?: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  sizes?: string
}

export function ScenicImage({
  destination,
  className = "",
  alt = "",
  width,
  height,
  fill = false,
  priority = false,
  sizes
}: ScenicImageProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const cleanName = destination.split(',')[0].trim()
  const w = width || 800
  const h = height || 600
  const coverUrl = `https://image.pollinations.ai/prompt/beautiful%20scenic%20travel%20destination%20${encodeURIComponent(cleanName)}?width=${w}&height=${h}&nologo=true`

  useEffect(() => {
    // Programmatically check if the image loads successfully
    const img = new window.Image()
    img.src = coverUrl
    img.onload = () => {
      setSrc(coverUrl)
    }
    img.onerror = () => {
      setFailed(true)
    }
  }, [coverUrl])

  if (failed || !src) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-600 dark:from-teal-600 dark:to-emerald-950 flex items-center justify-center text-white font-extrabold uppercase text-4xl select-none ${className}`}>
        <span className="opacity-75">{destination ? destination.substring(0, 2) : "TR"}</span>
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt || destination}
        fill
        priority={priority}
        sizes={sizes}
        className={className}
        unoptimized
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt || destination}
      className={className}
    />
  )
}
