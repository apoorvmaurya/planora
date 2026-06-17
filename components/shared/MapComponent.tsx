"use client"
 
import React, { useEffect, useRef } from "react"
import L from "leaflet"
import { AlertCircle, MapPin, Sparkles } from "lucide-react"
 
// Re-wire default Leaflet marker assets to avoid Next.js module path bundling bugs
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})
 
interface MapComponentProps {
  items: any[]
  planDestination: string
}
 
const dayColors = [
  "#16795A", // Day 1: Planora Teal
  "#2563EB", // Day 2: Royal Blue
  "#EA580C", // Day 3: Vivid Orange
  "#7C3AED", // Day 4: Deep Violet
  "#DB2777", // Day 5: Pink Magenta
  "#059669", // Day 6: Emerald Green
  "#4F46E5", // Day 7: Indigo
]
 
export function MapComponent({ items, planDestination }: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
 
  // 1. Filter out only items that have valid geocoded lat & lng coordinates
  const geocodedItems = items.filter(
    (item) => item.lat && item.lng && Math.abs(item.lat) > 0.001 && Math.abs(item.lng) > 0.001
  )
 
  useEffect(() => {
    if (!mapContainerRef.current) return
 
    // Calculate initial map center coordinates
    let initialCenter: [number, number] = [20.5937, 78.9629] // Default: India
    let initialZoom = 5
 
    if (geocodedItems.length > 0) {
      // Center the map on the average coordinates of geocoded items
      const sumLat = geocodedItems.reduce((acc, i) => acc + i.lat, 0)
      const sumLng = geocodedItems.reduce((acc, i) => acc + i.lng, 0)
      initialCenter = [sumLat / geocodedItems.length, sumLng / geocodedItems.length]
      initialZoom = 13
    }
 
    // 2. Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
    })
 
    mapRef.current = map
 
    // Render CartoDB Positron maps (premium, clean, light-colored tile server)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(map)
 
    // Layer Group to easily clean/replace pins on hot re-renders
    const layerGroup = L.layerGroup().addTo(map)
    layerGroupRef.current = layerGroup
 
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // Initialize map only once
 
  // 3. React to live itinerary updates (AI suggestions, votes, swaps)
  useEffect(() => {
    const map = mapRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return
 
    // Clean old markers and lines
    layerGroup.clearLayers()
 
    if (geocodedItems.length === 0) return
 
    const bounds = L.latLngBounds([])
 
    // Group items by day to draw paths
    const itemsByDay: Record<number, any[]> = {}
    const coordsMap = new Map<string, number>()
    
    geocodedItems.forEach((item) => {
      const day = item.day_number || 1
      
      // Coordinate collision signature key
      const coordKey = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`
      const count = coordsMap.get(coordKey) || 0
      coordsMap.set(coordKey, count + 1)

      let displayLat = item.lat
      let displayLng = item.lng

      // Shift overlapping markers slightly to keep them individually readable
      if (count > 0) {
        const angle = (count * 2 * Math.PI) / 8
        const radius = 0.00018 // ~20 meters dispersion radius
        displayLat += Math.sin(angle) * radius
        displayLng += Math.cos(angle) * radius
      }

      // Add to group for path tracing (using shifted coordinates for visual alignment)
      const adjustedItem = { ...item, displayLat, displayLng }
      if (!itemsByDay[day]) itemsByDay[day] = []
      itemsByDay[day].push(adjustedItem)

      // Add custom numbered marker
      const markerColor = dayColors[(day - 1) % dayColors.length]
      
      const customMarkerHtml = `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md text-white font-black text-xs cursor-pointer hover:scale-110 transition-transform duration-200" style="background-color: ${markerColor};">
          ${day}.${item.time_of_day.substring(0, 1)}
        </div>
      `
      
      const customIcon = L.divIcon({
        html: customMarkerHtml,
        className: "custom-leaflet-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([displayLat, displayLng], { icon: customIcon })
        .bindPopup(`
          <div class="p-2.5 space-y-1.5 max-w-[220px]">
            <div class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <span class="px-2 py-0.5 rounded-full text-white" style="background-color: ${markerColor}">Day ${day}</span>
              <span>${item.time_of_day}</span>
            </div>
            <h4 class="font-extrabold text-sm text-slate-900 dark:text-white mt-1">${item.title}</h4>
            <p class="text-xs text-slate-600 dark:text-slate-350 line-clamp-2">${item.description || ""}</p>
            <div class="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span class="inline-block truncate">📍 ${item.location_name}</span>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location_name)}"
                target="_blank"
                rel="noopener noreferrer"
                class="text-indigo-500 hover:text-indigo-600 font-extrabold ml-2 flex items-center gap-0.5 shrink-0"
              >
                Directions ↗
              </a>
            </div>
          </div>
        `, { closeButton: false })
        .addTo(layerGroup)

      bounds.extend([displayLat, displayLng])
    })

    // Draw connecting paths (Polylines) for each day
    Object.entries(itemsByDay).forEach(([dayNum, dayItems]) => {
      const day = Number(dayNum)
      // Sort day items based on sort_order to draw paths correctly
      const sortedDayItems = [...dayItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      
      if (sortedDayItems.length > 1) {
        const polylineCoords = sortedDayItems.map((item) => [item.displayLat, item.displayLng] as [number, number])
        const polylineColor = dayColors[(day - 1) % dayColors.length]

        L.polyline(polylineCoords, {
          color: polylineColor,
          weight: 4,
          opacity: 0.85,
          dashArray: "8, 8",
          lineJoin: "round",
        }).addTo(layerGroup)
      }
    })
 
    // Fit map bounds to view all items nicely
    if (geocodedItems.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [items]) // Triggers on itinerary additions, modifications, re-suggestions, or deletions
 
  return (
    <div className="relative w-full h-[500px] rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md">
      {/* Absolute Leaflet Map */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />
 
      {/* Premium Visual Layout Header Indicator */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-800 text-white shadow-xl max-w-lg self-center pointer-events-auto transition-all duration-300">
          <Sparkles className="w-4 h-4 text-[#16795A] shrink-0 animate-pulse" />
          <p className="text-xs font-semibold leading-none">
            <span className="text-[#16795A] font-black uppercase mr-1">✨ Premium Preview:</span>
            Map routing is in early preview and will soon be exclusive to Pro plans.
          </p>
        </div>
      </div>
 
      {/* Empty State Overlay */}
      {geocodedItems.length === 0 && (
        <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-950/95 backdrop-blur-sm z-[999] flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/20 text-[#16795A] flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Geolocated Items</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            Itinerary items generated by Plabot or added with real locations (e.g. geocoded names) will automatically populate on this interactive route map.
          </p>
        </div>
      )}
    </div>
  )
}
