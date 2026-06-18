export function getItemSortScore(item: {
  time_of_day: string
  title: string
  description?: string
  category?: string
}) {
  const time = (item.time_of_day || 'Morning').toLowerCase()
  const title = (item.title || '').toLowerCase()
  const desc = (item.description || '').toLowerCase()
  const category = (item.category || '').toLowerCase()

  // Base score based on time of day
  let baseScore = 1000
  if (time === 'pre-trip') baseScore = 0
  else if (time === 'morning') baseScore = 1000
  else if (time === 'afternoon') baseScore = 2000
  else if (time === 'evening') baseScore = 3000
  else if (time === 'night') baseScore = 4000

  // Sub-score defaults to normal activity/leisure
  let subScore = 200

  // 1. Check for arrival, check-in, or transit logistics (Very Early)
  const isTransit = 
    title.includes('arrival') || title.includes('arrive') ||
    desc.includes('arrival') || desc.includes('arrive') ||
    title.includes('check-in') || title.includes('checkin') ||
    desc.includes('check-in') || desc.includes('checkin') ||
    title.includes('flight') || title.includes('train') || title.includes('transit') ||
    title.includes('pick up') || title.includes('pickup') ||
    category === 'transport'

  if (isTransit) {
    subScore = 50
  } 
  // 2. Main Meals (Breakfast, Lunch, Dinner)
  else if (category === 'food' || title.includes('breakfast') || title.includes('brunch') || title.includes('lunch') || title.includes('dinner') || title.includes('restaurant') || title.includes('cafe')) {
    if (title.includes('breakfast') || title.includes('brunch') || desc.includes('breakfast') || desc.includes('brunch')) {
      subScore = 150 // Early Morning
    } else if (title.includes('lunch') || desc.includes('lunch')) {
      subScore = 150 // Early Afternoon
    } else if (title.includes('dinner') || desc.includes('dinner')) {
      subScore = 450 // Start of Night / late evening transition
    } else {
      subScore = 300 // Snacks/Cafes in middle
    }
  } 
  // 3. Normal Sightseeing & Activities
  else if (category === 'activity') {
    subScore = 200
  } else if (category === 'leisure') {
    subScore = 250
  }
  
  // 4. Nightlife & Clubbing / Late Night Activities (Late Night)
  const isNightlife = 
    title.includes('club') || title.includes('nightlife') || title.includes('pub') || title.includes('bar') ||
    title.includes('drinks') || title.includes('party') || title.includes('lounge') || title.includes('dance') ||
    title.includes('show') || title.includes('concert') || title.includes('night market') ||
    desc.includes('club') || desc.includes('nightlife') || desc.includes('drinks')

  if (isNightlife) {
    subScore = 650
  }

  // 5. Sleep & Stay (Absolute Last)
  const isStay = 
    title.includes('stay at hotel') || title.includes('overnight') || title.includes('sleep') ||
    title.includes('back to hotel') || title.includes('check-out') || title.includes('checkout') ||
    title.includes('departure') || title.includes('depart') ||
    desc.includes('stay at hotel') || desc.includes('overnight') || desc.includes('sleep') ||
    category === 'accommodation'

  if (isStay) {
    subScore = 850
  }

  return baseScore + subScore
}

export async function reorderDayItems(supabase: any, planId: string, dayNumber: number) {
  try {
    const { data: items, error: fetchError } = await supabase
      .from('itinerary_items')
      .select('id, time_of_day, title, description, category, sort_order')
      .eq('plan_id', planId)
      .eq('day_number', dayNumber)

    if (fetchError || !items || items.length === 0) return

    const sorted = [...items].sort((a, b) => {
      const scoreA = getItemSortScore(a)
      const scoreB = getItemSortScore(b)
      if (scoreA !== scoreB) {
        return scoreA - scoreB
      }
      return (a.sort_order || 0) - (b.sort_order || 0)
    })

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      if (item.sort_order !== i) {
        await supabase
          .from('itinerary_items')
          .update({ sort_order: i })
          .eq('id', item.id)
      }
    }
  } catch (err) {
    console.error("Failed to reorder day items:", err)
  }
}

/**
 * Cleanse and validate chronological placement of itinerary items.
 * Enforces human-logical heuristics for overnight stays, breakfast, lunch, and dinner.
 */
export function cleanseAndValidateItineraryItem(item: any) {
  if (!item) return item
  const title = (item.title || '').toLowerCase()
  const desc = (item.description || '').toLowerCase()

  // 1. Overnight Stay / Lodging / Sleep -> Must be Night
  const isOvernight = 
    title.includes('stay overnight') || 
    title.includes('overnight stay') || 
    title.includes('sleep at') || 
    title.includes('night stay') ||
    title.includes('overnight at') ||
    title.includes('stay at hotel') ||
    desc.includes('stay overnight') ||
    desc.includes('overnight stay') ||
    desc.includes('sleep at')

  if (isOvernight) {
    item.time_of_day = 'Night'
  }

  // 2. Breakfast & Brunch -> Morning
  const isBreakfast = title.includes('breakfast') || title.includes('brunch')
  if (isBreakfast) {
    if (item.time_of_day === 'Evening' || item.time_of_day === 'Night') {
      item.time_of_day = 'Morning'
    }
  }

  // 3. Lunch -> Afternoon
  const isLunch = title.includes('lunch')
  if (isLunch) {
    if (item.time_of_day !== 'Afternoon') {
      item.time_of_day = 'Afternoon'
    }
  }

  // 4. Dinner -> Evening or Night
  const isDinner = title.includes('dinner')
  if (isDinner) {
    if (item.time_of_day === 'Morning' || item.time_of_day === 'Afternoon') {
      item.time_of_day = 'Night'
    }
  }

  return item
}
