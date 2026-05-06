import { z } from 'zod'

export const itinerarySchema = z.object({
  days: z.array(z.object({
    day_number: z.number(),
    itinerary_items: z.array(z.object({
      title: z.string(),
      description: z.string(),
      time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
      location_name: z.string(),
      lat: z.number(),
      lng: z.number(),
      category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
      duration_minutes: z.number(),
      estimated_cost: z.number(),
    }))
  }))
})

export type Itinerary = z.infer<typeof itinerarySchema>

export async function buildPromptContext({
  destination,
  startDate,
  endDate,
  budget,
  currency,
  preferences,
  members
}: any) {
  const memberContext = members.map((m: any) => 
    `- ${m.full_name} from ${m.city || 'Unknown'}. Preferences: ${JSON.stringify(m.travel_preferences || {})}`
  ).join("\n")

  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return `
    You are an expert travel planner AI for Planora.
    Create a highly detailed itinerary for a group of ${members.length} people traveling to ${destination.name}.
    
    Trip Details:
    - Destination: ${destination.name} (Lat: ${destination.lat}, Lng: ${destination.lng})
    - Duration: ${totalDays} days (From ${startDate} to ${endDate})
    - Total Budget: ${budget} ${currency}
    
    Group Members:
    ${memberContext}

    Overall Trip Preferences:
    - Trip Type: ${preferences.tripType}
    - Pace: ${preferences.pace}
    - Dietary Notes: ${preferences.dietaryNotes || 'None'}
    - Must Haves: ${preferences.mustHaves || 'None'}
    - Things to Avoid: ${preferences.avoid || 'None'}

    Requirements:
    1. Provide exactly ${totalDays} days.
    2. Provide 3-5 activities per day (Morning, Afternoon, Evening).
    3. Include estimated costs per activity that sum up reasonably to the total budget.
    4. Provide accurate real-world locations (approximate lat/lng within the destination).
    5. The schedule should reflect the requested pace (${preferences.pace}).
  `
}
