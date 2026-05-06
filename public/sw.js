self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json()
      const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        data: data.data || { url: '/' },
        vibrate: [100, 50, 100]
      }
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      )
    } catch (err) {
      console.error('Error parsing push data', err)
      // Fallback
      event.waitUntil(
        self.registration.showNotification("Planora Update", {
          body: event.data.text(),
          icon: '/icon-192.png'
        })
      )
    }
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // If window is already open, focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
