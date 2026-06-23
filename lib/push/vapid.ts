import webpush from 'web-push'

let isVapidConfigured = false

function configureVapid() {
  if (isVapidConfigured) return
  webpush.setVapidDetails(
    'mailto:support@planora.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  )
  isVapidConfigured = true
}

export async function sendPushNotification(subscription: webpush.PushSubscription, payload: any) {
  configureVapid()
  try {
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload))
    return result
  } catch (error) {
    console.error('Error sending push notification:', error)
    throw error
  }
}
