const CACHE_NAME = "xiao-shu-app-v21";
const ASSETS = [
  "/xiao-shu-app/",
  "/xiao-shu-app/index.html",
  "/xiao-shu-app/style.css?v=33",
  "/xiao-shu-app/app.js?v=38",
  "/xiao-shu-app/config.js?v=24",
  "/xiao-shu-app/xiaoshu-prompt.js?v=23",
  "/xiao-shu-app/manifest.json?v=1",
  "/xiao-shu-app/icon-192.png",
  "/xiao-shu-app/icon-512.png",
  "/xiao-shu-app/audio/hypnosis.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log("缓存部分资源失败", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // API 请求不缓存
  if (event.request.url.includes("deepseek.com") || event.request.url.includes("openai")) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/xiao-shu-app/index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
