// @ts-expect-error deno types
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

export async function generateNotificationCopy(
  destination: string,
  type: 't30' | 't7' | 't24' | 't0'
): Promise<{ title: string; body: string }> {

  if (!GROQ_API_KEY) {
    console.warn("No GROQ_API_KEY found, using fallback copy.")
    return getFallbackCopy(destination, type)
  }

  let prompt = ""
  let title = ""

  switch (type) {
    case 't30':
      title = "1 Month to Go! 🎉"
      prompt = `Write a fun, hype-building push notification body (max 15 words) for a group trip to ${destination} starting in 30 days. Include an emoji. Do not use quotes.`
      break
    case 't7':
      title = "1 Week Left! 🧳"
      prompt = `Write a prep nudge push notification body (max 15 words) for a trip to ${destination} starting in 7 days. Remind them to pack. Include an emoji. Do not use quotes.`
      break
    case 't24':
      title = "Tomorrow is the day! ✈️"
      prompt = `Write an exciting push notification body (max 15 words) for a trip to ${destination} starting tomorrow. Mention checking the weather. Include an emoji. Do not use quotes.`
      break
    case 't0':
      title = "Trip Day! ☀️"
      prompt = `Write a morning brief push notification body (max 15 words) for the first day of a trip to ${destination}. Keep it energetic. Include an emoji. Do not use quotes.`
      break
  }

  try {
    const response = await fetch(
      `https://api.groq.com/openai/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 50,
          temperature: 0.7,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ""

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
  if (!GROQ_API_KEY) {
    return `You and ${memberNames} spent ${days} days in ${destination}. You spent ${currency}${totalSpent}. It was an unforgettable trip! Here's to the memories.`
  }

  const prompt = `
    Write a warm, personalised, and nostalgic post-trip recap for a group trip to ${destination}.
    The group included: ${memberNames}.
    They spent ${days} days there.
    Their top-rated activities were: ${topItems || 'exploring the city'}.
    They spent a total of ${currency}${totalSpent}.
    Keep it concise (max 80 words), enthusiastic, and celebratory. Do not include introductory phrases, just output the recap.
  `

  try {
    const response = await fetch(
      `https://api.groq.com/openai/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.7,
        }),
      }
    )

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || "What an amazing trip!"
  } catch (error) {
    console.error("Error generating recap:", error)
    return `You and ${memberNames} spent ${days} days in ${destination}. It was an unforgettable trip!`
  }
}
