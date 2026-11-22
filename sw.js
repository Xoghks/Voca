const CACHE_NAME = "lexicon-cache-v19";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests throw TypeError if passed to fetch(request, init);
  // fetch by URL string for navigations so fresh index.html is always retrieved.
  const isNavigate = event.request.mode === "navigate";
  const networkRequest = isNavigate
    ? fetch(event.request.url, { cache: "no-cache" })
    : fetch(event.request, { cache: "no-cache" });

  event.respondWith(
    networkRequest
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) =>
            cached || (isNavigate ? caches.match("./index.html") : undefined),
          ),
      ),
  );
});
