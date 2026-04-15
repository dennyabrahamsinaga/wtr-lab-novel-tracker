self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Novel update";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const c of clientsArr) {
        if ("focus" in c) {
          c.focus();
          if ("navigate" in c) c.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

