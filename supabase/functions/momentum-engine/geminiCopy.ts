// @ts-ignore
const GOOGLE_GENERATIVE_AI_API_KEY = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')

export async function generateNotificationCopy(
  destination: string,
  type: 't30' | 't7' | 't24' | 't0'
): Promise<{ title: string; body: string }> {

  if (!GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("No GOOGLE_GENERATIVE_AI_API_KEY found, using fallback copy.")
    return getFallbackCopy(destination, type)
  }

  let prompt = ""
  let title = ""

  switch (type) {
    case 't30':
      title = "1 Month to Go! 🎉"
      prompt = `Write a fun, hype-building push notification body (max 15 words) for a group trip to ${destination} starting in 30 days. Include an emoji.`
      break
    case 't7':
      title = "1 Week Left! 🧳"
      prompt = `Write a prep nudge push notification body (max 15 words) for a trip to ${destination} starting in 7 days. Remind them to pack. Include an emoji.`
      break
    case 't24':
      title = "Tomorrow is the day! ✈️"
      prompt = `Write an exciting push notification body (max 15 words) for a trip to ${destination} starting tomorrow. Mention checking the weather. Include an emoji.`
      break
    case 't0':
      title = "Trip Day! ☀️"
      prompt = `Write a morning brief push notification body (max 15 words) for the first day of a trip to ${destination}. Keep it energetic. Include an emoji.`
      break
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.7,
          }
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""

    return {
      title,
      body: text || getFallbackCopy(destination, type).body
    }
  } catch (error) {
    console.error("Error generating copy:", error)
    return getFallbackCopy(destination, type)
  }
}

function getFallbackCopy(destination: string, type: string) {
  switch (type) {
    case 't30': return { title: "1 Month to Go! 🎉", body: `Only 30 days until ${destination}! Get ready! 🏖️` }
    case 't7': return { title: "1 Week Left! 🧳", body: `7 days until ${destination}! Time to start packing! 🎒` }
    case 't24': return { title: "Tomorrow is the day! ✈️", body: `Check the weather for ${destination}! We leave tomorrow! ☀️` }
    case 't0': return { title: "Trip Day! ☀️", body: `It's finally here! Let's conquer ${destination}! 🗺️` }
    default: return { title: "Planora Update", body: `Check your plans for ${destination}!` }
  }
}

export async function generateTripRecap(
  destination: string,
  days: number,
  memberNames: string,
  topItems: string,
  totalSpent: number,
  currency: string
): Promise<string> {
  if (!GOOGLE_GENERATIVE_AI_API_KEY) {
    return `You and ${memberNames} spent ${days} days in ${destination}. You spent ${currency}${totalSpent}. It was an unforgettable trip! Here's to the memories.`
  }

  const prompt = `
    Write a warm, personalised, and nostalgic post-trip recap for a group trip to ${destination}.
    The group included: ${memberNames}.
    They spent ${days} days there.
    Their top-rated activities were: ${topItems || 'exploring the city'}.
    They spent a total of ${currency}${totalSpent}.
    Keep it concise (max 80 words), enthusiastic, and celebratory.
  `

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "What an amazing trip!"
  } catch (error) {
    console.error("Error generating recap:", error)
    return `You and ${memberNames} spent ${days} days in ${destination}. It was an unforgettable trip!`
  }
}
