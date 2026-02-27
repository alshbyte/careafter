// CareAfter Service Worker v1.1.0
// Handles: offline caching, push notifications, notification actions

const SW_VERSION = "1.1.0";
const CACHE_NAME = `careafter-v${SW_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: cache static assets
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Never cache API calls or POST requests
  if (url.pathname.startsWith("/api") || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached ?? fetchPromise;
    })
  );
});

// Push notifications for medication reminders
// LEARN: This fires when our server sends a Web Push message.
// The service worker wakes up (even if the browser tab is closed!)
// and shows the notification. On Android, this works exactly like
// a native app notification.
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "CareAfter Reminder";
  const options = {
    body: data.body ?? "Time for your medication",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag ?? "careafter-reminder",
    requireInteraction: true,
    data: data, // Pass data through for notification click handler
    actions: [
      { action: "taken", title: "✅ Taken" },
      { action: "snooze", title: "⏰ Snooze 15min" },
    ],
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
// LEARN: When a user taps a push notification, this fires.
// "action" tells us which button they tapped:
// - "taken" → they took their medication (mark it)
// - "snooze" → remind again in 15 minutes
// - (no action) → they tapped the notification body itself
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "snooze") {
    // Snooze: show another notification in 15 minutes
    const data = event.notification.data || {};
    setTimeout(() => {
      self.registration.showNotification(
        event.notification.title,
        {
          body: event.notification.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: event.notification.tag,
          requireInteraction: true,
          data: data,
          actions: [
            { action: "taken", title: "✅ Taken" },
            { action: "snooze", title: "⏰ Snooze 15min" },
          ],
        }
      );
    }, 15 * 60 * 1000); // 15 minutes
    return;
  }

  // Default: open the care plan page
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes("/plan") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      return clients.openWindow("/plan");
    })
  );
});
