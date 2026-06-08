const VERSION = "antokton-pwa-2026-06-08-1";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;
const API_CACHE = `${VERSION}-api`;
const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DISABLE_LOCAL_PREVIEW_SW = LOCAL_PREVIEW_HOSTS.has(self.location.hostname);

const CORE_ASSETS = [
  "/",
  "/Home",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/icons/antokton-192.png",
  "/icons/antokton-512.png",
  "/local-assets/0115b6553_Antoktontextiparemetexture.png",
  "/local-assets/122fac317_Antoktonfrontpage.jpg",
  "/local-assets/41f133055_ButonPuneneeurope.png",
  "/local-assets/57444094b_01.png",
  "/local-assets/6b6380869_ButonKomunitet.png",
  "/local-assets/7d831e8a1_Antoktontextiparemetextureperlightteme.png",
  "/local-assets/adac4aab2_01lightb.png",
  "/local-assets/b2ee5a682_01b.png",
  "/local-assets/cb9a35143_Antoktonteme9-16.png",
  "/local-assets/d206a2800_Antoktonteme9-17lightt.png",
  "/local-assets/d83d5accb_Antoktonteme9-17.png",
  "/local-assets/e3425bed5_ButonEdukim.png",
  "/local-assets/icons/6f2cf9c8b_Untitled-1.png",
  "/local-assets/icons/facebook.svg",
  "/local-assets/icons/instagram.png",
  "/local-assets/icons/link.svg",
  "/local-assets/icons/linkedin.svg",
  "/local-assets/icons/snapchat.svg",
  "/local-assets/icons/telegram.svg",
  "/local-assets/icons/tiktok.svg",
  "/local-assets/icons/whatsapp.svg",
  "/local-assets/icons/x.svg",
  "/local-assets/icons/youtube.svg"
];

const DEV_ONLY_PREFIXES = ["/@vite", "/src/", "/node_modules/"];
const CACHE_FIRST_PREFIXES = ["/assets/", "/icons/", "/local-assets/", "/uploads/"];

if (DISABLE_LOCAL_PREVIEW_SW) {
  self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(clearAntoktonCaches());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      clearAntoktonCaches()
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
        .then((clients) => {
          for (const client of clients) client.navigate(client.url);
        })
    );
  });
} else {
  self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

  self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
      caches.open(PRECACHE).then(async (cache) => {
        for (const url of CORE_ASSETS) {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch (error) {
            console.warn("Antokton PWA cache skipped", url, error);
          }
        }
      })
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("antokton-pwa-") && ![PRECACHE, RUNTIME, API_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      ).then(() => self.clients.claim())
    );
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (DEV_ONLY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

    if (request.mode === "navigate") {
      event.respondWith(networkFirst(request, PRECACHE, "/offline.html"));
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      event.respondWith(networkFirst(request, API_CACHE));
      return;
    }

    if (CACHE_FIRST_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || url.pathname === "/manifest.json") {
      event.respondWith(cacheFirst(request, RUNTIME));
    }
  });
}

async function clearAntoktonCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith("antokton-pwa-"))
      .map((key) => caches.delete(key))
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}
