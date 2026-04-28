const APP_CACHE = "yopii-app-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/pwa-icon.svg", "/icons/pwa-icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== APP_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET" || requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) =>
      cachedResponse ||
      fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();

        caches.open(APP_CACHE).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
        return networkResponse;
      }).catch(async () => {
        const fallbackResponse = await caches.match(event.request);

        if (fallbackResponse) {
          return fallbackResponse;
        }

        if (event.request.mode === "navigate") {
          return caches.match("/") || Response.error();
        }

        return Response.error();
      })
    )
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Yopii";
  const options = {
    body: payload.body || "Nouvelle notification",
    data: payload.data || {},
    icon: "/icons/pwa-icon.svg",
    badge: "/icons/pwa-icon.svg",
    tag: payload.tag || payload.type || "yopii-notification"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => "focus" in client);

      if (matchingClient) {
        matchingClient.navigate(targetUrl);
        return matchingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
