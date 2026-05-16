export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const isLocalPreview = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  window.addEventListener("load", () => {
    if (isLocalPreview) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .then(async () => {
          if (!("caches" in window)) return;
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith("antokton-pwa-")).map((key) => caches.delete(key)));
        })
        .catch((error) => {
          console.warn("Antokton local service worker cleanup failed", error);
        });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn("Antokton service worker registration failed", error);
      });
  });
}
