/// <reference lib="webworker" />

const SW_VERSION = "1.0.0";
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
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "CareAfter Reminder";
  const options: NotificationOptions = {
    body: data.body ?? "Time for your medication",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag ?? "careafter-reminder",
    requireInteraction: true,
    actions: [
      { action: "taken", title: "✅ Taken" },
      { action: "snooze", title: "⏰ Snooze 15min" },
    ],
  };
  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).clients.openWindow("/plan/medications")
  );
});
