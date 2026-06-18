import { generateText } from 'ai'
import { AI_MODELS } from '@/lib/ai/models'

// AI notification builders using Groq

export async function buildHypeNotification(plan: any, daysUntil: number) {
  const prompt = `
    Write a fun, hype-building push notification for a group trip to ${plan.destination_name}.
    There are ${daysUntil} days left until the trip.
    Keep it extremely short (max 15 words). Include an emoji.
    Example: "Only 7 days until Paris! Pack your bags! 🥖✈️"
  `
  
  const { text } = await generateText({
    model: AI_MODELS.chat,
    prompt
  })

  return {
    title: `Countdown to ${plan.destination_name}`,
    body: text.trim(),
    icon: '/icon-192.png',
    data: { url: `/plans/${plan.id}` }
  }
}

export async function buildDayOfNotification(plan: any) {
  const prompt = `
    Write a morning brief push notification for the first day of a trip to ${plan.destination_name}.
    Keep it energetic and helpful (max 15 words). Include an emoji.
    Example: "It's trip day! Check your itinerary for today's schedule. ☀️"
  `

  const { text } = await generateText({
    model: AI_MODELS.chat,
    prompt
  })

  return {
    title: "Trip Day is Here! 🎉",
    body: text.trim(),
    icon: '/icon-192.png',
    data: { url: `/plans/${plan.id}` }
  }
}

export async function buildReminderNotification(plan: any) {
  const prompt = `
    Write a gentle nudge push notification reminding the group to finalize the itinerary for ${plan.destination_name}.
    Keep it friendly and short (max 15 words). Include an emoji.
    Example: "Don't forget to vote on the activities for Tokyo! 🗳️"
  `

  const { text } = await generateText({
    model: AI_MODELS.chat,
    prompt
  })

  return {
    title: "Planora Reminder",
    body: text.trim(),
    icon: '/icon-192.png',
    data: { url: `/plans/${plan.id}` }
  }
}
