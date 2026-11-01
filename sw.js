// ═══════════════ پیکربندی کش ═══════════════
const CACHE_VERSION = "chaybar-pwa-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./banner.webp",
  "./icon.svg",
  "./icon-maskable.svg",
  "./sobhane.webp",
  "./ghaza.webp",
  "./chashni.webp",
  "./nooshidani.webp"
];

// ═══════════════ نصب (بدون شکست اتمیک) ═══════════════
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) {
        return Promise.all(
          APP_SHELL.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn("Cache add failed:", url, err);
            });
          })
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// ═══════════════ فعال‌سازی ═══════════════
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_VERSION; })
              .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// ═══════════════ واکشی ═══════════════
self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  var isDataFile = url.pathname.indexOf("/data/") !== -1;

  // ═══════════════ فایل‌های داده (شبکه اول) ═══════════════
  if (isDataFile) {
    var cacheKey = url.origin + url.pathname;

    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            var copy = response.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(cacheKey, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match(cacheKey).then(function (cached) {
            return cached || new Response("", { status: 503 });
          });
        })
    );
    return;
  }

  // ═══════════════ سایر منابع (کش اول) ═══════════════
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request)
        .then(function (response) {
          if (response.ok) {
            var copy = response.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 503 });
        });
    })
  );
});
