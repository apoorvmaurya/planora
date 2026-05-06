import webpush from 'web-push'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:support@planora.app', // Your contact email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
)

export async function sendPushNotification(subscription: webpush.PushSubscription, payload: any) {
  try {
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload))
    return result
  } catch (error) {
    console.error('Error sending push notification:', error)
    throw error
  }
}
