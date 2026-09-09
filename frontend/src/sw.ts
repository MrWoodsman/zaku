/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

// Injected at build time by vite-plugin-pwa - replaces everything the old
// auto-generated (generateSW) service worker used to do.
precacheAndRoute(self.__WB_MANIFEST);

// registerType: "autoUpdate" needs the new SW to take over immediately -
// generateSW did this for us automatically, injectManifest doesn't.
self.skipWaiting();
clientsClaim();

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  // "renotify" is missing from lib.webworker.d.ts's NotificationOptions even
  // though every browser supports it - cast to work around the stale typing.
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/192x192.png",
      badge: "/192x192.png",
      tag: data.tag,
      renotify: data.renotify ?? false,
    } as NotificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
