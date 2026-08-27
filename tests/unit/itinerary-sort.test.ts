import { describe, it, expect, beforeEach } from 'vitest'
import {
  getItemSortScore,
  cleanseAndValidateItineraryItem,
  reorderDayItems,
} from '@/lib/itinerary/sort'
import { createMockSupabaseClient } from '@/lib/testing/supabaseMock'

describe('Itinerary Sorting & Cleansing Heuristics', () => {
  describe('getItemSortScore', () => {
    it('scores transit activities earliest in the day bucket', () => {
      const transitItem = {
        time_of_day: 'Morning',
        title: 'Airport Arrival & Train Transit',
        category: 'transport',
      }
      const score = getItemSortScore(transitItem)
      // Base Morning (1000) + Transit (50) = 1050
      expect(score).toBe(1050)
    })

    it('scores breakfast earlier than dinner for evening/night', () => {
      const breakfast = {
        time_of_day: 'Morning',
        title: 'Pancake Breakfast',
        category: 'food',
      }
      const dinner = {
        time_of_day: 'Evening',
        title: 'Rooftop Dinner',
        category: 'food',
      }

      const breakfastScore = getItemSortScore(breakfast)
      const dinnerScore = getItemSortScore(dinner)

      // Base 1000 + 150 = 1150
      expect(breakfastScore).toBe(1150)
      // Base 3000 + 450 = 3450
      expect(dinnerScore).toBe(3450)
      expect(breakfastScore).toBeLessThan(dinnerScore)
    })

    it('scores nightlife late in the evening', () => {
      const nightlife = {
        time_of_day: 'Night',
        title: 'Roppongi Clubbing & Drinks',
      }
      // Base Night (4000) + Nightlife (650) = 4650
      expect(getItemSortScore(nightlife)).toBe(4650)
    })

    it('scores overnight stay at the end of the day', () => {
      const stay = {
        time_of_day: 'Night',
        title: 'Sleep at Hotel',
        category: 'accommodation',
      }
      // Base Night (4000) + Stay (850) = 4850
      expect(getItemSortScore(stay)).toBe(4850)
    })

    it('handles pre-trip logistics with lowest base score', () => {
      const preTrip = {
        time_of_day: 'pre-trip',
        title: 'Pack luggage & check passport',
      }
      expect(getItemSortScore(preTrip)).toBe(200)
    })
  })

  describe('cleanseAndValidateItineraryItem', () => {
    it('returns null safely if item is null or undefined', () => {
      expect(cleanseAndValidateItineraryItem(null)).toBeNull()
      expect(cleanseAndValidateItineraryItem(undefined)).toBeUndefined()
    })

    it('corrects overnight stays to Night', () => {
      const item = {
        title: 'Stay overnight at ryokan',
        time_of_day: 'Morning',
      }
      const cleansed = cleanseAndValidateItineraryItem(item)
      expect(cleansed.time_of_day).toBe('Night')
    })

    it('corrects breakfast scheduled at night to Morning', () => {
      const item = {
        title: 'Champagne Brunch buffet',
        time_of_day: 'Night',
      }
      const cleansed = cleanseAndValidateItineraryItem(item)
      expect(cleansed.time_of_day).toBe('Morning')
    })

    it('corrects lunch scheduled in the morning to Afternoon', () => {
      const item = {
        title: 'Ramen lunch bowl',
        time_of_day: 'Morning',
      }
      const cleansed = cleanseAndValidateItineraryItem(item)
      expect(cleansed.time_of_day).toBe('Afternoon')
    })

    it('corrects dinner scheduled in the morning to Night', () => {
      const item = {
        title: 'Omakase Sushi Dinner',
        time_of_day: 'Morning',
      }
      const cleansed = cleanseAndValidateItineraryItem(item)
      expect(cleansed.time_of_day).toBe('Night')
    })
  })

  describe('reorderDayItems', () => {
    let mockSupabase: ReturnType<typeof createMockSupabaseClient>

    beforeEach(() => {
      mockSupabase = createMockSupabaseClient({
        itinerary_items: [
          {
            id: 'item-1',
            plan_id: 'plan-123',
            day_number: 1,
            title: 'Sleep at Hotel',
            time_of_day: 'Night',
            category: 'accommodation',
            sort_order: 0,
          },
          {
            id: 'item-2',
            plan_id: 'plan-123',
            day_number: 1,
            title: 'Flight Arrival & Transit',
            time_of_day: 'Morning',
            category: 'transport',
            sort_order: 1,
          },
          {
            id: 'item-3',
            plan_id: 'plan-123',
            day_number: 1,
            title: 'Traditional Breakfast',
            time_of_day: 'Morning',
            category: 'food',
            sort_order: 2,
          },
        ],
      })
    })

    it('reorders items chronologically and updates sort_order sequentially', async () => {
      await reorderDayItems(mockSupabase, 'plan-123', 1)

      const items = mockSupabase.getTableData('itinerary_items')
      // Expected order:
      // 1. Flight Arrival (score 1050)
      // 2. Breakfast (score 1150)
      // 3. Sleep at Hotel (score 4850)
      const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)

      expect(sorted[0].id).toBe('item-2')
      expect(sorted[0].sort_order).toBe(0)

      expect(sorted[1].id).toBe('item-3')
      expect(sorted[1].sort_order).toBe(1)

      expect(sorted[2].id).toBe('item-1')
      expect(sorted[2].sort_order).toBe(2)
    })

    it('gracefully handles empty day itineraries without errors', async () => {
      await expect(reorderDayItems(mockSupabase, 'plan-123', 99)).resolves.not.toThrow()
    })
  })
})
