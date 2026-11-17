// Shelf Life service worker: shows push notifications and opens the app on tap.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "Shelf Life", body: "", url: "/", tag: "eots" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* plain text push */
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon-192.png", badge: "/icon-192.png", tag: data.tag, data: { url: data.url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
