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

export const itineraryResponseSchema = z.object({
  title: z.string().describe("A catchy name for the trip plan"),
  days: z.array(z.object({
    day_number: z.number().describe("Day number starting from 1"),
    itinerary_items: z.array(z.object({
      title: z.string().describe("Title of the activity"),
      description: z.string().describe("Detailed description of what to do"),
      time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
      location_name: z.string().describe("Name of the venue/place"),
      lat: z.number().describe("Latitude of the venue"),
      lng: z.number().describe("Longitude of the venue"),
      category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
      duration_minutes: z.number().describe("Estimated duration in minutes"),
      estimated_cost: z.number().describe("Estimated cost in plan currency")
    }))
  }))
})

export type Itinerary = z.infer<typeof itineraryResponseSchema>

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
    - Pace: ${preferences.pace} (slow: 1 major sight/day; moderate: 1-2 major sights/day; fast: 2-3 major sights/day)
    - Dietary Notes: ${preferences.dietaryNotes || 'None'}
    - Must Haves: ${preferences.mustHaves || 'None'}
    - Things to Avoid: ${preferences.avoid || 'None'}

    **State-of-the-Art Traveling Planning Rules & Heuristics:**

    1. **Attraction Selection & Priority Ranking (Day Constraints)**:
       - Identify the top primary sights, landmarks, and experiences in and around ${destination.name}.
       - Compute a realistic capacity of major attractions based on the trip length (${totalDays} days) and selected pace (${preferences.pace}):
         - If slow: Select exactly ${totalDays} top-tier must-visit attractions.
         - If moderate: Select exactly ${Math.round(totalDays * 1.5)} top-tier must-visit attractions.
         - If fast: Select exactly ${totalDays * 2} top-tier must-visit attractions.
       - Discard minor sights, lesser-known spots, or fillers. Prioritize the absolute best sights first.

    2. **Logistics vs. Tourism (No Transit Hub Sightseeing)**:
       - Transit hubs (e.g., airports, train/railway stations, bus terminals) are NOT sightseeing spots. Never schedule a transit hub as a sightseeing attraction in the middle of a trip.
       - Transit/arrival slots belong ONLY on Day 1 (Morning or Afternoon) and departure slots belong ONLY on the final day (Afternoon or Evening).

    3. **Arrival & Departure Half-Day Logistics**:
       - **Day 1 (Arrival Day)**: Assume travelers are arriving. Start the itinerary with Afternoon hotel check-in / transit, followed by 1 light sightseeing spot in the afternoon, followed by dinner and evening stroll. Do not overstuff Day 1.
       - **Final Day (Departure Day)**: Assume travelers are departing. Plan only 1 Morning sight, followed by Lunch, and then transit to the airport/station. Do not schedule afternoon/evening activities.

    4. **Cohesive Daily Arc & Slot Rules**:
       - Every day must follow a logical chronological arc representing a realistic day:
         - **Morning**: Primary high-energy activity (museum, historical monument, active sightseeing).
         - **Afternoon**: Lunch nearby (recommend specific local culinary spot, cafe, or restaurant area) followed by a lighter secondary activity (shopping street, local park, scenic overlook).
         - **Evening**: Sunset viewing, leisure walk, coffee, or local market exploration.
         - **Night**: Dinner at a highly rated local restaurant, followed by nightlife/leisure and overnight stay lodging (hotel/hotel stay must always be the final item in the 'Night' slot).
       - Never leave massive time gaps (e.g. going from lunch straight to dinner with no afternoon plan). If the pace is "slow", fill afternoon slots with explicit "leisure time / relaxation at hotel" rather than leaving it empty.

    5. **Spatial Coherence & Walking Clusters**:
       - Group daily activities strictly within a single local district, neighborhood, or sub-region of ${destination.name}.
       - Consecutive spots must be within walking distance (less than 15 min) or a very short 10-minute drive.
       - Avoid zigzagging or backtracking. The path of activities must follow a logical geographical routing (e.g., Spot A -> nearby Lunch -> nearby Spot B).

    6. **Group Interest Fusion**:
       - Blend the group members' preferences. For example, if someone prefers historic sights and another prefers nature, alternate days or suggest spots that blend both.

    7. **Budget Realism**:
       - If the budget is low, prioritize free parks, walking tours, and budget street food. If the budget is high, recommend premium tours, ticketed museums, and upscale dining.

    8. **Strict JSON Schema & Structure Constraints**:
       - The output JSON MUST contain exactly two top-level keys: "title" (string) and "days" (array).
       - Each day object in the "days" array MUST contain exactly two keys: "day_number" (integer starting from 1) and "itinerary_items" (array of activities).
       - Each activity object in the "itinerary_items" array MUST contain exactly:
         - "title" (string)
         - "description" (string)
         - "time_of_day" ("Morning" | "Afternoon" | "Evening" | "Night")
         - "location_name" (string)
         - "lat" (number)
         - "lng" (number)
         - "category" ("activity" | "food" | "transport" | "accommodation" | "leisure")
         - "duration_minutes" (integer)
         - "estimated_cost" (number)
       - CRITICAL: Do NOT output any other top-level keys (such as "tripDetails", "groupMembers", or "itinerary"). The root of your JSON response must be an object with ONLY "title" and "days".
  `
}
