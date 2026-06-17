"use client"

import React, { useState } from "react"
import Image from "next/image"

const TRAVEL_IMAGES = [
  // 0: Tropical / Beach
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  // 1: Modern City Skyline
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80",
  // 2: Mountain / Alps
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  // 3: European Architecture / Cozy street
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80",
  // 4: Asian Temple / Cultural
  "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
  // 5: Forest / Nature / Waterfall
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
  // 6: Desert / Dunes / Adventure
  "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80",
  // 7: Historical Ruins / Classical
  "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
  // 8: Mediterranean Coast
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
  // 9: Winter / Snow Resort
  "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80"
]

function getScenicImageUrl(destination: string): string {
  const dest = destination.toLowerCase()
  
  if (dest.includes("beach") || dest.includes("island") || dest.includes("bali") || dest.includes("hawaii") || dest.includes("maldives") || dest.includes("goa") || dest.includes("phuket") || dest.includes("caribbean")) {
    return TRAVEL_IMAGES[0]
  }
  if (dest.includes("mountain") || dest.includes("alps") || dest.includes("himalaya") || dest.includes("hiking") || dest.includes("mount") || dest.includes("trek")) {
    return TRAVEL_IMAGES[2]
  }
  if (dest.includes("forest") || dest.includes("park") || dest.includes("nature") || dest.includes("lake") || dest.includes("waterfall") || dest.includes("valley")) {
    return TRAVEL_IMAGES[5]
  }
  if (dest.includes("desert") || dest.includes("dune") || dest.includes("sahara") || dest.includes("safari") || dest.includes("egypt")) {
    return TRAVEL_IMAGES[6]
  }
  if (dest.includes("history") || dest.includes("ruin") || dest.includes("rome") || dest.includes("athens") || dest.includes("machu") || dest.includes("taj mahal")) {
    return TRAVEL_IMAGES[7]
  }
  if (dest.includes("coast") || dest.includes("sea") || dest.includes("ocean") || dest.includes("greece") || dest.includes("santorini") || dest.includes("amalfi") || dest.includes("cliff")) {
    return TRAVEL_IMAGES[8]
  }
  if (dest.includes("snow") || dest.includes("ski") || dest.includes("winter") || dest.includes("ice") || dest.includes("switzerland") || dest.includes("siberia")) {
    return TRAVEL_IMAGES[9]
  }
  if (dest.includes("japan") || dest.includes("kyoto") || dest.includes("temple") || dest.includes("asia") || dest.includes("thailand") || dest.includes("vietnam")) {
    return TRAVEL_IMAGES[4]
  }
  if (dest.includes("paris") || dest.includes("london") || dest.includes("europe") || dest.includes("rome") || dest.includes("florence") || dest.includes("amsterdam")) {
    return TRAVEL_IMAGES[3]
  }
  if (dest.includes("city") || dest.includes("york") || dest.includes("delhi") || dest.includes("mumbai") || dest.includes("tokyo") || dest.includes("sydney") || dest.includes("skyline")) {
    return TRAVEL_IMAGES[1]
  }

  // Fallback to hashing destination name for stable selection
  let hash = 0
  for (let i = 0; i < destination.length; i++) {
    hash = destination.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % TRAVEL_IMAGES.length
  return TRAVEL_IMAGES[index]
}

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
  // 0 = Pollinations AI, 1 = Unsplash Fallback, 2 = Gradient Fallback
  const [imgState, setImgState] = useState(0)

  const cleanName = destination ? destination.split(',')[0].trim() : ""
  const w = width || 800
  const h = height || 600
  
  const pollinationsUrl = `https://image.pollinations.ai/prompt/beautiful%20scenic%20travel%20destination%20${encodeURIComponent(cleanName)}?width=${w}&height=${h}&nologo=true`
  const unsplashUrl = getScenicImageUrl(cleanName)

  const src = imgState === 0 ? pollinationsUrl : unsplashUrl

  if (imgState === 2 || !cleanName) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-600 dark:from-teal-600 dark:to-emerald-950 flex items-center justify-center text-white font-extrabold uppercase text-4xl select-none ${className}`}>
        <span className="opacity-75">{destination ? destination.substring(0, 2) : "TR"}</span>
      </div>
    )
  }

  const handleError = () => {
    if (imgState === 0) {
      setImgState(1)
    } else {
      setImgState(2)
    }
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
        onError={handleError}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt || destination}
      className={className}
      onError={handleError}
    />
  )
}

