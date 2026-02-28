// CareAfter Service Worker v1.2.0
// Handles: offline caching, push notifications, notification actions

const SW_VERSION = "1.2.0";
const CACHE_NAME = "careafter-v" + SW_VERSION;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: cache static assets
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(STATIC_ASSETS); })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; }).map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", function(event) {
  var url = new URL(event.request.url);

  // Never cache API calls or POST requests
  if (url.pathname.startsWith("/api") || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var fetchPromise = fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// Push notifications for medication reminders
self.addEventListener("push", function(event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || "CareAfter Reminder";
  var options = {
    body: data.body || "Time for your medication",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "careafter-reminder",
    requireInteraction: true,
    data: data,
    actions: [
      { action: "taken", title: "✅ Taken" },
      { action: "snooze", title: "⏰ Snooze 15min" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  if (event.action === "snooze") {
    var notifData = event.notification.data || {};
    setTimeout(function() {
      self.registration.showNotification(
        event.notification.title,
        {
          body: event.notification.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: event.notification.tag,
          requireInteraction: true,
          data: notifData,
          actions: [
            { action: "taken", title: "✅ Taken" },
            { action: "snooze", title: "⏰ Snooze 15min" },
          ],
        }
      );
    }, 15 * 60 * 1000);
    return;
  }

  // Default: open the care plan page
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf("/plan") !== -1 && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/plan");
    })
  );
});
