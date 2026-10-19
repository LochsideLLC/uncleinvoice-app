self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = {}; }
  const path = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//")
    ? data.url
    : "/app/notifications";
  event.waitUntil(self.registration.showNotification("Uncle Invoice", {
    body: typeof data.body === "string" ? data.body.slice(0, 220) : "You have a new invoice update.",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: { path },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path || "/app/notifications";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const open = windows.find((window) => window.url === target);
    if (open) return open.focus();
    return self.clients.openWindow(target);
  }));
});
