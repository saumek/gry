const CACHE_NAME = "duoplay-v3";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-maskable.svg",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/assets/bg-light.webp",
  "/assets/bg-dark.webp",
  "/assets/ornament-wave.svg",
  "/assets/ornament-mesh.svg",
  "/assets/icons/sun.svg",
  "/assets/icons/moon.svg",
  "/assets/icons/trophy.svg"
];

function isBypassedPath(pathname) {
  return pathname.startsWith("/_next/") || pathname.startsWith("/socket.io/");
}

function isStaticAsset(pathname) {
  return (
    APP_SHELL.includes(pathname) ||
    /\.(?:css|js|png|svg|webp|woff|woff2|ttf)$/i.test(pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || isBypassedPath(url.pathname)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          return cachedPage ?? caches.match("/");
        })
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        throw new Error("Network request failed.");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      const networkPromise = fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => undefined);

      if (cached) {
        networkPromise.catch(() => undefined);
        return cached;
      }

      const network = await networkPromise;
      return network ?? Response.error();
    })
  );
});
